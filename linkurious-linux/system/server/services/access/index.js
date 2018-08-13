/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-12-04.
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');
const basicAuth = require('basic-auth');

// services
const LKE = require('../index');
const Errors = LKE.getErrors();
const Application = LKE.getApplication();
const Config = LKE.getConfig();
const Db = LKE.getSqlDb();
const Utils = LKE.getUtils();
const Log = LKE.getLogger(__filename);
const UserDAO = LKE.getUserDAO();

// locals
const WrappedUserClass = require('./WrappedUser');
const AuthProviderWrapper = require('./provider/AuthProviderWrapper');
const SessionStore = require('./SessionStore');
const API = require('../webServer/api');
const UserCache = require('./UserCache');

/**
 * @dokapi access.groupmapping
 *
 * If an external source already organizes users in groups, it's possible to use this information to map automatically
 * external groups to Linkurious groups. To do so, you have to set the `access.externalUsersGroupMapping` configuration key
 * to be an object with the external group IDs as keys and the internal group IDs as values.
 *
 * For example, if we want to provide group mapping for Microsoft Active Directory:
 * ```json
 * { // under the access configuration key
 *   // ...
 *   "externalUsersGroupMapping": {
 *     "Administrators": 1 // any Active Directory admin is a Linkurious admin
 *   }
 *   // ...
 * }
 * ```
 *
 * For some identity providers the external group IDs is an actual name, for others is an ID:
 * - Azure AD uses the group ID, e.g. `"818b6e03-15dd-4e19-8cb1-a4f434b40a04"`
 * - LDAP uses the content of the field configured in `access.ldap.groupField`
 * - Microsoft Active Directory uses the group name, e.g. `"Administrators"`
 *
 * To exclude some groups of users from logging in into Linkurious, set up a list of
 * authorized groups in the configuration key `access.externalUsersAllowedGroups`.
 */

class AccessService {
  constructor() {
    /**@type {AuthProviderWrapper}*/
    this._oauth2Provider = new AuthProviderWrapper('OAuth2', 'oauth2', 'oauth2/index.js');

    /**@type {AuthProviderWrapper}*/
    this._saml2Provider = new AuthProviderWrapper('SAML2', 'saml2', 'saml2.js');

    if (this._oauth2Provider.enabled && this._saml2Provider.enabled) {
      throw Errors.business(
        'invalid_parameter',
        'OAuth2 and SAML2 can\'t be enabled at the same time.'
      );
    }

    this._ssoProvider = this._oauth2Provider.enabled ? this._oauth2Provider : this._saml2Provider;

    /**@type {AuthProviderWrapper[]}*/
    this._providers = [
      new AuthProviderWrapper(
        'LDAP', 'ldap', 'ldapAuth.js'
      ),
      new AuthProviderWrapper(
        'Microsoft Active Directory', 'msActiveDirectory', 'msActiveDirectoryAuth.js'
      ),
      this._oauth2Provider,
      this._saml2Provider
    ];

    /**@type {SessionStore}*/
    this._sessionStore = new SessionStore(Config.get('access.floatingLicenses', 0));

    this._externalUsersGroupMapping = Config.get('access.externalUsersGroupMapping', {});

    UserCache.init();
  }

  /**
   * @type {AuthProviderWrapper[]}
   */
  get providers() {
    return this._providers;
  }

  /**
   * @type {SessionStore}
   */
  get sessionStore() {
    return this._sessionStore;
  }

  /**
   * If `req.session.userId` is defined, populate `req.user`.
   *
   * @param {IncomingMessage} req
   * @returns {Bluebird<void>}
   * @private
   */
  _populateReqUser(req) {
    const authRequired = Config.get('access.authRequired') && LKE.isEnterprise();
    const guestModeAllowed = Config.get('access.guestMode');
    let userIdToRetrieve = req.session.userId;

    if (!authRequired) {
      // use the unique user when authRequired is false
      userIdToRetrieve = UserDAO.model.UNIQUE_USER_ID;
    }

    if (req.query.guest === 'true') {
      if (!guestModeAllowed) {
        return Errors.access('guest_disabled', undefined, true);
      }
      userIdToRetrieve = UserDAO.model.GUEST_USER_ID;
    }

    if (Utils.noValue(userIdToRetrieve)) {
      return Promise.resolve();
    }

    return UserCache.getUser(userIdToRetrieve).then(user => {
      req.user = user;
    });
  }

