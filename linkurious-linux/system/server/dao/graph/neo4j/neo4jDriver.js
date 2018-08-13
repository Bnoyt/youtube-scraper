/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-10-09.
 */
'use strict';

// external libs
const Promise = require('bluebird');

// services
const LKE = require('../../../services');
const Errors = LKE.getErrors();

// locals
const CypherDriver = require('../cypherDriver');

class Neo4jDriver extends CypherDriver {

  /**
   * Get the connector used by the DAO.
   *
   * @type {Neo4jConnector}
   */
  get connector() {
    return this._connector;
  }

  /**
   * Check if the given edge ID is legal.
   *
   * Coding/decoding is used when the edge ID is not originally a string or a number.
   * An encoded edge ID is an ID for Linkurious (ID in input).
   * A decoded edge ID is an ID for the graph database (ID in output).
   *
   * @param {string} key
   * @param {string} id
   * @returns {any} The ID of the edge (encoded or not)
   * @throws {LkError} if the ID is not valid
   */
  $checkEdgeId(key, id) {
    if (/^\d+$/.test(id)) {
      return id;
    }

    throw Errors.business('invalid_parameter', '"' + key + '" must be a positive integer.');
  }

  /**
   * Check if the given node ID is legal.
   *
   * Coding/decoding is used when the node ID is not originally a string or a number.
   * An encoded node ID is an ID for Linkurious (ID in input).
   * A decoded node ID is an ID for the graph database (ID in output).
   *
   * @param {string} key
   * @param {string} id
   * @returns {any} the ID of the node (encoded or not)
   * @throws {LkError} if the ID is not valid
   */
  $checkNodeId(key, id) {
    if (/^\d+$/.test(id)) {
      return id;
    }

    throw Errors.business('invalid_parameter', '"' + key + '" must be a positive integer.');
  }

  /**
   * Count the number of nodes.
   *
   * @param {boolean} [approx] Allow an approximated answer
   * @returns {Bluebird<number>}
   */
  $getNodeCount(approx) {
    if (approx) {
      return this.connector.$queryJmx(
        'org.neo4j', 'instance=kernel#0,name=Primitive count', 'NumberOfNodeIdsInUse'
      );
    }

    return this.connector.$doCypherQuery('MATCH (n) RETURN count(n)').then(response => {
      return response.results[0].rows[0];
    });
  }

  /**
   * Count the number of edges.
   *
   * @param {boolean} [approx] Allow an approximated answer
   * @returns {Bluebird<number>}
   */
  $getEdgeCount(approx) {
    if (approx) {
      return this.connector.$queryJmx(
        'org.neo4j', 'instance=kernel#0,name=Primitive count', 'NumberOfRelationshipIdsInUse'
      );
    }

    return this.connector.$doCypherQuery('MATCH ()-->() RETURN COUNT(*)').then(response => {
      return response.results[0].rows[0];
    });
  }

  /**
   * List all edgeTypes, nodeCategories, edgeProperties, nodeProperties
   * that exist in the graph database.
   *
   * @returns {Bluebird<{nodeCategories: string[], edgeTypes: string[], nodeProperties: string[], edgeProperties: string[]}>}
   */
  $getSimpleSchema() {
    return Promise.props({
      edgeTypes: this.$getEdgeTypes(),
      nodeCategories: this.connector.$doHTTPGetRequest('/db/data/labels'),
      nodeProperties: this.connector.$doHTTPGetRequest('/db/data/propertykeys'),
      edgeProperties: null
    }).then(r => {
      r.edgeProperties = r.nodeProperties;
      return r;
    });
  }

  /**
   * List all edgeTypes that exist in the graph database.
   *
   * @returns {Bluebird<string[]>}
   */
  $getEdgeTypes() {
    return this.connector.$doHTTPGetRequest('/db/data/relationship/types');
  }

  /**
   * Called at the end of the connect phase for additional initializations.
   *
   * @returns {Bluebird<void>}
   */
  $onAfterConnect() {
    // TODO #933 check that alternative IDs are actually properties that exist in the graph
    // TODO #933 check if HA is enabled and warn is writeURL is not set
    return Promise.resolve();
  }
}

module.exports = Neo4jDriver;
