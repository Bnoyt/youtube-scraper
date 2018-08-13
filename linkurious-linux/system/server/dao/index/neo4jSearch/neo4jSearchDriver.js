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

// services
const LKE = require('../../../services');
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const Log = LKE.getLogger(__filename);

// locals
const IndexDriver = require('../indexDriver');
const CypherUtils = require('../../utils/cypherUtils');
const DaoUtils = require('../../utils/daoUtils');

const NODE_AUTO_INDEX_CONFIG = {
  'name': 'node_auto_index',
  'config': {
    'type': 'fulltext',
    'provider': 'lucene',
    'to_lower_case': 'true'
  }
};

const RELATIONSHIP_AUTO_INDEX_CONFIG = {
  'name': 'relationship_auto_index',
  'config': {
    'type': 'fulltext',
    'provider': 'lucene',
    'to_lower_case': 'true'
  }
};

const DEFAULT_BATCH_SIZE = 100000;
const DEFAULT_NUMBER_OF_THREADS = 4;

class Neo4jSearchDriver extends IndexDriver {

  /**
   * @param {Connector} connector     Connector used by the DAO
   * @param {GraphDAO}  graphDAO      The connected Graph DAO
   * @param {any}       indexOptions  IndexDAO options
   * @param {any}       connectorData Data from the connector
   * @constructor
   */
  constructor(connector, graphDAO, indexOptions, connectorData) {
    super(connector, graphDAO, indexOptions, connectorData);

    this._batchSize = this.getIndexOption('batchSize', DEFAULT_BATCH_SIZE);
    this._numberOfThreads = this.getIndexOption('numberOfThreads', DEFAULT_NUMBER_OF_THREADS);
    this._initialization = this.getIndexOption('initialization', true);
    this._initialOffsetNodes = this.getIndexOption('initialOffsetNodes', 0);
    this._initialOffsetEdges = this.getIndexOption('initialOffsetEdges', 0);
  }

  /**
   * Get the connector used by the DAO.
   *
   * @type {Neo4jConnector}
   */
  get connector() {
    return this._connector;
  }

  /**
   * Build the query for $search.
   *
   * @param {string} type         'node' or 'edge'
   * @param {string} searchString Query that will be forwarded to the index. It has to be a fielded lucene query
   * @param {LkSearchOptions}     options
   * @returns {string}
   */
  $buildSearchQuery(type, searchString, options) {
    const sProcedure = type === 'node'
      ? 'START i=node:node_auto_index'
      : 'START i=relationship:relationship_auto_index';

    const whereClauses = [];

    if (Utils.hasValue(options.categoriesOrTypes)) {
      if (type === 'node') {
        // we remove the special LABEL_NODES_WITH_NO_CATEGORY case
        const readableCategories = _.filter(options.categoriesOrTypes,
          c => c !== DaoUtils.LABEL_NODES_WITH_NO_CATEGORY);

        let categoryClause = 'ANY (l in labels(i) WHERE l in ' +
          CypherUtils.encodeValue(readableCategories) + ')';
        // if we can read nodes with no categories
        if (options.categoriesOrTypes.includes(DaoUtils.LABEL_NODES_WITH_NO_CATEGORY)) {
          categoryClause += ' OR size(labels(i)) = 0';
        }
        whereClauses.push(categoryClause);
      } else {
        const readableTypes = options.categoriesOrTypes;

        whereClauses.push(`type(i) in ${CypherUtils.encodeValue(readableTypes)}`);
      }
    }

    if (Utils.hasValue(options.filter)) {
      for (let i = 0; i < options.filter.length; i++) {
        const filter = options.filter[i];
        whereClauses.push(
          `toLower(i.${CypherUtils.encodeName(filter[0])}) ` +
          `CONTAINS toLower(${CypherUtils.encodeValue(filter[1])})`
        );
      }
    }

    let sWhere = '';
    if (whereClauses.length > 0) {
      sWhere += `WHERE (${whereClauses.join(') AND (')}) `;
    }

    return `${sProcedure}(${CypherUtils.encodeValue(searchString)}) ` +
      'WITH i ' +
      sWhere +
      `RETURN i SKIP ${options.from} LIMIT ${options.size}`;
  }