  /**
   * Express middleware responsible to set `req.user` and to check floating license errors.
   *
   * @param {IncomingMessage} req
   * @param {OutgoingMessage} res
   * @param {function} next
   */
  checkUserSession(req, res, next) {
    if (Utils.noValue(req.session.error)) {
      // req.session.error won't be set if req.session.userId is not set
      this._populateReqUser(req).then(() => {
        next();
      }).catch(error => {
        API.respondToLkError(res, error);
      });
    } else {
      const sessionError = req.session.error;
      req.session.destroy(() => {
        let error;
        switch (sessionError) {
          case SessionStore.Errors.FLOATING_EXPIRED:
            error = Errors.access('session_expired');
            break;
          case SessionStore.Errors.FLOATING_KICKED:
            error = Errors.access('session_evicted');
            break;
          case SessionStore.Errors.FLOATING_FULL:
            error = Errors.access('server_full');
            break;
          default:
            error = Errors.access('unauthorized', `Session error: "${sessionError}"`);
        }

        API.respondToLkError(res, error);
      });
    }
  }

  /**
   * Express middleware responsible to set `req.application`.
   *
   * @param {IncomingMessage} req
   * @param {OutgoingMessage} res
   * @param {function} next
   */
  checkApplication(req, res, next) {
    /**@type{{name: string, pass: string}}*/
    const credentials = basicAuth(req);

    // no basic auth, bypass this step
    if (!credentials) {
      next();
      return;
    }

    return Application.checkApplication(
      credentials.name,
      credentials.pass
    ).then(userAndApp => {
      // the user which the app can act on behalf of
      req.user = userAndApp.user;
      // the public app itself
      req.application = userAndApp.application;
      next();
    }).catch(error => {
      API.respondToLkError(res, error);
    });
  }

  /**
   * @param {string} usernameOrEmail
   * @param {string} password
   * @returns {Bluebird<ExternalUserProfile> | null} `null` if no external provider is enabled
   * @private
   */
  _getProviderAuthPromise(usernameOrEmail, password) {
    for (const provider of this.providers) {
      if (provider.enabled) {
        return provider.authenticate(usernameOrEmail, password);
      }
    }
    return null;
  }

  /**
   * Use the group mapping to retrieve the desired `internalGroupIds` from the `externalGroupIds`.
   * Each external group id can produce 1 or 0 internal group ids.
   *
   * @param {Array<string | number>} externalGroupIds
   * @returns {number[]} internalGroupIds
   * @private
   */
  _externalGroupsToInternalGroups(externalGroupIds) {
    let internalGroupIds = [];

    _.forEach(externalGroupIds, externalGroupId => {
      const mappedValue = this._externalUsersGroupMapping[externalGroupId];
      if (Utils.noValue(mappedValue)) {
        return;
      }

      const newInternalGroupIds = Array.isArray(mappedValue) ? mappedValue : [mappedValue];
      internalGroupIds = internalGroupIds.concat(newInternalGroupIds);
    });

    return internalGroupIds;
  }

