/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-11-25.
 */
'use strict';

// external libs
const Promise = require('bluebird');
const jwt = require('jsonwebtoken');
const _ = require('lodash');

// locals
const AbstractOAuth2 = require('./abstractoauth2');
const LkRequest = require('./../../../../lib/LkRequest');

// services
const LKE = require('./../../../index');
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();

class OpenIDConnect extends AbstractOAuth2 {
  /**
   * @param {{userinfoURL?: string, scope?: string, groupClaim?: string}} oidcConf
   */
  constructor(oidcConf) {
    super();

    oidcConf = _.defaults(oidcConf, {});

    const userDefinedScope = Utils.hasValue(oidcConf.scope) ? oidcConf.scope.split(' ') : [];
    this._scope = _.union(['openid', 'profile', 'email'], userDefinedScope).join(' ');

    this._userinfoURL = oidcConf.userinfoURL;
    this._groupClaim = oidcConf.groupClaim;

    if (Utils.hasValue(this._groupClaim) && Utils.noValue(this._userinfoURL)) {
      throw Errors.business(
        'invalid_parameter',
        'access.oauth2.openidconnect.groupClaim is set ' +
        'but access.oauth2.openidconnect.userinfoURL is missing.'
      );
    }

    if (Utils.hasValue(this._userinfoURL)) {
      this._request = new LkRequest({baseUrl: this._userinfoURL, json: true});
    }
  }

  /**
   * The OAuth2 scope.
   *
   * @returns {string} scope
   */
  getScope() {
    return this._scope;
  }

  /**
   * Retrieve username and email of the user by parsing the ID token inside response.
   *
   * @param {{access_token: string, id_token: string}} response
   * @returns {Bluebird<ExternalUserProfile>}
   */
  getProfileData(response) {
    const decodedIDToken = jwt.decode(response.id_token);
    // no need to validate the ID token, since it's taken directly from the provider (hopefully) via secure HTTP
    const email = decodedIDToken.email;
    const username = decodedIDToken.name || decodedIDToken.email;

    if (Utils.hasValue(this._groupClaim)) {
      return this._request.get('', {
        headers: {
          Authorization: 'Bearer ' + response.access_token
        }
      }).then(r => {
        const externalGroupIds = r.body[this._groupClaim] || [];
        return {
          username: username,
          email: email,
          externalGroupIds: externalGroupIds
        };
      });
    } else {
      return Promise.resolve({username: username, email: email});
    }
  }
}

module.exports = OpenIDConnect;
