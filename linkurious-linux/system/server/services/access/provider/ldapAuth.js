/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-05-05.
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');
const ldapjs = require('ldapjs');

// services
const LKE = require('../../index');
const Config = LKE.getConfig();
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const Log = LKE.getLogger(__filename);

/**
 * @typedef {{url: string, bindDN?: string, bindPassword?: string, baseDN: string[], usernameField: string, emailField?: string, groupField?: string, tls?: {rejectUnauthorized?: boolean}}} LkConfigAccessLdap
 */

const TIMEOUT = 5000;
const CONNECT_TIMEOUT = 5000;

class LDAPClient {
  /**
   * @param {LkConfigAccessLdap} options
   */
  constructor(options) {
    this._options = options;

    this._connected = false;
  }

  /**
   * Bind the LDAP client to the LDAP server.
   * Return a rejected promise if the bind was unsuccessful.
   *
   * @returns {Bluebird<boolean>}
   * @private
   */
  _bind() {
    return new Promise((resolve, reject) => {
      this._ldapjsClient.bind(this._options.bindDN, this._options.bindPassword, bindError => {
        if (bindError) {
          this._ldapjsClient.destroy();
          if (bindError.name === 'InvalidCredentialsError' ||
              bindError.name === 'NoSuchObjectError') {
            Log.debug('Bind LDAP client failure (credentials)');
            resolve(false);
          } else {
            reject(bindError);
          }
        } else {
          this._connected = true;
          Log.debug('Bind LDAP client success');
          resolve(true);
        }
      });
    });
  }

  /**
   * Initialize the client and bind the LDAP client to the LDAP server.
   * Return a rejected promise if the bind was unsuccessful.
   *
   * @returns {Bluebird<boolean>}
   */
  bind() {
    if (this._connected) {
      Log.debug('Attempt to bind but the LDAP client was already connected');
      return Promise.resolve(false);
    }

    this._initClient();

    return Utils.retryPromise(
      'Bind to the LDAP server', () => this._bind(), {delay: 2000, retries: 5, fullErrors: false}
    ).catch(error => {
      Log.error('Bind LDAP client failure (error)', error);

      return Errors.technical(
        'ldap_bind_error',
        'Could not connect to the LDAP server (' + (error.message ? error.message : error) + ')',
        true
      );
    });
  }

  /**
   * Unbind the LDAP client from the LDAP server.
   */
  unbind() {
    this._connected = false;
    this._ldapjsClient.destroy();
    Log.debug('Unbind LDAP client success');
  }

  /**
   * @private
   */
  _initClient() {
    this._ldapjsClient = ldapjs.createClient({
      url: this._options.url,
      maxConnections: 1,
      timeout: TIMEOUT,
      connectTimeout: CONNECT_TIMEOUT,
      tlsOptions: this._options.tls
    });

    const onError = e => {
      Log.error(e);
      this.unbind();
    };

    this._ldapjsClient.on('error', onError);
    this._ldapjsClient.on('timeout', () => onError('Request timed out'));
    this._ldapjsClient.on('connectTimeout', () => onError('Connection timed out'));

    Log.debug('LDAP client created');
  }

  /**
   * Check if the pair `username` and `password` is valid.
   *
   * @param {string} username
   * @param {string} password
   * @param {string} [baseDN]
   *
   * @returns {Bluebird<string | null>} the baseDN where the user is located or null, if the credentials are not valid
   * @private
   */
  _checkCredentials(username, password, baseDN) {
    let baseDNs;

    if (Utils.hasValue(baseDN)) { // if we know already the right baseDN because LDAPClient::findUser knew it already
      baseDNs = [baseDN];
    } else { // otherwise we look in all the possible configured baseDN
      baseDNs = this._options.baseDN;
    }

    return Promise.map(baseDNs, baseDN => {
      const bindDN = `${this._options.usernameField}=${username},${baseDN}`;
      const client = new LDAPClient(_.defaults({bindDN: bindDN, bindPassword: password},
        this._options));

      return client.bind().then(validCredentials => {
        if (!validCredentials) {
          return null;
        }

        client.unbind();
        return baseDN;
      });
    }, {concurrency: 1}).then(validBaseDNs =>
      _.get(validBaseDNs.filter(Utils.hasValue), 0)
    );
  }

  /**
   * Create an LDAP filter for `username` equality.
   *
   * @param {string} username
   * @private
   */
  _createLDAPFilter(username) {
    return new ldapjs.filters.AndFilter({filters: [
      new ldapjs.filters.EqualityFilter({
        attribute: this._options.usernameField,
        value: username
      }),
      new ldapjs.filters.PresenceFilter({
        attribute: 'objectClass'
      })
    ]});
  }

