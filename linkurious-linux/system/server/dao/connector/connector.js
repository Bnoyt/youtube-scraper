/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-07-26.
 */
'use strict';

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();

class Connector {

  /**
   * Abstract Connector constructor
   *
   * Use `indexOptions` if this connector will be used only for IndexDAOs.
   * If used by a GraphDAO, `indexOptions` is not defined.
   *
   * @param {any} graphOptions   GraphDAO options
   * @param {any} [indexOptions] IndexDAO options (only if the type of the DAO is 'Index')
   * @constructor
   */
  constructor(graphOptions, indexOptions) {
    this._graphOptions = graphOptions;
    this._indexOptions = indexOptions;
  }

  /**
   * @type {number}
   */
  get CONNECT_TIMEOUT() {
    return 10000; // 10 seconds
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
   * Return an IndexDAO option by key (or a default value if undefined or null).
   *
   * @param {string} key            Option key
   * @param {any}    [defaultValue] Default value
   * @returns {any} the option value (or the default value if not set)
   */
  getIndexOption(key, defaultValue) {
    if (Utils.noValue(this._indexOptions)) {
      throw Errors.technical('bug', 'Don\'t call getIndexOption in a connector used for GraphDAOs');
    }

    const value = this._indexOptions[key];
    return Utils.hasValue(value) ? value : defaultValue;
  }

  /**
   * Connect to the remote server.
   *
   * @returns {Bluebird<string>} resolved with the SemVer version of the remote server
   */
  $connect() {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Disconnect from the remote server.
   *
   * Optional to implement.
   */
  $disconnect() {}

  /**
   * Check if the remote server is alive.
   *
   * @returns {Bluebird<void>}
   */
  $checkUp() {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Detect the current store ID.
   *
   * A store ID is the name of the current database (if the graph server is multi-tenant)
   * otherwise the vendor name.
   *
   * @returns {Bluebird<string>}
   */
  $getStoreId() {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Data that the connector will pass to the driver.
   *
   * @returns {Bluebird<any>}
   */
  $getConnectorData() {
    return Utils.NOT_IMPLEMENTED();
  }
}

module.exports = Connector;
