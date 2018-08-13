/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-12-05.
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../index');
const Db = LKE.getSqlDb();
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const Config = LKE.getConfig();
const GroupDAO = LKE.getGroupDAO();

// locals
const UserCache = require('./UserCache');

const MIN_PASSWORD_LENGTH = 3;

class UserDAO {
  /**
   * @type {UserModel}
   */
  get model() {
    return Db.models.user;
  }

  /**
   * @param {SequelizeFindOptions<any>} findOptions
   * @param {boolean}                   [withGroups]
   * @returns {Bluebird<UserInstance | null>}
   * @private
   */
  _getUserByFindOptions(findOptions, withGroups) {
    if (withGroups) {
      findOptions.include = [{model: Db.models.group, include: [Db.models.accessRight]}];
    }

    return this.model.findOne(findOptions);
  }

  /**
   * Return a user instance matching the username or the email.
   *
   * @param {string}  usernameOrEmail Username or email of the user
   * @param {boolean} [withGroups]    Whether to include groups and access rights
   * @returns {Bluebird<UserInstance | null>}
   * @private
   */
  _getUserInstanceByUsernameOrEmail(usernameOrEmail, withGroups) {
    const findOptions = {
      where: {
        $or: [
          {
            email: {
              $like: usernameOrEmail
            }
          },
          {
            username: {
              $like: usernameOrEmail
            }
          }
        ]
      }
    };

    return this._getUserByFindOptions(findOptions, withGroups);
  }

  /**
   * Return a user instance matching the username.
   *
   * @param {string}  username     Username of the user
   * @param {boolean} [withGroups] Whether to include groups and access rights
   * @returns {Bluebird<UserInstance | null>}
   * @private
   */
  _getUserInstanceByUsername(username, withGroups) {
    const findOptions = {
      where: {
        username: {
          $like: username
        }
      }
    };

    return this._getUserByFindOptions(findOptions, withGroups);
  }

  /**
   * Return a user instance matching the email.
   *
   * @param {string}  email        Email of the user
   * @param {boolean} [withGroups] Whether to include groups and access rights
   * @returns {Bluebird<UserInstance | null>}
   */
  getUserInstanceByEmail(email, withGroups) {
    const findOptions = {
      where: {
        email: {
          $like: email
        }
      }
    };

    return this._getUserByFindOptions(findOptions, withGroups);
  }

  /**
   * Return a user instance by id. Return a rejected promise if the user wasn't found.
   *
   * @param {number}  userId
   * @param {boolean} [withGroups] Whether to include groups and access rights
   * @returns {Bluebird<UserInstance>}
   * @private
   */
  _getUserInstance(userId, withGroups) {
    const findOptions = {where: {id: userId}};

    if (withGroups) {
      findOptions.include = [{model: Db.models.group, include: [Db.models.accessRight]}];
    }

    return this.model.findOne(findOptions).then(user => {
      if (!user) {
        return Errors.business('user_not_found', 'Could not find user #' + userId + '.', true);
      }
      return user;
    });
  }

  /**
   * Given two Set<string> in input, return a compact representation:
   * - if something is writable is implicitly editable
   * - `*` means any string
   *
   * @param {object} rights
   * @returns {{edit: string[], write: string[]}}
   * @private
   */
  _compactUserAccessRights(rights) {
    let edit = rights.edit.has('*') ? ['*'] : Array.from(rights.edit);
    const write = rights.write.has('*') ? ['*'] : Array.from(rights.write);

    edit = _.difference(edit, write);

    return {
      edit: edit,
      write: write
    };
  }

