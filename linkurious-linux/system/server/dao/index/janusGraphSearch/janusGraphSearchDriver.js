/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-01.
 */
'use strict';

// external libs
const _ = require('lodash');

// services
const LKE = require('../../../services');
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();

// locals
const GremlinSearchDriver = require('../gremlinSearchDriver');
const DaoUtils = require('../../utils/daoUtils');
const GremlinUtils = require('../../utils/gremlinUtils');

class JanusGraphSearchDriver extends GremlinSearchDriver {

  /**
   * @param {Connector} connector     Connector used by the DAO
   * @param {GraphDAO}  graphDAO      The connected Graph DAO
   * @param {any}       indexOptions  IndexDAO options
   * @param {any}       connectorData Data from the connector
   * @constructor
   */
  constructor(connector, graphDAO, indexOptions, connectorData) {
    super(connector, graphDAO, indexOptions, connectorData);
  }

  /**
   * Add definitions in the gremlin session and/or perform additional checks.
   *
   * @returns {Bluebird<void>}
   */
  $customInitGremlinSession() {
    const query = `
      class JanusSearchIterable {
        def it;
        
        JanusSearchIterable(_it) {
          it = _it.iterator();
        }
        
        def hasNext() {
          return it.hasNext();
        }
        
        def next() {
          return it.next().getElement();
        }
      }
    `;

    return this.connector.$doGremlinQuery(query).return();
  }

  /**
   * Build the query for $search.
   *
   * @param {string} type         'node' or 'edge'
   * @param {string} searchString Query that will be forwarded to the index. It may be either
   *                              plain text or formatted in a supported query language
   * @param {LkSearchOptions}     options
   * @returns {string}
   */
  $buildSearchQuery(type, searchString, options) {
    // escape the searchString and apply the fuzziness
    const searchQuery = DaoUtils.generateBasicLuceneFuzzyQuery(
      searchString, options.fuzziness !== 1
    );

    let sFilters;

    if (Utils.hasValue(options.filter)) {
      sFilters = GremlinUtils.quote(options.filter);
    } else {
      sFilters = 'null';
    }

    let sCategories;

    if (Utils.hasValue(options.categoriesOrTypes)) {
      sCategories = GremlinUtils.quote(
        _.filter(options.categoriesOrTypes, c => c !== DaoUtils.LABEL_NODES_WITH_NO_CATEGORY)
      );
    } else {
      sCategories = 'null';
    }

    return `
      queries = [
        new JanusSearchIterable(graph.indexQuery(${JSON.stringify(this._indexName)},
         "v.*:${searchQuery}").vertices())
      ];
      
      search(queries, ${options.from}, ${options.size}, ${sFilters}, ${sCategories});
    `;
  }

  /**
   * Resolve if there exist indices for search.
   *
   * @returns {Bluebird<void>}
   */
  $checkSearchIndices() {
    const isESQuery = `
      mgmt = graph.openManagement();
      mgmt.get('index.search.backend');
    `;

    return this.connector.$doGremlinQuery(isESQuery).then(r => {
      if (r[0] !== 'elasticsearch') {
        return Errors.business(
          'source_action_needed',
          '"index.search.backend" must be set to "elasticsearch".',
          true
        );
      }
    }).then(() => {
      const indexExistsQuery = `
        mgmt = graph.openManagement();
        for (index in mgmt.getGraphIndexes(Vertex.class)) {
          if (index.isMixedIndex() && index.getBackingIndex() == 'search') {
            return index.name();
          }
        }
      `;

      return this.connector.$doGremlinQuery(indexExistsQuery);
    }).get('0').then(indexName => {
      if (Utils.noValue(indexName) && !this.getIndexOption('disableIndexExistCheck')) {
        return Errors.business('source_action_needed',
          'No mixed index found in JanusGraph.', true);
      }

      this._indexName = indexName;
    });
  }
}

module.exports = JanusGraphSearchDriver;
