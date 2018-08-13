/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-06-27.
 */
'use strict';

// internal libs
const fs = require('fs');

// external libs
const Promise = require('bluebird');
const saml2 = require('saml2-js');

// services
const LKE = require('../../index');
const Config = LKE.getConfig();
const Log = LKE.getLogger(__filename);
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();

class SAML2 {
  startupCheck() {
    // retrieve SAML2 specific configurations
    this._url = Config.get('access.saml2.url');
    this._identityProviderCertificate = fs.readFileSync(
      Config.get('access.saml2.identityProviderCertificate')
    ).toString();
    this._groupAttribute = Config.get('access.saml2.groupAttribute');

    this.sp = this._instantiateSP(LKE.getBaseURL());

    const identityProviderOptions = {
      'sso_login_url': this._url,
      certificates: [this._identityProviderCertificate],
      'allow_unencrypted_assertion': true
    };

    // Call identity provider constructor with options
    this.idp = new saml2.IdentityProvider(identityProviderOptions);

    return Promise.resolve();
  }

  /**
   * @param {string} redirectURL
   * @returns {any}
   * @private
   */
  _instantiateSP(redirectURL) {
    const baseUrl = Utils.normalizeUrl(redirectURL);

    const serviceProviderOptions = {
      'entity_id': baseUrl,
      'assert_endpoint': baseUrl + '/api/auth/sso/return'
    };

    return new saml2.ServiceProvider(serviceProviderOptions);
  }

  /**
   * Return the URL of the SAML2 authorization endpoint.
   *
   * @param {string} [requestBaseUrl] Base url of Linkurious where the user should be redirected by the authentication provider
   * @returns {Bluebird<string>} authenticateURL
   */
  getAuthenticateURLSSO(requestBaseUrl) {
    const sp = Utils.hasValue(requestBaseUrl)
      ? this._instantiateSP(requestBaseUrl)
      : this.sp;

    return new Promise((resolve, reject) => {
      sp.create_login_request_url(this.idp, {}, (err, loginUrl) => {
        if (err) {
          Log.error('saml2.create_login_request_url failed', err);
          reject(Errors.technical('critical', 'SAML2 connector returned an error.'));
        }

        resolve(loginUrl);
      });
    });
  }

  /**
   * Authenticate the user via SAML2.
   *
   * @param {string} code
   * @param {string} [requestBaseUrl] Base url of Linkurious where the user was redirected by the authentication provider (for verification)
   * @returns {Bluebird<ExternalUserProfile>}
   */
  handleAuthenticateURLResponseSSO(code, requestBaseUrl) {
    const sp = Utils.hasValue(requestBaseUrl)
      ? this._instantiateSP(requestBaseUrl)
      : this.sp;

    return new Promise((resolve, reject) => {
      const options = { 'request_body': { SAMLResponse: code } };

      sp.post_assert(this.idp, options, (err, samlResponse) => {
        if (err) {
          Log.error('saml2.post_assert failed', err);
          return reject(Errors.technical('critical', 'SAML2 server returned an error.'));
        }

        if (Utils.noValue(samlResponse.user) || Utils.noValue(samlResponse.user.name_id)) {
          return reject(Errors.technical('critical', 'SAML2 server didn\'t return any user.'));
        }

        const externalUserProfile = {
          username: samlResponse.user.name_id,
          email: samlResponse.user.name_id
        };

        if (Utils.hasValue(this._groupAttribute) && Utils.hasValue(samlResponse.user.attributes)) {
          externalUserProfile.externalGroupIds = samlResponse.user.attributes[this._groupAttribute];
        }

        resolve(externalUserProfile);
      });
    });
  }
}

module.exports = SAML2;