  /**
   * Return `actions` and `accessRights` of a user given its `groups` populated with access rights.
   *
   * @param {PublicGroup[]} [groups]
   * @returns {{actions: object, accessRights: object}}
   * @private
   */
  _getUserActionsAndAccessRights(groups) {
    // Populate user.actions and user.accessRights. Initially as values we use Set<string> then we turn them into string[]
    /**@type {object}*/
    let actions = {'*': new Set()};
    const accessRights = {
      '*': {
        nodes: {edit: new Set(), write: new Set()},
        edges: {edit: new Set(), write: new Set()},
        alerts: {read: new Set()}
      }
    };
    _.forEach(groups, group => {
      const sourceKey = group.sourceKey;

      if (Utils.noValue(actions[sourceKey])) {
        actions[sourceKey] = new Set();
        accessRights[sourceKey] = {
          nodes: {edit: new Set(), write: new Set()},
          edges: {edit: new Set(), write: new Set()},
          alerts: {read: new Set()}
        };
      }

      _.forEach(group.accessRights, accessRight => {
        if (accessRight.targetType === 'action' && accessRight.type === 'do') {
          actions[sourceKey].add(accessRight.targetName);
        } else if (['edit', 'write'].includes(accessRight.type)) {
          if (accessRight.targetType === 'nodeCategory') {
            accessRights[sourceKey].nodes[accessRight.type].add(accessRight.targetName);
          } else if (accessRight.targetType === 'edgeType') {
            accessRights[sourceKey].edges[accessRight.type].add(accessRight.targetName);
          }
        } else if (accessRight.type === 'read' && accessRight.targetType === 'alert') {
          accessRights[sourceKey].alerts.read.add(accessRight.targetName);
        }
      });
    });

    // we convert the Set<string> to string[]
    actions = _.mapValues(actions, s => Array.from(s));

    // for user.accessRights, we want a compact response (if something is writable is implicitly editable)
    _.forOwn(accessRights, (rights, sourceKey) => {
      accessRights[sourceKey] = {
        nodes: this._compactUserAccessRights(rights.nodes),
        edges: this._compactUserAccessRights(rights.edges),
        alerts: {read: rights.alerts.read.has('*') ? ['*'] : Array.from(rights.alerts.read)}
      };
    });

    return {actions: actions, accessRights: accessRights};
  }

  /**
   * In this function we do the following:
   * - we turn the userInstance into user public attributes
   * - if `userInstance.groups` is populated, format the groupInstances to public groups (without access rights)
   * - if `userInstance.groups[].accessRights` is populated, populate `actions` in the response
   *
   * A public user returned via the API doesn't have the access rights populated for the group.
   * However, we use the public user also to cache the user in the session server side.
   * In that case we populate the access rights but we don't expand them.
   *
   * @param {UserInstance} userInstance       User instance
   * @param {boolean}      [withVisCount]     Whether to populate the visCount
   * @param {boolean}      [withAccessRights] Whether to populate the access rights on groups (not expanded)
   * @returns {Bluebird<PublicUser>}
   */
  formatToPublicUser(userInstance, withVisCount, withAccessRights) {
    const user = /**@type {PublicUser}*/ (
      this.model.instanceToPublicAttributes(userInstance, true)
    ); // user is a PublicUser only after user.actions is defined

    if (userInstance.id === this.model.GUEST_USER_ID) {
      // populate guest user preferences
      user.preferences = Config.get('guestPreferences');
    } else {
      // populate default user preferences
      user.preferences = _.defaults(user.preferences, Config.get('defaultPreferences'));
    }

    return Promise.resolve().then(() => {
      if (Utils.noValue(userInstance.groups)) {
        return;
      }

      return Promise.map(userInstance.groups, group => {
        // if `withAccessRights` is true, we want the access rights but not expanded
        return GroupDAO.formatToPublicGroup(
          group, {
            withAccessRights: true,
            expandRights: false
          });
      }).then(publicGroups => {
        user.groups = publicGroups;
      });
    }).then(() => {
      if (!withVisCount) {
        return;
      }

      return Db.models.visualization.count(
        {where: {userId: userInstance.id, sandbox: false}}
      ).then(_visCount => {
        user.visCount = _visCount;
        return user;
      });
    }).then(() => {
      const actionsAndAccessRights = this._getUserActionsAndAccessRights(user.groups);

      user.actions = actionsAndAccessRights.actions;
      user.accessRights = actionsAndAccessRights.accessRights;

      // we filter the access rights if unwanted
      if (Utils.hasValue(user.groups) && !withAccessRights) {
        user.groups.forEach(group => {
          delete group.accessRights;
        });
      }
    }).return(user);
  }

