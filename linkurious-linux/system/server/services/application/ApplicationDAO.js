/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-11-02.
 */
'use strict';

// external libs
const Promise = require('bluebird');

// services
const LKE = require('../index');
const Errors = LKE.getErrors();
const Db = LKE.getSqlDb();
const Utils = LKE.getUtils();

class ApplicationDAO {
  /**
   * @type {ApplicationModel}
   */
  get model() {
    return Db.models.application;
  }

  /**
   * Return an application instance by id.
   * Return a rejected promise if the application wasn't found.
   *
   * @param {number} id
   * @returns {Bluebird<ApplicationInstance>}
   */
  _getApplicationInstance(id) {
    Utils.check.posInt('id', id);

    return this.model.findOne({where: {id: id}, include: [Db.models.group]}).then(instance => {
      if (!instance) {
        return Errors.business('not_found', `Application #${id} was not found.`, true);
      }

      return instance;
    });
  }

  /**
   * @param {ApplicationInstance} appInstance
   * @returns {Bluebird<PublicApplication>}
   */
  formatToPublicApplication(appInstance) {
    const publicApplication = this.model.instanceToPublicAttributes(appInstance);

    return Promise.resolve().then(() => {
      if (Utils.noValue(appInstance.groups)) {
        return;
      }

      return Promise.map(appInstance.groups, group => {
        return Db.models.group.instanceToPublicAttributes(group);
      }).then(publicGroups => {
        publicApplication.groups = publicGroups;
      });
    }).return(publicApplication);
  }

  /**
   * Return an application instance by API key.
   * The application has to be enabled otherwise a rejected promise is returned.
   *
   * @param {string} apiKey
   * @returns {Bluebird<PublicApplication>} ApplicationInstance populated with the groups
   */
  findApplication(apiKey) {
    return this.model.findOne({
      where: {apiKey: apiKey},
      include: [Db.models.group]
    }).then(applicationInstance => {
      if (!applicationInstance) {
        return Errors.access('bad_credentials', 'Wrong API key.', true);
      }

      if (!applicationInstance.enabled) {
        return Errors.access('forbidden', 'The application is not enabled.', true);
      }

      return this.formatToPublicApplication(applicationInstance);
    });
  }

  /**
   * Set the groups of an application and return the populated application.
   *
   * @param {ApplicationInstance} appInstance
   * @param {GroupInstance[]}     groupInstances
   * @returns {Bluebird<ApplicationInstance>}
   * @private
   */
  _setGroups(appInstance, groupInstances) {
    return appInstance.setGroups(groupInstances).then(() => {
      appInstance.groups = groupInstances;
      return appInstance;
    });
  }

  /**
   * Create a new application.
   *
   * @param {ApplicationAttributes} application
   * @param {GroupInstance[]}       groupInstances
   * @returns {Bluebird<ApplicationInstance>}
   */
  createApplication(application, groupInstances) {
    // generate apiKey
    application.apiKey = Utils.randomHex(16);

    // enable by default
    if (Utils.noValue(application.enabled)) { application.enabled = true; }

    // validation
    Utils.check.properties('application', application, {
      name: {required: true, check: 'nonEmpty'},
      enabled: {required: true, type: 'boolean'},
      apiKey: {required: true, check: ['string', true, true, 32, 32]},
      rights: {required: true, arrayItem: {check: ['values', this.model.APP_ACTIONS, true]}}
    });

    return this.model.create(application).then(appInstance => {
      return this._setGroups(appInstance, groupInstances);
    });
  }

  /**
   * @param {{id: number, name?: string, enabled?: boolean, rights?: string[]}} application
   * @param {GroupInstance[]} [groupInstances]
   * @returns {Bluebird<ApplicationInstance>}
   */
  updateApplication(application, groupInstances) {
    Utils.check.properties('application', application, {
      id: {required: true, check: 'posInt'},
      name: {required: false, check: 'nonEmpty'},
      enabled: {required: false, type: 'boolean'},
      rights: {required: false, arrayItem: {check: ['values', this.model.APP_ACTIONS, true]}}
    });

    return this._getApplicationInstance(application.id).then(appInstance => {
      // update editable fields fields
      let changes = 0;
      ['name', 'enabled', 'rights'].forEach(key => {
        if (Utils.hasValue(application[key])) {
          appInstance[key] = application[key];
          changes++;
        }
      });
      if (changes > 0) {
        return appInstance.save();
      } else {
        return appInstance;
      }
    }).then(appInstance => {
      // update groups
      if (groupInstances) {
        return this._setGroups(appInstance, groupInstances);
      } else {
        return appInstance;
      }
    });
  }

  /**
   * Get all applications (with groups).
   *
   * @returns {Bluebird<ApplicationInstance[]>}
   */
  getApplications() {
    return this.model.findAll({
      include: [Db.models.group]
    });
  }

}

module.exports = new ApplicationDAO();