  /**
   * Search for nodes or edges using `searchString`.
   * Search results are grouped by categories or types.
   *
   * If `options.idOnly` is true, highlighting and grouping are disabled and `results` is a string[].
   *
   * @param {string} type         'node' or 'edge'
   * @param {string} searchString Query that will be forwarded to the index. It may be either
   *                              plain text or formatted in a supported query language
   * @param {LkSearchOptions}     options
   * @returns {Bluebird<LkSearchResponse>}
   */
  $search(type, searchString, options) {
    // if edge indexation is not enabled and we search for an edge we silently fail
    if (type === 'edge' && !this.edgeIndexation) {
      return Promise.resolve({type: type, moreResults: false, results: []});
    }

    options.size++; // we ask one extra item to see if there are more results

    let query = this.$buildSearchQuery(type, searchString, options);
    // first we test it as it is, in case it's already in lucene syntax
    return this.connector.$doCypherQuery(query).catch(() => {
      // we silently ignore any error
      // it's not an advanced search query, so we will try to build it

      // we need to apply the search query to every indexed property
      const properties = type === 'node'
        ? this.indexedNodePropertyKeys
        : this.indexedEdgePropertyKeys;

      const luceneQuery = DaoUtils.generateFieldedLuceneFuzzyQuery(
        searchString, properties, options.fuzziness, {minLengthPrefix: 2}
      );

      query = this.$buildSearchQuery(type, luceneQuery, options);

      return this.connector.$doCypherQuery(query);
    }).then(response => {
      let items;
      if (type === 'node') {
        items = _.map(response.results, record => record.nodes[0]);
      } else {
        items = _.map(response.results, record => record.edges[0]);
      }

      const moreResults = items.length === options.size;
      if (moreResults) {
        // remove the last node, used to check if there were more nodes to ask
        items.splice(-1, 1);
      }

      return DaoUtils.buildSearchResponse(type, items, moreResults, searchString, options);
    });
  }

  /**
   * Parse a string representing an array of strings from the Neo4j configuration file.
   * The way the array is represented varies from one Neo4j version to another.
   * This function is designed to work over multiple versions.
   *
   * @param {string} fieldName
   * @param {string} [indexedProperties]
   * @returns {string[]}
   * @throws {LkError} if indexedProperties is not defined
   */
  $parseIndexedPropertyList(fieldName, indexedProperties) {
    // if null, undefined, empty string
    if (!indexedProperties || indexedProperties === '[]') {
      throw Errors.business(
        'source_action_needed',
        '"' + fieldName + '" must be a non-empty comma separated list of property keys.'
      );
    }

    indexedProperties = indexedProperties.trim();
    if (indexedProperties.startsWith('[') && indexedProperties.endsWith(']')) {
      indexedProperties = indexedProperties.slice(1, -1);
    }

    return indexedProperties.split(',').map(indexedProperty => indexedProperty.trim());
  }

  /**
   * Called at the end of the connect phase for additional initializations.
   *
   * @returns {Bluebird<void>}
   */
  $onAfterConnect() {
    return this.connector.$queryJmx(
      'org.neo4j', 'instance=kernel#0,name=Configuration'
    ).then(configuration => {
      const autoIndexNode = configuration['node_auto_indexing'];
      const autoIndexEdges = configuration['relationship_auto_indexing'];

      if (autoIndexNode !== 'true') {
        return Errors.business(
          'source_action_needed',
          '"dbms.auto_index.nodes.enabled" must be set to "true".',
          true
        );
      }

      this.indexedNodePropertyKeys = this.$parseIndexedPropertyList(
        'dbms.auto_index.nodes.keys',
        configuration['node_keys_indexable']
      );

      this.edgeIndexation = autoIndexEdges === 'true';

      if (this.edgeIndexation) {
        this.indexedEdgePropertyKeys = this.$parseIndexedPropertyList(
          'dbms.auto_index.relationships.keys',
          configuration['relationship_keys_indexable']
        );
      } else {
        this.setIndexOption('skipEdgeIndexation', true);
      }
    });
  }

