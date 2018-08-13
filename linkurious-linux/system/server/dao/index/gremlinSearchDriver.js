/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-01.
 */
'use strict';

/* eslint no-unused-vars: 0 */ // abstract methods

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();

// locals
const IndexDriver = require('./indexDriver');
const DaoUtils = require('../utils/daoUtils');

class GremlinSearchDriver extends IndexDriver {

  /**
   * Get the connector used by the DAO.
   *
   * @type {GremlinConnector}
   */
  get connector() {
    return this._connector;
  }

  /**
   * Add definitions in the gremlin session and/or perform additional checks.
   *
   * @returns {Bluebird<void>}
   */
  _initGremlinSession() {
    const query = `
      def search(queries, from, size, filters, categories) {
        paginatedResults = [];
        currentQuery = null;

        dedupe = [].toSet();

        while (queries.size > 0 && paginatedResults.size < size) {
          currentQuery = queries.pop();

          while (currentQuery.hasNext() && paginatedResults.size < size) {
            currentItem = currentQuery.next();

            if (filters != null) {
              skipItem = false;
              for (filter in filters) {
                testProperty = currentItem.property(filter[0]);
                testValue = '';
                if (testProperty.isPresent()) {
                  testValue = '' + testProperty.value();
                }

                if (!testValue.toLowerCase().contains(('' + filter[1]).toLowerCase())) {
                  skipItem = true;
                  break;
                }
              }
              if (skipItem) { continue; }
            }

            if (categories != null) {
              skipItem = true;
              for (category in categories) {
                if (currentItem.label() == category) {
                  skipItem = false;
                  break;
                }
              }
              if (skipItem) { continue; }
            }

            if (dedupe.add(currentItem.id())) {
              if (from-- > 0) {
                continue;
              }

              paginatedResults.push(currentItem);
            }
          }
        }

        moreResults = queries.size > 0 || (currentQuery != null && currentQuery.hasNext());

        return [moreResults, paginatedResults];
      }
    `;

    return this.connector.$doGremlinQuery(query).return();
  }

  /**
   * Add definitions in the gremlin session and/or perform additional checks.
   *
   * Optional to implement.
   *
   * @returns {Bluebird<void>}
   */
  $customInitGremlinSession() {
    return Promise.resolve();
  }

  /**
   * Called at the end of the connect phase for additional initializations.
   *
   * @returns {Bluebird<void>}
   */
  $onAfterConnect() {
    return this._initGremlinSession().then(() => {
      return this.$customInitGremlinSession();
    }).then(() => {
      return this.$checkSearchIndices();
    });
  }

  /**
   * Resolve if there exist indices for search.
   *
   * @returns {Bluebird<void>}
   */
  $checkSearchIndices() {
    return Utils.NOT_IMPLEMENTED();
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
    return this.connector.$doGremlinQuery(
      this.$buildSearchQuery(type, searchString, options)
    ).spread((moreResults, searchR) => {
      const nodes = _.map(searchR, rawNode =>
        (/**@type {GremlinDriver}*/ (this.graphDAO.driver)).rawNodeToLkNode(rawNode)
      );
      return DaoUtils.buildSearchResponse(type, nodes, moreResults, searchString, options);
    });
  }
}

module.exports = GremlinSearchDriver;
