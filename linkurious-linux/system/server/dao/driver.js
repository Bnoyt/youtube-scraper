/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-05.
 */
'use strict';

// external libs
const Promise = require('bluebird');

// services
const LKE = require('../services');
const Utils = LKE.getUtils();

class Driver {

  /**
   * Abstract Driver constructor
   *
   * @param {Connector} connector     Connector used by the DAO
   * @param {any}       graphOptions  GraphDAO options
   * @param {any}       connectorData Data from the connector
   * @constructor
   */
  constructor(connector, graphOptions, connectorData) {
    this._connector = connector;
    this._graphOptions = graphOptions;
    this._connectorData = connectorData;
  }

  /**
   * Get the connector used by the DAO.
   *
   * @type {Connector}
   */
  get connector() {
    return this._connector;
  }

  /**
   * Return a Connector data by key (or a default value if undefined or null).
   *
   * @param {string} key            Option key
   * @param {any}    [defaultValue] Default value
   * @returns {any} the option value (or the default value if not set)
   */
  getConnectorData(key, defaultValue) {
    const value = this._connectorData[key];
    return Utils.hasValue(value) ? value : defaultValue;
  }

  /**
   * Set a GraphDAO option.
   *
   * @param {string} key   Option key
   * @param {any}    value Value to set
   */
  setGraphOption(key, value) {
    this._graphOptions[key] = value;
  }

  /**
   * Return a GraphDAO option by key (or a default value if undefined or null).
   *
   * @param {string} key            Option key
   * @param {any}    [defaultValue] Default value
   * @returns {any} the option value (or the default value if not set)
   */
  getGraphOption(key, defaultValue) {
    const value = this._graphOptions[key];
    return Utils.hasValue(value) ? value : defaultValue;
  }

  /**
   * Called at the end of the indexation phase for additional initializations.
   *
   * Optional to implement.
   *
   * @returns {Bluebird<void>}
   */
  $onAfterIndexation() {
    return Promise.resolve();
  }

  /**
   * Called at the end of the connect phase for additional initializations.
   *
   * Optional to implement.
   *
   * @returns {Bluebird<void>}
   */
  $onAfterConnect() {
    return Promise.resolve();
  }
}

module.exports = Driver;
