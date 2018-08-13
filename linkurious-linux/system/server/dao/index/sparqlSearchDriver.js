/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-08-21.
 */
'use strict';

/* eslint no-unused-vars: 0 */ // abstract methods

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();
const Log = LKE.getLogger(__filename);

// locals
const IndexDriver = require('./indexDriver');
const SparqlUtils = require('../utils/sparqlUtils');
const DaoUtils = require('../utils/daoUtils');

// timeout after which $getSchema will give up
const GET_SCHEMA_TIMEOUT = 10000; // 10 seconds

// max number of distinct categories returned by $getSchema
const SCHEMA_CATEGORY_LIMIT = 200;

// 50 statements per search query
const SEARCH_STATEMENTS_LIMIT = 50;

class SparqlSearchDriver extends IndexDriver {

  constructor(connector, graphDAO, indexOptions, connectorData) {
    super(connector, graphDAO, indexOptions, connectorData);

    // each driver is responsible to validate its connectorData (also done in SparqlDriver)
    Utils.check.properties('connectorData', connectorData, {
      prefixToURI: {required: true, check: (k, prefixToURI) => {
        prefixToURI.forEach((value, key) => {
          Utils.check.string(k + '[' + key + ']', value, true);
        });
      }},
      categoryPredicate: {required: true, check: 'nonEmpty'},
      defaultNamespace: {required: true, check: 'nonEmpty'}
    });

    this._utils = new SparqlUtils(
      connectorData.prefixToURI,
      connectorData.defaultNamespace,
      connectorData.categoryPredicate,
      this.getGraphOption('idPropertyName')
    );

    this._categoryPredicate = connectorData.categoryPredicate;
  }

  /**
   * @type {SparqlConnector}
   */
  get connector() {
    return super.connector;
  }

  /**
   * Search for statements matching `searchString`.
   *
   * @param {string} searchString String to search (can be just text or written in `advancedQueryDialect`)
   * @param {number} limit        Maximum number of statements we want to receive (for pagination)
   * @param {number} offset       Offset of the first result (for pagination)
   * @param {number} fuzziness    Acceptable normalized edit similarity among the query and the result
   * @returns {Bluebird<string[][]>}
   */
  $doTextQuery(searchString, limit, offset, fuzziness) {
    return Utils.NOT_IMPLEMENTED();
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
    // nodes retrieved are sorted by importance with the statement on which it matched the query
    /**@type {LkNode[]}*/
    const foundNodes = [];

    const nodesSeen = new Set(); // Set of LkNodes ids to avoid duplicates

    let totalObjToSkip = options.from; // variable used as a count down
    let currentPage = 0;

    let moreResults = true;

    const retrieveMoreNodes = () => {
      // 1) Do a paginated search query
      return this.$doTextQuery(
        searchString,
        SEARCH_STATEMENTS_LIMIT,
        SEARCH_STATEMENTS_LIMIT * currentPage,
        options.fuzziness
      ).then(statements => {
        if (statements.length === 0) {
          moreResults = false;
          return;
        }

        /**@type {Map<string, string[]>}*/ // statements indexed by their sources
        const statementsByNodeId = new Map();

        // `statements` may contain edges and/or statements with the same node id
        // 2) Filter unwanted statements away
        _.forEach(statements, statement => {
          // if the statement is not an edge and the node id was never seen
          if (!this._utils.statementIsAnEdge(statement) && !nodesSeen.has(statement[0])) {
            nodesSeen.add(statement[0]);
            statementsByNodeId.set(statement[0], statement);
          }
        });

        const idsToRetrieve = Array.from(statementsByNodeId.keys());

        // Each statement now represent an incomplete node that we have to ask to the triple store
        // 3) Retrieve the nodes and save them along with the statement that matched the FTI query
        return this.graphDAO.driver.$getNodesByID(
          {ids: idsToRetrieve, edges: 'none'}
        ).then(nodes => {
          _.forEach(nodes, node => {
            // 4) Ensure `options.size`
            if (foundNodes.length >= options.size) {
              return;
            }

            // 5) enforce `options.categoriesOrTypes`
            if (Utils.hasValue(options.categoriesOrTypes)) {
              // the '[no_category]' category indicates a node with no category, so:
              // if node has a category or `categoriesOrTypes` doesn't include the '[no_category]' category
              if (node.categories.length !== 0 ||
                !options.categoriesOrTypes.includes(DaoUtils.LABEL_NODES_WITH_NO_CATEGORY)) {
                // if node doesn't have any of the categories in `categoriesOrTypes`
                if (!_.some(options.categoriesOrTypes,
                  category => node.categories.includes(category))) {
                  // we skip the node
                  return;
                }
              }

            }

            // 6) enforce `options.filter`
            if (Utils.hasValue(options.filter)) {
              for (let i = 0; i < options.filter.length; ++i) {
                // we apply case insensitive strict filtering
                const filterKey = options.filter[i][0];
                const filterValue = options.filter[i][1].toLowerCase();
                const testValue = ('' + node.data[filterKey]).toLowerCase(); // node.data[filterKey] is coerced to a string
                // if the filter is not contained case insensitively in the property value
                if (testValue.indexOf(filterValue) === -1) {
                  // we skip the node
                  return;
                }
              }
            }

            // 7) Ensure `options.from` (unfortunately it can only be done here after the filtering)
            if (totalObjToSkip > 0) {
              totalObjToSkip--;
              return;
            }

            foundNodes.push(node);
          });
        });
      }).catch(error => {
        Log.warn('fallback to no more results in case of malformed query/other errors', error);
        moreResults = false;
      });
    };

    const loopPromise = () => {
      if (moreResults && foundNodes.length < options.size) {
        return retrieveMoreNodes().then(() => {
          currentPage++;
          return loopPromise();
        });
      }
      return Promise.resolve();
    };

    return loopPromise().then(() => {
      return DaoUtils.buildSearchResponse(type, foundNodes, moreResults, searchString, options);
    });
  }
}

module.exports = SparqlSearchDriver;
