/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-09-16.
 */
'use strict';

// external libs
const _ = require('lodash');
const ActiveDirectory = require('activedirectory');
const Promise = require('bluebird');

// services
const LKE = require('../../index');
const Config = LKE.getConfig();
const Errors = LKE.getErrors();
const Log = LKE.getLogger(__filename);

const find = Promise.promisify(ActiveDirectory.prototype.find);

class MSActiveDirectoryAuth {

  /**
   * Connector to access Microsoft Active Directory users trough LDAP.
   *
   * @constructor
   */
  constructor() {
    this._baseDN = Config.get('access.msActiveDirectory.baseDN', undefined, true);
    this._url = Config.get('access.msActiveDirectory.url', undefined, true);
    this._domain = Config.get('access.msActiveDirectory.domain', undefined, true);
  }

  /**
   * Will authenticate the ActiveDirectory user with `userPrincipalName`.
   * If `usernameOrEmail` is not an e-mail, the domain sets in the configuration
   * is used to generate an e-mail address as: `{username}@{domain}`.
   *
   * @param {string} usernameOrEmail
   * @param {string} password
   * @returns {Bluebird<ExternalUserProfile | null>}
   */
  authenticate(usernameOrEmail, password) {
    let userPrincipalName = usernameOrEmail;

    if (userPrincipalName.indexOf('@') === -1) {
      userPrincipalName += '@' + this._domain;
    }

    const ad = new ActiveDirectory({
      url: this._url,
      baseDN: this._baseDN,
      username: userPrincipalName,
      password: password
    });

    const query = '(&(objectCategory=User)(userPrincipalName=' + userPrincipalName + '))';
    const opts = {
      filter: query,
      includeMembership: ['all'],
      includeDeleted: false
    };

    return find.call(ad, opts).then(result => {
      if (result && result.users) {
        const users = result.users, length = users.length;
        let user, i;

        for (i = 0; i < length; ++i) {
          user = users[i];

          if (typeof user.userPrincipalName === 'string' &&
            user.userPrincipalName.toLowerCase() === userPrincipalName.toLowerCase()) {
            return {
              username: user.sAMAccountName,
              email: user.userPrincipalName,
              externalGroupIds: _.map(user.groups, g => g.cn)
            };
          }
        }
      }

      // no user found matching the query
      return null;
    }).catch(e => {
      if (e.stack && e.stack.startsWith('InvalidCredentialsError')) {
        return null;
      }

      Log.error('ActiveDirectory.find failed', e);
      return Errors.technical('critical', 'Active Directory server returned an error.', true);
    });
  }
}

module.exports = MSActiveDirectoryAuth;
