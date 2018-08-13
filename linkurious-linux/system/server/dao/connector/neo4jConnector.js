/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-10-09.
 */
'use strict';

/* eslint no-unused-vars: 0 */ // abstract methods

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();
const Log = LKE.getLogger(__filename);

// locals
const CypherConnector = require('./cypherConnector');

class Neo4jConnector extends CypherConnector {

  /**
   * @param {any} graphOptions   GraphDAO options
   * @param {any} [indexOptions] IndexDAO options (only if the type of the DAO is 'Index')
   * @constructor
   */
  constructor(graphOptions, indexOptions) {
    super(graphOptions, indexOptions);

    const envUser = process.env['LINKURIOUS_NEO4J_USER'];
    const envPassword = process.env['LINKURIOUS_NEO4J_PASSWORD'];
    if (Utils.hasValue(envUser) && Utils.hasValue(envPassword) &&
      Utils.noValue(graphOptions.user) && Utils.noValue(graphOptions.password)
    ) {
      Log.info('Using Neo4j credentials from environment variables.');
      graphOptions.user = envUser;
      graphOptions.password = envPassword;
    }
  }

  /**
   * Do an HTTP POST request toward Neo4j.
   *
   * Used to create a case insensitive Neo4j search index.
   *
   * @param {string}   url
   * @param {any}      parameters
   * @param {number[]} expectedStatusCode
   * @returns {Bluebird<IncomingMessage>}
   */
  $doHTTPPostRequest(url, parameters, expectedStatusCode) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Do an HTTP GET request toward Neo4j. Return the body of the response directly.
   *
   * Used to retrieve the simple schema before procedures were introduced.
   *
   * @param {string} url
   * @returns {Bluebird<any>}
   */
  $doHTTPGetRequest(url) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Query JMX management data of Neo4j by domain, name and key.
   *
   * @param {string} domain
   * @param {string} name
   * @param {string} [key]
   * @returns {Bluebird<any>}
   */
  $queryJmx(domain, name, key) {
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
    return this.$queryJmx('org.neo4j', 'instance=kernel#0,name=Kernel', 'StoreId');
  }
}

module.exports = Neo4jConnector;