  /**
   *
   * @param {string} type   'node' or 'edge'
   * @param {number} offset
   * @returns {string}
   * @private
   */
  _generateIndexQuery(type, offset) {
    let query = type === 'node' ? 'MATCH (p) ' : 'MATCH ()-[p]->() ';
    const properties = type === 'node'
      ? this.indexedNodePropertyKeys
      : this.indexedEdgePropertyKeys;

    query += `WITH p SKIP ${offset} LIMIT ${this._batchSize} `;

    for (let i = 0; i < properties.length; i++) {
      const propertyKeyS = 'p.' + CypherUtils.encodeName(properties[i]);
      query += `SET ${propertyKeyS} = ${propertyKeyS} `;
    }

    query += 'RETURN count(p)';

    return query;
  }

  /**
   * @param {string}   type     'node' or 'edge'
   * @param {Progress} progress Instance used to keep track of the progress
   * @returns {Bluebird<void>}
   * @private
   */
  _indexSource(type, progress) {
    let count = type === 'node' ? this._initialOffsetNodes : this._initialOffsetEdges;
    progress.setInitialOffset(type, count);

    let hasMore = true;

    const loop = () => {
      if (!hasMore) { return Promise.resolve(); }

      Log.info(`Last indexed ${type} is at offset ${count} ` +
        `(all ${type}s before this one are indexed)`);

      const queries = [];
      for (let i = 0; i < this._numberOfThreads; i++) {
        queries.push(this._generateIndexQuery(type, count + this._batchSize * i));
      }

      return Promise.map(queries, query => {

        return Utils.retryPromise(
          `Index batch of ${type}s in Neo4j`,
          () => this.connector.$doCypherQuery(query, undefined, true, true),
          {delay: 3000, retries: 5}
        ).then(countR => {
          const indexedItems = countR.results[0].rows[0];
          if (indexedItems === 0) {
            hasMore = false;
          } else {
            count += indexedItems;
            progress.add(type, indexedItems);
          }
        });
      }, {concurrency: this._numberOfThreads}).then(loop);
    };

    return loop();
  }

  /**
   * Run the indexation of the external index.
   *
   * @param {Progress} progress Instance used to keep track of the progress
   * @returns {Bluebird<void>}
   */
  $indexSource(progress) {
    if (!this._initialization) {
      return Promise.resolve();
    }

    Log.info('Creating "node_auto_index" index in Neo4j');
    return this.connector.$doHTTPPostRequest(
      '/db/data/index/node/', NODE_AUTO_INDEX_CONFIG, [201, 400]
    ).then(response => {
      if (response.statusCode === 400) {
        return Errors.business(
          'source_action_needed',
          'The index node_auto_index can\'t be overwritten to be lower case: ' +
          response.body.message, true);
      }

      if (this.edgeIndexation) {
        Log.info('Creating "relationship_auto_index" index in Neo4j');
        return this.connector.$doHTTPPostRequest(
          '/db/data/index/relationship/', RELATIONSHIP_AUTO_INDEX_CONFIG, [201, 400]
        ).then(response => {
          if (response.statusCode === 400) {
            return Errors.business(
              'source_action_needed',
              'The index relationship_auto_index can\'t be overwritten to be lower case: ' +
              response.body.message, true);
          }
        });
      }
    }).then(() => {
      Log.info('Indexing nodes in Neo4j');
      return this._indexSource('node', progress);
    }).then(() => {
      if (this.edgeIndexation) {
        Log.info('Indexing edges in Neo4j');
        return this._indexSource('edge', progress);
      }
    });
  }
}

module.exports = Neo4jSearchDriver;
