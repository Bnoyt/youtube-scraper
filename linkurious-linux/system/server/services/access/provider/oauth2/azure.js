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

// locals
const OpenIDConnect = require('./openidconnect');
const LkRequest = require('../../../../lib/LkRequest');

// services
const LKE = require('../../../index');
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const Config = LKE.getConfig();

class Azure extends OpenIDConnect {

  /**
   * @param {{tenantID?: string}} azureConf
   */
  constructor(azureConf) {
    super({});
    this.tenantID = azureConf.tenantID;
    if (Utils.hasValue(Config.get('access.externalUsersGroupMapping')) &&
      Utils.noValue(this.tenantID)) {
      throw Errors.access('missing_field', '"configuration.access.oauth2.azure.tenantID" ' +
        'must not be undefined if "access.externalUsersGroupMapping" is defined.');
    }
    this._request = new LkRequest({
      headers: {
        'User-Agent': 'request'
      },
      json: true
    });
  }

  /**
   * Return the group a given user has in the Azure Active Directory.
   *
   * @param {string} userId
   * @param {string} accessToken
   * @returns {Bluebird<string[]>}
   * @private
   */
  _getExternalGroupIds(userId, accessToken) {
    return Promise.resolve().then(() => {
      if (Utils.hasValue(this.tenantID) &&
        Utils.hasValue(Config.get('access.externalUsersGroupMapping'))) {
        return this._request.post(
          `https://graph.windows.net/${this.tenantID}/users/${userId}/getMemberGroups`,
          {
            body: {'securityEnabledOnly': false},
            qs: {'api-version': '1.6'},
            headers: {Authorization: 'Bearer ' + accessToken}
          }
        ).then(groupsR => {
          if (groupsR.statusCode === 401) {
            return Errors.business('critical', 'The access token is not authorized ' +
              'to access the Azure graph API as the signed-in user', true);
          } else if (groupsR.statusCode !== 200) {
            return Errors.technical('critical', groupsR.body, true);
          }
          return groupsR.body && groupsR.body.value || [];
        });
      }
    });
  }

  /**
   * Retrieve username and email of the user by parsing the ID token inside response.
   *
   * @param {{access_token: string, id_token: string}} response
   * @returns {Bluebird<ExternalUserProfile>}
   */
  getProfileData(response) {
    const decodedIDToken = jwt.decode(response.id_token);
    const email = decodedIDToken.email || decodedIDToken.unique_name; // <-- different from openidconnect
    const username = decodedIDToken.name || decodedIDToken.email;

    return this._getExternalGroupIds(decodedIDToken.oid, response.access_token)
      .then(externalGroupIds => {
        return {
          username: username,
          email: email,
          externalGroupIds: externalGroupIds
        };
      });
  }

  /**
   * Azure AD requires an additional param `resource` to obtain an access token
   * that has the rights to read the groups.
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
      'resource': 'https://graph.windows.net',
      'redirect_uri': redirectURL,
      'grant_type': 'authorization_code'
    };
  }
}

module.exports = Azure;