  /**
   * Return a public user by id. Return a rejected promise if the user wasn't found.
   *
   * @param {number}  userId
   * @param {boolean} [withAccessRights] Whether to populate the access rights on groups
   * @returns {Bluebird<PublicUser>} Public user with groups and actions
   */
  getUser(userId, withAccessRights) {
    return this._getUserInstance(userId, true).then(user => {
      return this.formatToPublicUser(user, false, withAccessRights);
    });
  }

  /**
   * Return a public user matching the email.
   * Return a rejected promise if the user wasn't found.
   *
   * @param {string}  email              Email of the user
   * @param {boolean} [withAccessRights] Whether to populate the access rights on groups
   * @returns {Bluebird<PublicUser>} Public user with groups and actions
   */
  getUserByEmail(email, withAccessRights) {
    return this.getUserInstanceByEmail(email, true).then(user => {
      if (!user) {
        return Errors.business('user_not_found',
          'Could not find user with email: "' + email, true);
      }

      return this.formatToPublicUser(user, false, withAccessRights);
    });
  }

  /**
   * Find a "source=local" user in the database by username or email and check the password.
   * - If the user is not found, return a promise of 'null'.
   * - If the user is found but the passwords don't match, return a rejected promise of an LkError.
   * - If the user is found and the password matches, return a promise of the user.
   *
   * @param {string} usernameOrEmail Username or email of the user
   * @param {string} password        Password of a user
   * @returns {Bluebird<PublicUser>} Public user with groups and actions
   */
  getLocalUserByUsernameAndPassword(usernameOrEmail, password) {
    return this._getUserInstanceByUsernameOrEmail(usernameOrEmail, true).then(user => {
      // no user found, just return null
      if (!user || user.source !== 'local') {
        return null;
      }

      // found a local user, check password
      if (user.comparePassword(password)) {
        return this.formatToPublicUser(user);
      }

      return Errors.access('unauthorized', 'Incorrect username/email or password.', true);
    });
  }