  /**
   * Given an external user profile, check if a user with the same email exists in the user database.
   * - If such user exists, but with source=local, the user is migrated (the source is updated to `source`)
   * - If a shadow user already exists, it is returned
   * - Otherwise, a shadow user is created.
   *
   * Shadow user: A user profile in the local database that represents an external user.
   * No password is stored for shadow users, since the authentication is done by the external provider.
   * Username/email of shadow users cannot be edited since they are a cache of the profile stored by the external provider.
   *
   * @param {ExternalUserProfile} profile
   * @param {string} source ("oauth" for OAuth2 or SAML2, "ldap" for LDAP or AD)
   * @returns {Bluebird<PublicUser>}
   * @private
   */
  _getOrCreateShadowExternalUser(profile, source) {
    const externalUsersAllowedGroups = Config.get('access.externalUsersAllowedGroups');

    // if only some groups are allowed but none of the current user
    if (Utils.hasValue(externalUsersAllowedGroups) &&
      _.intersection(externalUsersAllowedGroups, profile.externalGroupIds).length === 0) {
      Log.debug('auth(' + profile.username + '): source:' + source + ', group:NOK');

      return Errors.access('unauthorized',
        'The user doesn\'t belong to any authorized group.', true);
    }

    let desiredGroupIds = null;

    if (profile.externalGroupIds) {
      desiredGroupIds = this._externalGroupsToInternalGroups(profile.externalGroupIds);
    }

    return UserDAO.getUserInstanceByEmail(profile.email, true).then(user => {
      if (user) {
        Log.debug('auth(' + profile.username + '): source:' + source + ', in-db');

        return Promise.resolve().then(() => {
          // if the user source is different, we migrate the user from 'local' to `source`
          if (user.source !== source) {
            user.username = profile.username;
            user.source = source;
            Log.debug('auth(' + profile.username + '): source:' + source + ', migrating-source');
            return user.save();
          }
        }).then(() => {
          return UserDAO.formatToPublicUser(user);
        });
      }
      // if the user was not found, we create the user
      Log.debug('auth(' + profile.username + '): source:' + source + ', creating');
      return UserDAO.createUser(profile.username, profile.email, null, desiredGroupIds, source);
    });
  }

  /**
   * @param {string} usernameOrEmail Username or email of the user
   * @param {string} password        Password of the user
   * @returns {Bluebird<PublicUser>}
   * @private
   */
  _authenticate(usernameOrEmail, password) {
    return Promise.resolve().then(() => {
      // strategy 1: try to authenticate with external providers
      const externalUserPromise = this._getProviderAuthPromise(usernameOrEmail, password);
      if (externalUserPromise) {
        return externalUserPromise.then(externalUserProfile => {
          if (!externalUserProfile) {
            // user not found or wrong credentials for LDAP/AD user (will try next strategy)
            Log.debug('auth(' + usernameOrEmail + '): source:external, pass:NOK');
            return;
          }

          return this._getOrCreateShadowExternalUser(externalUserProfile, 'ldap');
        });
      }
    }).then(user => {
      if (Utils.hasValue(user)) {
        // user was authenticated with an external provider
        return user;
      }

      // strategy 2: look for user in local DB
      return UserDAO.getLocalUserByUsernameAndPassword(usernameOrEmail, password).then(dbUser => {
        if (dbUser && dbUser.id === UserDAO.model.UNIQUE_USER_ID) {
          return Errors.access(
            'unauthorized', 'This user cannot be used when authentication is enabled.', true
          );
        }

        if (dbUser && dbUser.id === UserDAO.model.GUEST_USER_ID) {
          return Errors.access(
            'unauthorized', 'This user cannot be used to log in.', true
          );
        }

        // found user in DB, a local user, password matched
        if (!dbUser) {
          return Errors.access('unauthorized', 'Incorrect username/email or password.', true);
        }

        Log.debug('auth(' + usernameOrEmail + '): source:local, pass:ok');
        return Promise.resolve(dbUser);
      });
    });
  }

