/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-10-09.
 */
'use strict';

// external libs
const Promise = require('bluebird');
const _ = require('lodash');

// locals
const Neo4jDriver = require('./neo4jDriver');

/**
 * From Neo4J 3.0.0 we can use the following procedures instead of an HTTP request:
 * - db.relationshipTypes
 * - db.labels
 * - db.propertyKeys
 */
class Neo4jDriver300 extends Neo4jDriver {

  /**
   * List all edgeTypes, nodeCategories, edgeProperties, nodeProperties
   * that exist in the graph database.
   *
   * @returns {Bluebird<{nodeCategories: string[], edgeTypes: string[], nodeProperties: string[], edgeProperties: string[]}>}
   */
  $getSimpleSchema() {
    return Promise.props({
      edgeTypes: this.$getEdgeTypes(),
      nodeCategories: this.connector.$doCypherQuery('CALL db.labels()'),
      nodeProperties: this.connector.$doCypherQuery('CALL db.propertyKeys()')
    }).then(response => {
      return {
        edgeTypes: response.edgeTypes,
        nodeCategories: _.map(response.nodeCategories.results, r => r.rows[0]),
        nodeProperties: _.map(response.nodeProperties.results, r => r.rows[0]),
        edgeProperties: _.map(response.nodeProperties.results, r => r.rows[0]) // same as nodeProperties
      };
    });
  }

  /**
   * List all edgeTypes that exist in the graph database.
   *
   * @returns {Bluebird<string[]>}
   */
  $getEdgeTypes() {
    return this.connector.$doCypherQuery('CALL db.relationshipTypes()').then(response => {
      return _.map(response.results, r => r.rows[0]);
    });
  }
}

module.exports = Neo4jDriver300;