  /**
   * Find users by username, email and groupId.
   * Never return the unique user.
   *
   * @param {object} [options]
   * @param {string} [options.startsWith]    Return only users which username or e-mail starts with this
   * @param {string} [options.contains]      Return only users which username or e-mail contains this
   * @param {number} [options.groupId]       Return only users belongings to this group
   * @param {number} [options.offset]        Offset from the first result
   * @param {number} [options.limit]         Page size (maximum number of returned users)
   * @param {string} [options.sortBy]        Sort by id, username, e-mail
   * @param {string} [options.sortDirection] Direction used to sort the users
   * @returns {Bluebird<{found: number, results: PublicUser[]}>}
   */
  findUsers(options) {
    if (Utils.noValue(options)) {
      options = {};
    }

    if (Utils.noValue(options.offset)) {
      options.offset = 0;
    } else {
      Utils.check.posInt('offset', options.offset);
    }

    if (Utils.noValue(options.limit)) {
      options.limit = 10;
    } else {
      Utils.check.integer('limit', options.limit, 1);
    }

    if (Utils.noValue(options.sortBy)) {
      options.sortBy = 'id';
    } else {
      Utils.check.values('sort_by', options.sortBy, ['id', 'username', 'email']);
    }

    if (Utils.noValue(options.sortDirection)) {
      options.sortDirection = 'asc';
    } else {
      Utils.check.values('sort_direction', options.sortDirection, ['asc', 'desc']);
    }

    if (Utils.hasValue(options.startsWith) && Utils.hasValue(options.contains)) {
      return Errors.business('conflict_parameter',
        '"options.starts_with" and "options.contains" can\'t be specified at the same time.', true);
    }

    let orderOptions;
    if (options.sortBy === 'id') {
      orderOptions = [['id', options.sortDirection]];
    } else {
      orderOptions = [[options.sortBy, options.sortDirection], ['id', 'desc']];
    }

    let sqlMatcher;
    if (Utils.hasValue(options.startsWith)) {
      // fix for sql injection
      options.startsWith = options.startsWith.replace(/[^A-Za-z0-9 @_\-.]/g, '');
      sqlMatcher = `${options.startsWith}%`;
    }

    if (Utils.hasValue(options.contains)) {
      options.contains = options.contains.replace(/[^A-Za-z0-9 @_\-.]/g, '');
      sqlMatcher = `%${options.contains}%`;
    }
    sqlMatcher = Utils.hasValue(sqlMatcher) ? sqlMatcher : '%';

    // we never want to return the unique user
    const omittedUserIds = [this.model.UNIQUE_USER_ID];

    if (!Config.get('access.guestMode')) {
      // and we don't want to return the guest user if guest mode is not enabled
      omittedUserIds.push(this.model.GUEST_USER_ID);
    }

    const query = {
      where: {
        id: {'$notIn': omittedUserIds},
        '$or': [
          ['username like ?', sqlMatcher],
          ['email like ?', sqlMatcher]
        ]
      },
      order: orderOptions,
      include: [{model: Db.models.group, include: [Db.models.accessRight]}],
      distinct: true
    };

    if (Utils.hasValue(options.groupId)) {
      // if groupId is defined, only return users in that particular group
      Utils.check.posInt('options.groupId', options.groupId);
      query.include[0].where = {id: options.groupId};
      query.include[0].duplicating = false;
    }

    // 1) Count the number of total matching users
    let totalFoundUsers = 0;
    return Db.models.user.count(query).then(_totalFoundUsers => {
      totalFoundUsers = _totalFoundUsers;

      // https://github.com/sequelize/sequelize/issues/3007
      // TODO in Sequelize pagination with include doesn't work
      //
      // query.offset = options.offset;
      // query.limit = options.limit;
      return Db.models.user.findAll(query);
    }).then(users => {
      return users.splice(options.offset, options.limit);
    }).map(user => {
      return this.formatToPublicUser(user, true);
    }).then(users => {
      return {found: totalFoundUsers, results: users};
    });
  }

  /**
   * Check the username.
   *
   * @param {string} username
   * @private
   */
  _checkUsername(username) {
    Utils.check.string('username', username, true, false, 3, 100);
  }

  /**
   * Check the email.
   *
   * @param {string} email
   * @private
   */
  _checkEmail(email) {
    Utils.check.string('email', email, true, true, 3, 100); // email cannot contain space
  }

  /**
   * Check the password to see if it complies with our password policy.
   *
   * @param {string} password
   * @private
   */
  _checkPasswordPolicy(password) {
    Utils.check.string('password', password);

    if (password.length < MIN_PASSWORD_LENGTH) {
      throw Errors.business(
        'invalid_parameter', 'Password must be longer than ' + MIN_PASSWORD_LENGTH + ' characters.'
      );
    }
  }

  /**
   * Throw an LkError if in `groupInstances` there is more than 1 builtin group per data-source.
   *
   * @param {GroupInstance[]} groupInstances
   * @throws {LkError}
   * @private
   */
  _checkBuiltinGroups(groupInstances) {
    const builtinGroups = _.filter(groupInstances, group => group.builtin);

    const seen = new Set();

    for (let i = 0; i < builtinGroups.length; ++i) {
      const sourceKey = builtinGroups[i].sourceKey;
      if (seen.has(sourceKey) || seen.has('*') || (sourceKey === '*' && seen.size > 0)) {
        throw Errors.access('invalid_parameter',
          'It\'s not allowed to have a user with more than one builtin group per data-source.');
      }

      seen.add(sourceKey);
    }
  }

