/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-07.
 */
'use strict';

// internal libs
const _ = require('lodash');

// external libs
const Promise = require('bluebird');

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();

// locals
const GremlinConnector = require('./gremlinConnector');

class JanusGraphConnector extends GremlinConnector {

  /**
   * @param {any} graphOptions   GraphDAO options
   * @param {any} [indexOptions] IndexDAO options (only if the type of the DAO is 'Index')
   * @constructor
   */
  constructor(graphOptions, indexOptions) {
    super(graphOptions, indexOptions, {
      manageTransactions: false,
      // JanusGraph 0.1.1 doesn't care about httpPathGremlinServer
      // The gremlin server of JanusGraph > 0.2.0 does
      httpPathGremlinServer: '/gremlin'
    });

    // only one of the twos can be defined
    /**@type {string}*/
    this._configurationPath = this.getGraphOption('configurationPath');
    /**@type {object}*/
    this._configuration = this.getGraphOption('configuration');
  }

  /**
   * Add definitions in the gremlin session and/or perform additional checks.
   *
   * @returns {Bluebird<void>}
   */
  $initGremlinSession() {
    let gremlinQuery;
    if (Utils.hasValue(this._configurationPath)) {
      gremlinQuery = `
          graph = JanusGraphFactory.open(${JSON.stringify(this._configurationPath)});
          g = graph.traversal();
          null
          `;
    } else {
      const configurationString =
        _.toPairs(this._configuration).map(
          kv => `.set(${JSON.stringify(kv[0])}, ${JSON.stringify(kv[1])})`
        ).join('');

      gremlinQuery = `
          graph = JanusGraphFactory.build()${configurationString}.open();
          g = graph.traversal();
          null
          `;
    }

    return this.$doGremlinQuery(gremlinQuery);
  }

  /**
   * Get the SemVer of the remote server.
   *
   * @returns {Bluebird<string>} resolved with the SemVer version of the remote server
   */
  $getVersion() {
    const q = 'inject(JanusGraph:JanusGraph.version())';
    return this.$doGremlinQuery(q).get('0').get('JanusGraph');
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
    let storeId;

    if (Utils.hasValue(this._configurationPath)) {
      storeId = this._configurationPath;
    } else {
      storeId = Utils.toJSON(this._configuration);
    }

    return Promise.resolve(storeId);
  }
}

module.exports = JanusGraphConnector;