  /**
   * Save the ID of the user in the session.
   *
   * @param {IncomingMessage} req  The current HTTP request
   * @param {PublicUser}      user Public user populated with actions
   * @returns {Bluebird<PublicUser>}
   * @private
   */
  _saveUserSession(req, user) {
    return new Promise((resolve, reject) => {
      req.session.userId = user.id;

      // We also save in the session if the user is admin
      // This is needed to kick out other users if floating licenses are on
      _.forEach(user.groups, group => {
        if (group.builtin && group.name === Db.models.group.ADMIN_GROUP_NAME) {
          req.session.admin = true;
        }
      });

      req.session.save(err => {
        if (err) {
          reject(err);
        } else {
          resolve(user);
        }
      });
    });
  }

  /**
   * Authenticate a user.
   *
   * @param {string}          usernameOrEmail Username or email of the user
   * @param {string}          password        Password of the user
   * @param {IncomingMessage} req             The current HTTP request
   * @returns {Bluebird<PublicUser>}
   */
  login(usernameOrEmail, password, req) {
    if (Utils.noValue(usernameOrEmail) || Utils.noValue(password)) {
      throw Errors.business('missing_field', 'Username and password are required.');
    }

    return this._authenticate(usernameOrEmail, password).then(user => {
      if (!user) {
        return Errors.access('unauthorized', null, true);
      }

      return this._saveUserSession(req, user);
    }).catch(err => {
      if (err instanceof Errors.LkError) {
        throw err;
      }

      Log.error(err);
      return Errors.technical('critical', err, true);
    });
  }