  /**
   * Create a new user.
   *
   * @param {string}        username      The desired username for the new user
   * @param {string}        email         The desired email for the new user
   * @param {string | null} password      The desired password for the new user
   * @param {number[]}      groupIds      List of desired group ids
   * @param {string}        source        Source of the user ('local', 'ldap', 'oauth2', etc.)
   * @param {WrappedUser}   [currentUser] Current user
   * @returns {Bluebird<PublicUser>} Public user with groups and actions
   */
  createUser(username, email, password, groupIds, source, currentUser) {
    if (!LKE.isEnterprise()) {
      return Errors.business('not_implemented', undefined, true);
    }

    if (Utils.noValue(username) || Utils.noValue(email) ||
      ((source === 'local') && Utils.noValue(password))) {
      return Errors.business('missing_field', 'Username, email and password are required', true);
    }

    groupIds = Utils.noValue(groupIds) ? [] : groupIds;

    this._checkUsername(username);
    // email is also validated by Sequelize
    this._checkEmail(email);

    Utils.check.array('groupIds', groupIds);

    if (source === 'local') {
      this._checkPasswordPolicy(password);
    } else {
      // We don't store the password for strategies other than 'local'
      password = '-';

      if (groupIds.length === 0) {
        // if we don't have any particular group for this user
        // we set the default group for external user to it
        const externalUserDefaultGroupId = Config.get('access.externalUserDefaultGroupId');
        if (Utils.hasValue(externalUserDefaultGroupId)) {
          groupIds = [externalUserDefaultGroupId];
        }
      }
    }

    return this._getUserInstanceByUsername(username).then(existingUser => {
      if (existingUser) {
        return Errors.business('user_exists', 'This username is already used.', true);
      }

      return this.getUserInstanceByEmail(email);
    }).then(existingUser => {
      if (existingUser) {
        return Errors.business('user_exists', 'This email is already used.', true);
      }

      return GroupDAO.getGroupInstances(groupIds, true);
    }).map(group => {
      // for each group we want to add to the new user
      // we check that the current user, if defined, can manage it
      if (Utils.hasValue(currentUser)) {
        return currentUser.canManageUsers(group.sourceKey).return(group);
      }

      return group;
    }).then(groupInstances => {
      if (groupInstances.length !== groupIds.length) {
        return Errors.business(
          'invalid_parameter', 'Unknown group specified while creating user.', true
        );
      }

      this._checkBuiltinGroups(groupInstances);

      return this.model.create({
        username: username, email: email, password: password, source: source
      }).catch(err => {
        // handle email validation error from Sequelize
        if (err.name === 'SequelizeValidationError' && err.errors[0].path === 'email') {
          return Errors.business('email_format', null, true);
        } else {
          return Promise.reject(err);
        }
      }).then(newUserInstance => {
        return Promise.resolve(newUserInstance.setGroups(groupInstances)).then(() => {
          newUserInstance.groups = groupInstances;

          return this.formatToPublicUser(newUserInstance);
        });
      });
    });
  }

  /**
   * Given some user preferences and new preferences to apply:
   *  - merge the new preferences into the user preferences
   *  - remove all the preferences with the default value
   *
   * By doing so, every preference that has the default value is automatically
   * updated when the default preferences are updated.
   *
   * @param {UserPreferences} preferences
   * @param {UserPreferences} newPreferences
   * @returns {UserPreferences}
   * @private
   */
  _setUserPreferences(preferences, newPreferences) {
    const defaultPreferences = Config.get('defaultPreferences');
    let result = _.defaults(newPreferences, preferences);

    result = _.pickBy(result, (value, key) => {
      return defaultPreferences[key] !== value;
    });

    return result;
  }

