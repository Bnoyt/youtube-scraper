/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-07-26.
 */
'use strict';

/* eslint no-unused-vars: 0 */ // abstract methods

// external libs
const Promise = require('bluebird');

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();

// locals
const Driver = require('../driver');

class IndexDriver extends Driver {

  /**
   * Abstract Index Driver constructor
   *
   * @param {Connector} connector     Connector used by the DAO
   * @param {GraphDAO}  graphDAO      The connected Graph DAO
   * @param {any}       indexOptions  IndexDAO options
   * @param {any}       connectorData Data from the connector
   * @constructor
   */
  constructor(connector, graphDAO, indexOptions, connectorData) {
    super(connector, graphDAO.options, connectorData);
    this._connector = connector;
    this._graphDAO = graphDAO;
    this._indexOptions = indexOptions;
    this._connectorData = connectorData;
  }

  /**
   * Get the GraphDAO.
   *
   * @type {GraphDAO}
   */
  get graphDAO() {
    return this._graphDAO;
  }

  /**
   * Return an IndexDAO option by key (or a default value if undefined or null).
   *
   * @param {string} key            Option key
   * @param {any}    [defaultValue] Default value
   * @returns {any} the option value (or the default value if not set)
   */
  getIndexOption(key, defaultValue) {
    const value = this._indexOptions[key];
    return Utils.hasValue(value) ? value : defaultValue;
  }

  /**
   * Set an IndexDAO option.
   *
   * @param {string} key   Option key
   * @param {any}    value Value to set
   */
  setIndexOption(key, value) {
    this._indexOptions[key] = value;
  }

  /**
   * Get the number of nodes or edges in the search index.
   *
   * Implement only if features.canCount is true.
   *
   * @param {string} type 'node' or 'edge'
   * @returns {Bluebird<number>}
   */
  $getSize(type) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Index nodes or edges.
   *
   * Implement only if features.external is false.
   * Support edge entries only if features.canIndexEdges is true.
   *
   * @param {string}              type    'node' or 'edge'
   * @param {LkNode[] | LkEdge[]} entries Entries to add
   * @returns {Bluebird<void>}
   */
  $addEntries(type, entries) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Search for nodes or edges using `searchString`.
   * Search results are grouped by categories or types.
   *
   * If `options.idOnly` is true, highlighting and grouping are disabled and `results` is a string[].
   *
   * Some DAOs can't compute `totalHits` cheaply. As an alternative, `moreResults` is returned.
   * Which one is returned is defined by features.searchHitsCount.
   *
   * Support an eventual advanced query dialect if features.advancedQueryDialect is defined.
   * Detecting if it's an advanced query or a text query is up to the implementation.
   *
   * Support options.fuzziness only if features.fuzzy is true.
   *
   * Support edge entries only if features.canIndexEdges is true.
   *
   * Match the search query on categories fields only if features.canIndexCategories is true.
   *
   * @param {string} type         'node' or 'edge'
   * @param {string} searchString Query that will be forwarded to the index. It may be either
   *                              plain text or formatted in a supported query language
   * @param {LkSearchOptions}     options
   * @returns {Bluebird<LkSearchResponse>}
   */
  $search(type, searchString, options) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Get a detailed schema from the index.
   *
   * Re-implement only if features.schema is defined. By default the simple schema from the GraphDAO is used.
   * Support 'properties' in the response only if features.schema.properties is true.
   * Support 'count' (for both categories and properties) in the response only if features.schema.counts is true.
   * Support inferred node categories only if features.schema.inferred is true.
   *
   * @param {string}  type           'node' or 'edge'
   * @param {boolean} withProperties Whether to include properties
   * @returns {Bluebird<{name: string, count?: number, properties?: {key: string, count?: number}[]}[]>}
   */
  $getSchema(type, withProperties) {
    return this.graphDAO.getSimpleSchema().then(simpleR => {
      const types = type === 'node' ? simpleR.nodeCategories : simpleR.edgeTypes;

      let properties = undefined;
      if (withProperties) {
        // By default (if features.schema is not defined), every property is assigned to every node category/edge type
        properties = (type === 'node' ? simpleR.nodeProperties : simpleR.edgeProperties).map(
          property => ({key: property})
        );
      }

      return types.map(type => ({name: type, properties: properties}));
    });
  }

  /**
   * Delete the index if it exists.
   *
   * Implement only if features.external is false.
   *
   * @returns {Bluebird<boolean>} true if an index was deleted
   */
  $deleteIfExists() {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Create the index.
   *
   * Implement only if features.external is false.
   *
   * @returns {Bluebird<void>}
   */
  $createIndex() {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Commit the changes to the Index server.
   *
   * Implement only if features.external is false.
   *
   * @returns {Bluebird<void>}
   */
  $commit() {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Index an entry if it doesn't exist or update it if it does.
   *
   * Implement only if features.external is false.
   * Support edge entries only if features.canIndexEdges is true.
   * Return a version number for the entry only if features.versions is true, otherwise return 1.
   *
   * @param {string}          type  'node' or 'edge'
   * @param {LkNode | LkEdge} entry Entries to add
   * @returns {Bluebird<number>} the version of the entry
   */
  $upsertEntry(type, entry) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Delete an entry.
   *
   * Implement only if features.external is false.
   * Support edge entries only if features.canIndexEdges is true.
   *
   * @param {string}  id               ID of the entry to delete
   * @param {string}  type             'node' or 'edge'
   * @param {boolean} [ignoreNotFound] Whether to resolve if the entry to delete was not found
   * @returns {Bluebird<void>}
   */
  $deleteEntry(id, type, ignoreNotFound) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Return an object with the IDs as keys and the versions of the entries as values.
   *
   * Implement only if features.versions is true.
   * Support edge entries only if features.canIndexEdges is true.
   *
   * @param {string}   type 'node' or 'edge'
   * @param {string[]} ids
   * @returns {Bluebird<object>}
   */
  $getItemVersions(type, ids) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Get the type of the properties of nodes and edges.
   * Return an object with the property names as keys and the type of those properties as values.
   *
   * Possible returned type values are:
   * - string
   * - integer
   * - float
   * - boolean
   * - date
   *
   * Implement only if features.typing is true.
   *
   * @param {string} type 'node' or 'edge'
   * @returns {Bluebird<object>}
   */
  $getPropertyTypes(type) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Run the indexation of the external index.
   *
   * Implement only if features.external is true.
   * Optional to implement.
   *
   * @param {Progress} progress Instance used to keep track of the progress
   * @returns {Bluebird<void>}
   */
  $indexSource(progress) {
    return Promise.resolve();
  }
}

module.exports = IndexDriver;
