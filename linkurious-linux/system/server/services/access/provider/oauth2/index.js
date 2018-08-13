/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-11-25.
 */
'use strict';

// external libs
const Promise = require('bluebird');
const url = require('url');
const _ = require('lodash');

// locals
const LkRequest = require('../../../../lib/LkRequest');

// services
const LKE = require('../../../index');
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();
const Config = LKE.getConfig();

class OAuth2 {
  startupCheck() {
    // retrieve OAuth2 specific configurations
    this.authorizationURL = Config.get('access.oauth2.authorizationURL');
    this.tokenURL = Config.get('access.oauth2.tokenURL');
    this.clientID = Config.get('access.oauth2.clientID');
    this.clientSecret = Config.get('access.oauth2.clientSecret');
    this.provider = Config.get('access.oauth2.provider');
    this.providerConfig = Config.get(`access.oauth2.${this.provider}`);

    // build the redirectURL based on the configuration
    this.redirectURL = LKE.getBaseURL('/api/auth/sso/return');

    this._request = new LkRequest({baseUrl: this.tokenURL, json: true});

    // create the provider instance
    try {
      this.instance = new (require('./' + this.provider))(this.providerConfig);
    } catch(e) {
      return Errors.access('not_supported',
        `The provider "${this.provider}" was not initialized correctly: ${e.message}`, true);
    }

    this.scope = this.instance.getScope();

    return Promise.resolve();
  }

  /**
   * Return the URL of the OAuth2 authorization endpoint.
   *
   * @param {string} state            A random string, stored in the current session, to be checked on AuthenticateURL response
   * @param {string} [requestBaseUrl] Base url of Linkurious where the user should be redirected by the authentication provider
   * @returns {Bluebird<string>} authenticateURL
   */
  getAuthenticateURLSSO(state, requestBaseUrl) {
    const redirectURL = Utils.hasValue(requestBaseUrl)
      ? requestBaseUrl + '/api/auth/sso/return'
      : this.redirectURL;

    const parsedAuthUrl = url.parse(this.authorizationURL, true);
    parsedAuthUrl.query = _.assign(parsedAuthUrl.query, {
      'client_id': this.clientID,
      'response_type': 'code',
      scope: this.scope,
      'redirect_uri': redirectURL,
      state: state
    });
    parsedAuthUrl.search = undefined;
    return Promise.resolve(url.format(parsedAuthUrl));
  }

  /**
   * Authenticate the user via OAuth2.
   *
   * @param {string} code
   * @param {string} [requestBaseUrl] Base url of Linkurious where the user was redirected by the authentication provider (for verification)
   * @returns {Bluebird<ExternalUserProfile>}
   */
  handleAuthenticateURLResponseSSO(code, requestBaseUrl) {
    const redirectURL = Utils.hasValue(requestBaseUrl)
      ? requestBaseUrl + '/api/auth/sso/return'
      : this.redirectURL;

    const form = this.instance.getTokenURLParams(code, this.clientID,
      this.clientSecret, redirectURL);

    return this._request.post('', {form}).then(response => {
      return this.instance.getProfileData(response.body);
    });
  }
}

module.exports = OAuth2;

