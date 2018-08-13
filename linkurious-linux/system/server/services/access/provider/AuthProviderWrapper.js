/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-10-25.
 */
'use strict';

// external libs
const Promise = require('bluebird');

// services
const LKE = require('../../index');
const Errors = LKE.getErrors();
const Config = LKE.getConfig();
const Log = LKE.getLogger(__filename);

class AuthProviderWrapper {

  /**
   * @param {string} name      Human readable name
   * @param {string} configKey Configuration key (under `access` config root)
   * @param {string} className Location of the implementation file (relative to `access/provider` package)
   */
  constructor(name, configKey, className) {
    this.name = name;

    // load config
    this.config = Config.get('access.' + configKey, {enabled: false});
    this.enabled = LKE.isEnterprise() && this.config.enabled;

    // create the provider instance
    this.instance = this.enabled ? new (require('./' + className))() : null;
  }

  /**
   * @param {string} username
   * @param {string} password
   * @returns {Bluebird<ExternalUserProfile | null>} an external user
   */
  authenticate(username, password) {
    if (!this.enabled) {
      return Promise.resolve(null);
    }

    // not all auth providers can authenticate via username and password
    if (!this.instance.authenticate) {
      return Promise.resolve(null);
    }

    return this.instance.authenticate(username, password);
  }

  /**
   * Checked at startup (can be used to check connectivity with the auth server).
   *
   * @returns {Bluebird<void>}
   */
  startupCheck() {
    if (!this.enabled) {
      return Promise.resolve();
    }

    if (!this.instance.startupCheck) {
      return Promise.resolve();
    }

    return this.instance.startupCheck().then(() => {
      Log.info('Startup check for Auth Provider "' + this.name + '": success');
    }).catch(e => {
      Log.error('Startup check for "' + this.name + '": failed');
      return Promise.reject(e);
    });
  }

  /**
   * Return the URL of the OAuth2/SAML2 authorization endpoint.
   *
   * The `state` parameter is only used by OAuth2.
   *
   * @param {string} state            A random string, stored in the current session, to be checked on AuthenticateURL response
   * @param {string} [requestBaseUrl] Base url of Linkurious where the user should be redirected by the authentication provider
   * @returns {Bluebird<string>} authenticateURL
   */
  getAuthenticateURLSSO(state, requestBaseUrl) {
    if (!this.instance.getAuthenticateURLSSO) {
      return Errors.technical('bug',
        'getAuthenticateURLSSO() should only be called on the oauth2/saml2 provider.', true);
    }

    if (this.name === 'OAuth2') {
      return this.instance.getAuthenticateURLSSO(state, requestBaseUrl);
    }

    return this.instance.getAuthenticateURLSSO(requestBaseUrl);
  }

  /**
   * Authenticate the user via OAuth2/SAML2.
   *
   * @param {string} code
   * @param {string} [requestBaseUrl] Base url of Linkurious where the user was redirected by the authentication provider (for verification)
   * @returns {Bluebird<ExternalUserProfile>}
   */
  handleAuthenticateURLResponseSSO(code, requestBaseUrl) {
    if (!this.instance.handleAuthenticateURLResponseSSO) {
      return Errors.technical('bug',
        'getAuthenticateURLSSO() should only be called on the oauth2/saml2 provider.', true);
    }

    return this.instance.handleAuthenticateURLResponseSSO(code, requestBaseUrl);
  }
}

module.exports = AuthProviderWrapper;