  /**
   * Update an existing user.
   * No user can edit its own groups.
   *
   * @param {number}               userId      ID of the user to update
   * @param {UserUpdateAttributes} userUpdate  User fields to update
   * @param {WrappedUser}          currentUser Current user
   * @returns {Bluebird<PublicUser>}
   */
  updateUser(userId, userUpdate, currentUser) {
    Utils.check.property('user', userUpdate, {
      required: true,
      properties: {
        username: {check: (key, value) => { return this._checkUsername(value); }},
        password: {check: (key, value) => { return this._checkPasswordPolicy(value); }},
        // email is also validated by Sequelize
        email: {check: (key, value) => { return this._checkEmail(value); }},
        preferences: {
          properties: {
            pinOnDrag: {type: 'boolean'},
            locale: {check: (key, value) => {
              Utils.check.string(key, value, true, true, 5, 5); // valid example: "en-US"
              // if 3rd character is not '-' throw an error
              if (value[2] !== '-') {
                throw Errors.business('invalid_parameter', `"${key}" must be a valid locale.`);
              }
            }},
            uiWorkspaceSearch: {type: 'boolean'},
            uiExport: {type: 'boolean'},
            uiDesign: {type: 'boolean'},
            uiLayout: {type: 'boolean'},
            uiEdgeSearch: {type: 'boolean'},
            uiShortestPath: {type: 'boolean'},
            uiCollapseNode: {type: 'boolean'},
            uiScreenshot: {type: 'boolean'},
            uiCaptionConfig: {type: 'boolean'},
            uiTooltipConfig: {type: 'boolean'},
            uiVisualizationPanel: {type: 'boolean'},
            uiNodeList: {type: 'boolean'},
            uiEdgeList: {type: 'boolean'},
            uiTooltip: {type: 'boolean'},
            uiSimpleLayout: {type: 'boolean'}
          }
        },
        addedGroups: {arrayItem: {check: 'number'}},
        removedGroups: {arrayItem: {check: 'number'}}
      },
      policy: 'strictExist' // at least one property defined
    });

    return Promise.resolve().then(() => {
      if (Utils.noValue(userUpdate.email)) {
        return;
      }

      // check if the new email is already used
      return this.getUserInstanceByEmail(userUpdate.email).then(userInstance => {
        if (Utils.hasValue(userInstance) && userInstance.id !== userId) {
          return Errors.business('user_exists', 'This email is already used.', true);
        }
      });
    }).then(() => {
      if (Utils.noValue(userUpdate.username)) {
        return;
      }

      // check if the new username is already used
      return this._getUserInstanceByUsername(userUpdate.username).then(userInstance => {
        if (Utils.hasValue(userInstance) && userInstance.id !== userId) {
          return Errors.business('user_exists', 'This username is already used.', true);
        }
      });
    }).then(() => {
      return this._getUserInstance(userId, true);
    }).then(userInstance => {
      // if the user is the unique use we can only update the preferences
      if (userInstance.id === this.model.UNIQUE_USER_ID) {
        // list new properties that have a value
        const changed = _.keys(_.pickBy(userUpdate, v => Utils.hasValue(v)));
        if (changed.length !== 1 || changed[0] !== 'preferences') {
          return Errors.access('forbidden',
            'You can only update "preferences" for the unique user.', true);
        }
      }

      // if the user is the guest user we can only modify the groups
      if (userInstance.id === this.model.GUEST_USER_ID) {
        const changed = _.keys(_.pickBy(userUpdate, v => Utils.hasValue(v)));
        if (_.difference(changed, ['addedGroups', 'removedGroups']).length > 0) {
          return Errors.access('forbidden',
            'You can only update the groups for the guest user.', true
          );
        }
      }

      // if the user is not local we cannot modify username, password and email
      if (userInstance.source !== 'local' && (
        Utils.hasValue(userUpdate.username) ||
          Utils.hasValue(userUpdate.password) ||
          Utils.hasValue(userUpdate.email)
      )) {
        return Errors.business('not_implemented',
          'Cannot edit "username", "email" or "password" of non local user.', true
        );
      }

      if (Utils.hasValue(userUpdate.username)) {
        userInstance.username = userUpdate.username;
      }
      if (Utils.hasValue(userUpdate.password)) {
        userInstance.password = userUpdate.password;
      }
      if (Utils.hasValue(userUpdate.email)) {
        userInstance.email = userUpdate.email;
      }
      if (Utils.hasValue(userUpdate.preferences)) {
        userInstance.preferences = this._setUserPreferences(userInstance.preferences,
          userUpdate.preferences);
      }

      return Promise.resolve().then(() => {
        // No group specified, don't touch groups
        if (Utils.noValue(userUpdate.addedGroups) && Utils.noValue(userUpdate.removedGroups)) {
          UserCache.removeFromCache(userId);
          return userInstance.save();
        }
        // default to empty arrays
        userUpdate.addedGroups = Utils.hasValue(userUpdate.addedGroups)
          ? userUpdate.addedGroups : [];
        userUpdate.removedGroups = Utils.hasValue(userUpdate.removedGroups)
          ? userUpdate.removedGroups : [];

        if (userInstance.id === currentUser.id) {
          return Errors.access('forbidden', 'No user can edit its own groups.', true);
        }

        const unionGroups = _.union(userUpdate.addedGroups, userUpdate.removedGroups);

        // check if some group ids are both in addedGroups and removedGroups
        if (unionGroups.length < userUpdate.addedGroups.length + userUpdate.removedGroups.length) {
          return Errors.business('invalid_parameter',
            'You can\'t add and remove a group at the same time.', true);
        }

        // check that no group to add is already in userInstance
        const alreadyPresentGroups = _.intersection(
          _.map(userInstance.groups, 'id'), userUpdate.addedGroups
        );
        if (alreadyPresentGroups.length > 0) {
          return Errors.business('invalid_parameter',
            'You can\'t add a group already present to a user. IDs: ' +
            alreadyPresentGroups.join(', '), true);
        }

        // check that all the group to remove are in userInstance
        const notPresentGroups = _.difference(
          userUpdate.removedGroups, _.map(userInstance.groups, 'id')
        );
        if (notPresentGroups.length > 0) {
          return Errors.business('invalid_parameter',
            'You can\'t remove a group not present from a user. IDs: ' +
            notPresentGroups.join(', '), true);
        }

        // for each group to add and remove
        return GroupDAO.getGroupInstances(unionGroups, true).map(group => {
          // we check that the user is authorized to do so
          return currentUser.canManageUsers(group.sourceKey).return(group);
        }).then(groupInstances => {
          const [addGroupInstances, rmGroupInstances] = _.partition(groupInstances,
            g => userUpdate.addedGroups.includes(g.id));

          userInstance.groups = _.unionBy(userInstance.groups, addGroupInstances, 'id');
          userInstance.groups = _.differenceBy(userInstance.groups, rmGroupInstances, 'id');

          // check that the user wouldn't end up with more than 1 builtin group per data-source
          this._checkBuiltinGroups(userInstance.groups);

          return userInstance.setGroups(userInstance.groups);
        }).then(() => {
          UserCache.removeFromCache(userId);
          return userInstance.save();
        });
      }).then(() => {
        return this.formatToPublicUser(userInstance);
      });
    }).catch(err => {
      // handle email validation error from Sequelize
      if (err.name === 'SequelizeValidationError' && err.errors[0].path === 'email') {
        return Errors.business('email_format', null, true);
      } else {
        return Promise.reject(err);
      }
    });
  }