  /**
   * Search for `username` under `baseDN`. Return the LDAP search result.
   *
   * @param {string} username
   * @param {string} baseDN
   * @returns {Bluebird<any>}
   * @private
   */
  _doLDAPSearch(username, baseDN) {
    return new Promise((resolve, reject) => {
      this._ldapjsClient.search(baseDN, {
        scope: 'sub',
        filter: this._createLDAPFilter(username),
        sizeLimit: 1,
        timeLimit: TIMEOUT
      }, (error, searchEvents) => {
        if (error) {
          Log.error(error);
          this.unbind();
          return reject(Errors.technical('critical', error));
        }

        let result = null;
        searchEvents.on('searchEntry', entry => { result = entry && entry.object; });

        searchEvents.on('error', error => {
          if (error.name === 'NoSuchObjectError') {
            return resolve();
          }

          Log.error(error);
          this.unbind();

          reject(Errors.technical(
            'critical',
            'Could not communicate with the LDAP server (' +
            (error.message ? error.message : error) + ')'
          ));
        });
        searchEvents.on('end', () => resolve(result));
      });
    });
  }

  /**
   * Return the external profile of the user.
   *
   * @param {string} username
   * @param {string} baseDN
   *
   * @returns {Bluebird<ExternalUserProfile | null>}
   * @private
   */
  _retrieveUserProfile(username, baseDN) {
    return this.bind().then(validCredentials => {
      if (!validCredentials) {
        // the credentials for binding were already tested in LDAPClient::_checkCredentials or
        // LDAPAuth::startupCheck. this code should be reachable only if the password was changed
        return Errors.technical(
          'ldap_bind_error',
          'Could not connect to the LDAP server (Invalid "bindDN", "bindPassword" credentials)',
          true
        );
      }

      return this._doLDAPSearch(username, baseDN).then(ldapSearchResult => {
        this.unbind();

        if (Utils.noValue(ldapSearchResult)) {
          return null;
        }

        // parse the ldapSearchResult to the standard the external profile object
        const externalProfile = {
          username: ldapSearchResult[this._options.usernameField],
          email: ldapSearchResult[this._options.emailField] ||
            Utils.generateRandomEmail(Config.get('customerId')),
          externalGroupIds: []
        };

        if (Utils.hasValue(this._options.groupField)) {
          const g = ldapSearchResult[this._options.groupField];
          if (Utils.noValue(g)) {
            // no group is set or `groupField` is wrong
          } else if (Array.isArray(g)) {
            externalProfile.externalGroupIds = g.map(group => group + '');
          } else {
            externalProfile.externalGroupIds.push(g + '');
          }
        }

        return externalProfile;
      });
    });
  }

  /**
   * Check if the pair `username` and `password` is valid. Return the external profile of the user.
   *
   * @param {string} username
   * @param {string} password
   * @param {string} [baseDN]
   * @returns {Bluebird<ExternalUserProfile | null>}
   */
  findUser(username, password, baseDN) {
    return this._checkCredentials(username, password, baseDN).then(baseDN => {
      if (Utils.noValue(baseDN)) {
        return null;
      }

      // we know that the pair `username` and `password` is valid and that the username can be
      // found under `baseDN`

      return this._retrieveUserProfile(username, baseDN);
    });
  }
}

class LDAPAuth {
  constructor() {
    // whether or not a master LDAP client will be used
    if (Utils.hasValue(this.config.bindDN)) {
      // init LDAP admin client
      this._adminLDAPClient = new LDAPClient(this.config);
    } // else we will lazily create a client for each user trying to authenticate
  }

  /**
   * @type {LkConfigAccessLdap}
   */
  get config() {
    const config = Config.get('access.ldap');
    if (typeof config.baseDN === 'string') {
      config.baseDN = [config.baseDN];
    }

    return config;
  }

  /**
   * Check if `config.bindDN`, if in use, can bind.
   *
   * @returns {Bluebird<void>}
   */
  startupCheck() {
    if (Utils.noValue(this._adminLDAPClient)) {
      return Promise.resolve();
    }

    return this._adminLDAPClient.bind().then(validCredentials => {
      if (!validCredentials) {
        return Errors.business(
          'ldap_bind_error',
          'Could not connect to the LDAP server (Invalid "bindDN", "bindPassword" credentials)',
          true
        );
      }

      this._adminLDAPClient.unbind();
    });
  }

  /**
   * Check if the pair `username` and `password` is valid. Return the external profile of the user.
   *
   * @param {string} username
   * @param {string} password
   * @returns {Bluebird<ExternalUserProfile | null>}
   */
  authenticate(username, password) {
    if (Utils.hasValue(this._adminLDAPClient)) {
      // if we use the admin ldap client to find the user
      return this._adminLDAPClient.findUser(username, password);
    }

    // if we use the user itself to bind and we have 1 or multiple baseDN
    return Promise.map(this.config.baseDN, baseDN => {
      const bindDN = `${this.config.usernameField}=${username},${baseDN}`;
      const client = new LDAPClient(_.defaults({bindDN: bindDN, bindPassword: password},
        this.config));

      // we know that we have to search the user only in this baseDN
      return client.findUser(username, password, baseDN);
    }, {concurrency: 1}).then(validExternalProfiles =>
      _.get(validExternalProfiles.filter(Utils.hasValue), 0)
    );
  }
}

module.exports = LDAPAuth;
