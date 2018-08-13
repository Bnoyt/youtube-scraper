/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-10-09.
 */
'use strict';

/* eslint no-unused-vars: 0 */ // abstract methods

// external libs
const Promise = require('bluebird');

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();

// locals
const Connector = require('./connector');

class CypherConnector extends Connector {

  /**
   * Execute a cypher query on Neo4j.
   *
   * Note that this function is not meant for user queries.
   * We don't enforce a limit or check if the query contains write statements.
   * Use $safeCypherQueryStream instead.
   *
   * @param {string}  query        The graph query
   * @param {object}  [parameters] The graph query parameters
   * @param {boolean} [canWrite]   Whether the query is allowed to alter the data
   * @param {boolean} [ignoreSlow] Don't log slow requests
   * @returns {Bluebird<{keys: string[], results: Array<{nodes: LkNode[], edges: LkEdge[], rows: any[]}>}>}
   */
  $doCypherQuery(query, parameters, canWrite, ignoreSlow) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Execute a cypher query on Neo4j and return a stream as a result.
   * The query is checked to be read-only if `canWrite` is false and to always return.
   * If `limit` is defined, the limit of the Cypher query is modified to not be higher
   * than `limit`.
   *
   * @param {string}  query        The graph query
   * @param {object}  [parameters] The graph query parameters
   * @param {boolean} [canWrite]   Whether the query is allowed to alter the data
   * @param {number}  [limit]      Maximum number of matched subgraphs
   * @returns {Bluebird<{keys: string[], results: Readable<{nodes: LkNode[], edges: LkEdge[], rows: any[]}>}>}
   */
  $safeCypherQueryStream(query, parameters, canWrite, limit) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Check if the remote server is alive.
   *
   * @returns {Bluebird<void>}
   */
  $checkUp() {
    return this.$doCypherQuery('RETURN 0').return(); // any no-op would be ok
  }

  /**
   * Data that the connector will pass to the driver.
   *
   * @returns {Bluebird<any>}
   */
  $getConnectorData() {
    return Promise.resolve({});
  }
}

module.exports = CypherConnector;