  /**
   * Return the URL of the OAuth2 authorization endpoint.
   *
   * @param {IncomingMessage} req The current HTTP request (required to access the session)
   * @returns {Bluebird<string>} authenticateURL
   */
  getAuthenticateURLSSO(req) {
    if (!this._ssoProvider.enabled) {
      return Errors.access('feature_disabled',
        'No Single Sign-On authentication service is enabled.', true);
    }

    const state = Utils.randomHex(30);
    const isHttps = Utils.isRequestHTTPS(req);
    const requestBaseUrl = (isHttps ? 'https' : 'http') + '://' + req.headers.host;

    return new Promise((resolve, reject) => {
      // Needed to make the session live in our session store
      req.session.twoStageAuth = true;
      req.session.state = state;
      req.session.save(err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }).then(() => {
      return this._ssoProvider.getAuthenticateURLSSO(state, requestBaseUrl);
    });
  }

  /**
   * Authenticate the user via OAuth2/SAML2.
   *
   * @param {string}          code    Response code from OAuth2/SAML2 server
   * @param {string}          [state] Handshake state from OAuth2 server
   * @param {IncomingMessage} req     The current HTTP request (required to access the session)
   * @returns {Bluebird<void>}
   */
  handleAuthenticateURLResponseSSO(code, state, req) {
    if (!this._ssoProvider.enabled) {
      return Errors.access('feature_disabled',
        'No Single Sign-On authentication service is enabled.', true);
    }

    Utils.check.exist('code', code);

    // check the state only in OAuth2
    if (this._oauth2Provider.enabled) {
      if (state !== req.session.state) {
        if (Utils.noValue(req.session.state)) {
          Log.warn(
            'Session state is undefined in OAuth2 response, ' +
            'redirect domain might not match actual domain.'
          );
        }
        return Errors.access('unauthorized', 'The OAuth2 response state did not match.', true);
      }
    }

    const isHttps = Utils.isRequestHTTPS(req);
    const requestBaseUrl = (isHttps ? 'https' : 'http') + '://' + req.headers.host;

    return this._ssoProvider.handleAuthenticateURLResponseSSO(
      code, requestBaseUrl
    ).then(profile => {
      return this._getOrCreateShadowExternalUser(profile, 'oauth');
    }).then(user => {
      return this._saveUserSession(req, user);
    }).return();
  }

  /**
   * Log the current user out of Linkurious.
   *
   * @param {IncomingMessage} req The current HTTP request
   * @returns {Bluebird<void>}
   */
  logout(req) {
    return new Promise((resolve, reject) => {
      req.session.destroy(err => {
        if (err) {
          reject(err);
        } else {
          // if no user was logged id
          if (Utils.noValue(req.user)) {
            return reject(Errors.access('unauthorized'));
          }

          resolve();
        }
      });
    });
  }

  /**
   * Return a resolved promise if the user can manage users on at least one data-source or
   * on a particular data-source if `sourceKey` is defined.
   *
   * @param {IncomingMessage} req
   * @param {string}          [sourceKey]
   * @returns {Bluebird<void>}
   */
  canManageUsers(req, sourceKey) {
    return this.getCurrentWrappedUser(req).canManageUsers(sourceKey);
  }

  /**
   * Return the current user.
   *
   * @param {IncomingMessage} req                The current HTTP request
   * @param {boolean}         [throwIfNone=true] By default, it will throw an exception if no current user
   * @throws {LkError} if no current user and `throwIfNone` is true
   * @returns {PublicUser} Public user with actions, groups and access rights (with wildcards not expanded)
   */
  getCurrentUser(req, throwIfNone) {
    if (!req.user && throwIfNone !== false) {
      throw Errors.access('unauthorized');
    }

    return req.user;
  }

  /**
   * @param {IncomingMessage} req                The current HTTP request
   * @param {boolean}         [throwIfNone=true] By default, it will throw an exception if no current user
   * @returns {WrappedUser} Wrapped user with actions, groups and access rights (with wildcards not expanded)
   */
  getCurrentWrappedUser(req, throwIfNone) {
    if (req.wrappedUser) {
      return req.wrappedUser;
    }

    if (!req.user && throwIfNone !== false) {
      throw Errors.access('unauthorized');
    }

    if (req.user) {
      req.wrappedUser = new WrappedUserClass(req.user);
    }

    return req.wrappedUser;
  }

  /**
   * Check if the application has the right perform the action.
   *
   * @param {PublicApplication} application
   * @param {string}            [actionKey]
   * @throws {LkError} if `actionKey` is not allowed
   * @private
   */
  _checkAppAction(application, actionKey) {
    if (actionKey !== undefined) {
      // check that the action is valid
      Utils.check.values('actionKey', actionKey, Db.models.application.APP_ACTIONS, true);
    }

    // action is allowed for the app
    const allowed = application.rights.includes(actionKey);
    if (allowed) {
      return;
    }

    // action is not allowed for the app
    throw Errors.access(
      'forbidden',
      'Application "' + application.name +
      '" (#' + application.id + ') is not allowed to do action "' + actionKey + '".'
    );
  }

  /**
   * Get the current user wrapped:
   *  - check for application rights (if the user is an app).
   *  - check for guest mode (if the user is the guest user).
   *
   * @param {IncomingMessage} req                The current HTTP request
   * @param {string}          [intendedAction]   An application right
   * @param {boolean}         [guestModeAllowed] Whether the guest user can be returned
   * @throws {LkError} if req.application is defined and intendedAction is not allowed
   * @returns {WrappedUser}
   */
  getUserCheck(req, intendedAction, guestModeAllowed) {
    // if we are an application
    if (Utils.hasValue(req.application)) {
      // if the intended action is not defined, it means for sure it can't be performed by an app
      if (Utils.noValue(intendedAction)) {
        throw Errors.access(
          'forbidden',
          'Application "' + req.application.name +
          '" (#' + req.application.id + ') does not have access to this feature.'
        );
      }

      // we check if we have the right to do the intended action
      this._checkAppAction(req.application, intendedAction);
    }

    const currentWrappedUser = this.getCurrentWrappedUser(req);

    if (!guestModeAllowed && currentWrappedUser.id === UserDAO.model.GUEST_USER_ID) {
      throw Errors.access(
        'forbidden',
        'A guest user does not have access to this feature.'
      );
    }

    return currentWrappedUser;
  }

  /**
   * Perform startup checks for all enabled auth providers.
   *
   * @returns {Bluebird<void>}
   */
  providersStartupCheck() {
    return Promise.each(this.providers, provider => {
      return provider.startupCheck().catch(e => {
        Log.error(e);
        throw e;
      });
    }).return();
  }

  /**
   * Check that there is an authenticated user.
   * Return a rejected promise if no current user and `throwIfNone` is true.
   *
   * @param {IncomingMessage} req               The current HTTP request
   * @param {boolean}         [throwIfNot=true] Whether to reject if not authenticated
   * @returns {Bluebird<boolean>}
   */
  isAuthenticated(req, throwIfNot) {
    return Promise.resolve().then(() => {
      return !!this.getCurrentUser(req, throwIfNot);
    });
  }

  /**
   * Check if the given action (by action name) is doable by the current user.
   * If sourceKey is undefined it means *any* sourceKey. To not confuse with *all* sourceKey.
   *
   * @param {IncomingMessage} req          The current HTTP request
   * @param {string}          actionName   Name of the action
   * @param {string}          [sourceKey]  Key of the data-source
   * @param {boolean}         [throwIfNot=true] Whether to reject if the condition is not met
   * @returns {Bluebird<boolean>}
   */
  hasAction(req, actionName, sourceKey, throwIfNot) {
    if (actionName.startsWith('admin') && Utils.hasValue(req.application)) {
      return Errors.access(
        'admin_required', 'Applications cannot perform administrator actions.', true);
    }

    const wrappedUser = this.getCurrentWrappedUser(req, throwIfNot);

    if (!wrappedUser) {
      return Promise.resolve(false);
    }

    return wrappedUser.hasAction(actionName, sourceKey, throwIfNot);
  }

  /**
   * Check that the currently authenticated user is an admin.
   * Return a rejected promise if not an admin and `throwIfNot` is true.
   *
   * @param {IncomingMessage} req               The current HTTP request
   * @param {boolean}         [throwIfNot=true] Whether to throw an error if the current user is not admin
   * @returns {Bluebird<boolean>}
   */
  isAdmin(req, throwIfNot) {
    const wrappedUser = this.getCurrentWrappedUser(req, throwIfNot);
    const isAdmin = !!wrappedUser && wrappedUser.isAdmin();

    if (!isAdmin && throwIfNot !== false) {
      return Errors.access('admin_required', null, true);
    }

    if (Utils.hasValue(req.application)) {
      return Errors.access(
        'admin_required', 'Applications cannot perform administrator actions.', true
      );
    }
    return Promise.resolve(isAdmin);
  }

  /**
   * Check that builtin groups exists for every existing data-source.
   * Create them if they don't exist.
   *
   * @returns {Bluebird<void>}
   */
  ensureBuiltinGroups() {
    return Db.models.dataSourceState.findAll({attributes: ['key']}).map(dataSourceStateInstance => {
      return Db.models.group.ensureBuiltins(dataSourceStateInstance.key);
    }, {concurrency: 1}).return();
  }

  /**
   * @returns {Bluebird<void>}
   * @private
   */
  _migrateDefaultGroup() {
    // 1) retrieve the default group
    return Db.models.group.findAllByName('default', true).then(defaultGroups => {
      const defaultGroup = defaultGroups[0]; // unwrap it, there is only one
      if (Utils.noValue(defaultGroup)) {
        return; // migration already took place in the past
      }

      /**@type {UserInstance[]}*/
      let defaultUsers;
      /**@type {UserInstance[]}*/
      let adminUsers;

      // 2) look for all the users belonging to the deprecated default group
      return Db.models.user.findAll({
        include: [{
          model: Db.models.group, where: {id: defaultGroup.id}
        }]}).then(_defaultUsers => {
        defaultUsers = _defaultUsers;

        return Db.models.user.findAll({
          include: [{
            model: Db.models.group, where: {id: Db.models.group.ADMIN_GROUP.id}
          }]});
      }).then(_adminUsers => {
        adminUsers = _adminUsers;

        // 3) retrieve all the builtin "read" groups
        return Db.models.group.findAllByName('read', true);
      }).then(readGroups => {
        // 4) to any group in readGroups assign all the users in defaultUsers not in the admin group
        const readUsers = _.differenceBy(defaultUsers, adminUsers, 'id');

        return Promise.map(readGroups, group => {
          return group.addUsers(readUsers);
        }, {concurrency: 1});
      }).then(() => {
        // 5) remove all the users from the defaultGroup
        return defaultGroup.removeUsers(defaultUsers);
      }).then(() => {
        // 6) delete the default group
        return defaultGroup.destroy();
      });
    });
  }

  /**
   * @param {GroupInstance} legacyGroup Group instance with access rights
   * @returns {Bluebird<void>}
   * @private
   */
  _migrateLegacyGroup(legacyGroup) {
    const usersWithLegacyGroupQuery = {
      include: [{
        model: Db.models.group, where: {id: legacyGroup.id}
      }]
    };

    const rightsWithLegacyGroupQuery = {
      where: {groupId: legacyGroup.id}
    };

    /**@type {UserInstance[]}*/
    let legacyUsers;

    // 1) retrieve all the users belonging to this legacy group
    return Db.models.user.findAll(usersWithLegacyGroupQuery).then(_legacyUsers => {
      legacyUsers = _legacyUsers;

      // 2) retrieve all the data-source keys
      return Db.models.dataSourceState.findAll();
    }).map(dataSourceStateInstance => {
      // 3) create a group with the same name in every data-source
      return Db.models.group.create({
        sourceKey: dataSourceStateInstance.key,
        name: legacyGroup.name,
        builtin: false
      }).then(groupInstance => {
        // 4) filter the access rights of the legacy group by sourceKey and turn them in AccessRightAttributes
        /**@type {AccessRightAttributes[]}*/
        const accessRights = _.map(_.filter(legacyGroup.accessRights,
          accessRight => accessRight.sourceKey === groupInstance.sourceKey
        ), accessRightInstance => {
          return Db.models.accessRight.instanceToPublicAttributes(accessRightInstance, true);
        });

        // 5) create and assign the new access rights to the new group
        return Promise.map(accessRights, accessRight => {
          return Db.models.accessRight.create(accessRight).then(rightInstance => {
            return groupInstance.addAccessRight(rightInstance);
          });
        }, {concurrency: 1}).then(() => {
          // 6) add the new group to any user of the legacy group
          return groupInstance.addUsers(legacyUsers);
        });
      });
    }, {concurrency: 1}).then(() => {
      // 7) delete all the access rights of the legacy group
      return Db.models.accessRight.destroy(rightsWithLegacyGroupQuery);
    }).then(() => {
      // 8) remove all the users from the legacy group
      return legacyGroup.removeUsers(legacyUsers);
    }).then(() => {
      // 9) delete the legacy group
      return legacyGroup.destroy();
    });
  }

  /**
   * Legacy groups were groups with sourceKey set to *.
   * This was prior than introducing the builtin groups "read", "read and edit" and so on.
   * Originally every user not belonging to a group belonged to a group called "default".
   *
   * With the release of LKE v2 we migrate all the legacy groups to new groups.
   * - Every user belonging to the "default" group will belong to any "read" builtin group of
   * every data-source.
   * - Every user belonging to a legacy "custom" group will belong to a copy of that custom group
   * specific for the data-source.
   *
   * @returns {Bluebird<void>}
   * @backward-compatibility
   */
  migrateLegacyGroups() {
    // 1) migrate the default group
    return this._migrateDefaultGroup().then(() => {
      // 2) migrate any other legacy group
      const legacyGroupQuery = {
        where: {sourceKey: '*', builtin: false},
        include: [Db.models.accessRight]
      };

      return Db.models.group.findAll(legacyGroupQuery).map(legacyGroup => {
        return this._migrateLegacyGroup(legacyGroup);
      }, {concurrency: 1});
    }).return();
  }
}

module.exports = new AccessService();
