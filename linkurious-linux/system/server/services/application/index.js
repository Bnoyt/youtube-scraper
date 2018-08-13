/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-11-02.
 */
'use strict';

// external libs
const Promise = require('bluebird');
const _ = require('lodash');

// services
const LKE = require('../index');
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const GroupDAO = LKE.getGroupDAO();
const UserDAO = LKE.getUserDAO();

// locals
const ApplicationDAO = require('./ApplicationDAO');

class ApplicationService {

  /**
   * Create a new application.
   *
   * @param {object}   application
   * @param {string}   application.name
   * @param {boolean}  [application.enabled=true]
   * @param {number[]} application.groups
   * @param {string[]} application.rights
   * @returns {Bluebird<PublicApplication>}
   */
  createApplication(application) {
    Utils.check.exist('application', application);

    // extract group ids
    const groupIds = application.groups;
    delete application.groups;
    Utils.check.intArray('application.groups', groupIds, 1);

    // resolve the group instances
    return GroupDAO.getGroupInstances(groupIds).then(groupInstances => {
      return ApplicationDAO.createApplication(application, groupInstances);
    }).then(appInstance => {
      return ApplicationDAO.formatToPublicApplication(appInstance);
    });
  }

  /**
   * Update an application.
   *
   * @param {object}   application
   * @param {number}   application.id        ID of the application to update
   * @param {string}   [application.name]    The new name
   * @param {boolean}  [application.enabled] The new status
   * @param {number[]} [application.groups]  The new groups
   * @param {string[]} [application.rights]  The new rights
   * @returns {Bluebird<PublicApplication>}
   */
  updateApplication(application) {
    Utils.check.exist('application', application);

    // extract group ids
    const groupIds = application.groups;
    delete application.groups;

    return Promise.resolve().then(() => {
      if (Utils.noValue(groupIds)) {
        return;
      }

      // resolve the new group instances (if specified)
      Utils.check.intArray('application.groups', groupIds, 1);
      return GroupDAO.getGroupInstances(groupIds);
    }).then(groupInstances => {
      return ApplicationDAO.updateApplication(application, groupInstances);
    }).then(appInstance => {
      return ApplicationDAO.formatToPublicApplication(appInstance);
    });
  }

  /**
   * @param {string} userEmail
   * @param {string} apiKey
   * @returns {Bluebird<{user: PublicUser, application: PublicApplication}>}
   */
  checkApplication(userEmail, apiKey) {
    return ApplicationDAO.findApplication(apiKey).then(publicApplication => {
      return UserDAO.getUserByEmail(userEmail, true).then(publicUser => {
        const groupIntersection = _.intersectionBy(
          publicUser.groups, publicApplication.groups, 'id'
        );

        if (groupIntersection.length === 0) {
          return Errors.access(
            'bad_credentials',
            'This application cannot act on behalf of the given user.',
            true
          );
        }

        return {
          user: publicUser,
          application: publicApplication
        };
      });
    });
  }

  /**
   * List all applications
   *
   * @returns {Bluebird<PublicApplication[]>}
   */
  getApplications() {
    return ApplicationDAO.getApplications().map(appInstance => {
      return ApplicationDAO.formatToPublicApplication(appInstance);
    });
  }
}

module.exports = new ApplicationService();
