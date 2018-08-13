/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-01.
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../../../services/index');
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();

// locals
const GremlinSearchDriver = require('../gremlinSearchDriver');
const DseUtils = require('../../utils/dseUtils');
const DaoUtils = require('../../utils/daoUtils');
const GremlinUtils = require('../../utils/gremlinUtils');
const StringUtils = require('../../../../lib/StringUtils');

class DseSearchDriver extends GremlinSearchDriver {

  constructor(connector, graphDAO, indexOptions, connectorData) {
    super(connector, graphDAO, indexOptions, connectorData);

    this._schemaInfo = {
      propertyTypes: {},
      nodeSchema: {},
      edgeSchema: {},
      searchIndices: {},
      indexedProperties: []
    };
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
    const subQueries = [];
    let fuzzy;

    if (options.fuzziness === 1) {
      fuzzy = 0;
    } else if (options.fuzziness >= 0.6) {
      fuzzy = 1;
    } else {
      fuzzy = 2;
    }

    let tokens = StringUtils.uniqTokenize(searchString);

    // for asString search indices we use the whole escaped string
    const escapedSearchString = tokens.join(' ');

    // for asText search indices, we use only tokens of a given size
    tokens = _.filter(tokens, token => token.length >= 3);

    const indexedLabel = _.keys(this._schemaInfo.searchIndices).sort();

    for (let i = 0; i < indexedLabel.length; i++) {
      const labelName = indexedLabel[i];

      if (Utils.hasValue(options.categoriesOrTypes) &&
        !options.categoriesOrTypes.includes(labelName)) {
        continue; // we skip this label name if it doesn't appear in options.categoriesOrTypes
      }

      const propertyKeys = _.keys(this._schemaInfo.searchIndices[labelName]).sort();
      // `propertyKeys` are the properties indexed with a search index for the label `labelName`

      for (let y = 0; y < propertyKeys.length; y++) {
        const propertyKey = propertyKeys[y];
        const indexType = this._schemaInfo.searchIndices[labelName][propertyKey];

        if (indexType === 'string') {
          subQueries.push(`g.V().hasLabel('${labelName}').has('${propertyKey}',
            fuzzy('${escapedSearchString}', ${fuzzy ? 2 : 0}))`);
        } else {
          for (let z = 0; z < tokens.length; z++) {
            const token = tokens[z];
            subQueries.push(`g.V().hasLabel('${labelName}').has('${propertyKey}',
              tokenFuzzy('${token}', ${fuzzy ? 2 : 0}))`);
          }
        }
      }
    }

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
        ${subQueries.join(',')}
      ];
      
      search(queries, ${options.from}, ${options.size}, ${sFilters}, ${sCategories});
    `;
  }

  /**
   * Refresh the schema info cached in the driver.
   *
   * @returns {Bluebird<void>}
   * @private
   */
  _refreshSchema() {
    return this.connector.$doGremlinQuery('schema.describe();').get('0').then(describeR => {
      this._schemaInfo = DseUtils.parseSchemaInfo(describeR);
    });
  }

  /**
   * Add definitions in the gremlin session and/or perform additional checks.
   *
   * @returns {Bluebird<void>}
   */
  $customInitGremlinSession() {
    return this._refreshSchema();
  }

  /**
   * Called at the end of the indexation phase for additional initializations.
   *
   * @returns {Bluebird<void>}
   */
  $onAfterIndexation() {
    return this._refreshSchema();
  }

  /**
   * Get a detailed schema from the index.
   *
   * @param {string}  type           'node' or 'edge'
   * @param {boolean} withProperties Whether to include properties
   * @returns {Bluebird<{name: string, count?: number, properties?: {key: string, count?: number}[]}[]>}
   */
  $getSchema(type, withProperties) {
    return Promise.resolve().then(() => {
      const result = [];

      let schemaData;
      if (type === 'node') {
        schemaData = this._schemaInfo.nodeSchema;
      } else {
        schemaData = this._schemaInfo.edgeSchema;
      }

      _.forOwn(schemaData, (propertyKeys, labelName) => {
        const partialResult = {name: labelName};
        if (withProperties) {
          partialResult.properties = _.map(propertyKeys, property => { return {key: property}; });
        }

        result.push(partialResult);
      });

      return result;
    });
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
   * @returns {Bluebird<object>}
   */
  $getPropertyTypes() {
    return Promise.resolve(this._schemaInfo.propertyTypes);
  }

  /**
   * Resolve if there exist indices for search.
   *
   * @returns {Bluebird<void>}
   */
  $checkSearchIndices() {
    return Promise.resolve().then(() => {
      if (
        Object.keys(this._schemaInfo.searchIndices).length === 0 &&
        !this.getIndexOption('disableIndexExistCheck')
      ) {
        return Errors.business('source_action_needed', 'No search index found in DSE.', true);
      }
    });
  }
}

module.exports = DseSearchDriver;
