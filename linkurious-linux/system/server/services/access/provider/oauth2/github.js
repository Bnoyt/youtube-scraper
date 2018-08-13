/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-11-28.
 */
'use strict';

// locals
const AbstractOAuth2 = require('./abstractoauth2');
const LkRequest = require('../../../../lib/LkRequest');

class Github extends AbstractOAuth2 {

  constructor() {
    super();
    this._request = new LkRequest({
      headers: {
        'User-Agent': 'request'
      },
      json: true
    });
  }

  /**
   * The OAuth2 scope.
   *
   * @returns {string} scope
   */
  getScope() {
    return 'user:email';
  }

  /**
   * @param {{access_token: string}} response
   * @returns {Bluebird<ExternalUserProfile>}
   */
  getProfileData(response) {
    return this._request.get('https://api.github.com/user',
      {qs: {'access_token': response.access_token}}).then(userR => {
      return {username: userR.body.login, email: userR.body.email};
    });
  }
}

module.exports = Github;