  /**
   * Delete a user and everything he owns.
   *
   * @param {number}      userId      ID of the user to delete
   * @param {WrappedUser} currentUser Current user
   * @returns {Bluebird<void>}
   */
  deleteUser(userId, currentUser) {
    if (!LKE.isEnterprise()) {
      return Errors.business('not_implemented', undefined, true);
    }

    if (userId === this.model.UNIQUE_USER_ID || userId === this.model.GUEST_USER_ID) {
      return Errors.business('invalid_parameter', 'You cannot delete builtin users.', true);
    }

    if (userId === currentUser.id) {
      return Errors.business('invalid_parameter', 'You cannot delete yourself.', true);
    }

    return Db.models.visualizationShare.destroy({where: {userId: userId}}).then(() => {
      return Db.models.graphQuery.destroy({where: {userId: userId}});
    }).then(() => {
      return Db.models.widget.destroy({where: {userId: userId}});
    }).then(() => {
      return Db.models.visualization.destroy({where: {userId: userId}});
    }).then(() => {
      return Db.models.visualizationFolder.destroy({where: {userId: userId}});
    }).then(() => {
      UserCache.removeFromCache(userId);
      return Db.models.user.destroy({where: {id: userId}});
    }).return();
  }
}

module.exports = new UserDAO();
