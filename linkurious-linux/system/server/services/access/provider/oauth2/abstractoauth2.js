/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-11-28.
 */
'use strict';

/* eslint no-unused-vars: 0 */ // abstract methods

// services
const LKE = require('../../../index');
const Errors = LKE.getErrors();

class AbstractOAuth2 {
  /**
   * Parse the response of the tokenURL (including, but not limited to, the `access_token`)
   * to get username and email.
   *
   * @param {{access_token: string, id_token?: string}} response
   * @returns {Bluebird<ExternalUserProfile>}
   */
  getProfileData(response) {
    throw Errors.business('not_implemented', 'getProfileData is not implemented.');
  }

  /**
   * The OAuth2 scope.
   *
   * @returns {string} scope
   */
  getScope() {
    throw Errors.business('not_implemented', 'getScope is not implemented.');
  }

  /**
   * Params to be passed to the tokenURL to acquire the access token.
   *
   * @param {string} code
   * @param {string} clientID
   * @param {string} clientSecret
   * @param {string} redirectURL
   * @returns {any} params
   */
  getTokenURLParams(code, clientID, clientSecret, redirectURL) {
    return {
      code: code,
      'client_id': clientID,
      'client_secret': clientSecret,
      'redirect_uri': redirectURL,
      'grant_type': 'authorization_code'
    };
  }
}

module.exports = AbstractOAuth2;
