/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-20.
 */
'use strict';

// external libs
const _ = require('lodash');

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();
const Log = LKE.getLogger(__filename);

// our libs
const literalsParser = new (require('../../../lib/LiteralsParser'))(['"'], '\\');

// how to translate DSE field types
const MAPPING_DSE_TYPE = {
  'Text': 'string',
  'Bigint': 'integer',
  'Int': 'integer',
  'Smallint': 'integer',
  'Varint': 'integer',
  'Double': 'float',
  'Decimal': 'float',
  'Float': 'float',
  'Boolean': 'boolean',
  'Timestamp': 'date'
};

class DseUtils {

  /**
   * @example
   * Given:
   * ['schema.propertyKey("property").Text().single().create()']
   *
   * Return:
   * {
   *   property: 'string'
   * }
   *
   * @param {string[]} propertyLines
   * @returns {object}
   * @private
   */
  _parsePropertyTypesDetails(propertyLines) {
    const result = _.fromPairs(_.compact(_.map(propertyLines, line => {
      // first we use the literalsParser to get the name of the property
      const propertyKey = literalsParser.retrieveAllLiterals(line)[0];

      if (Utils.noValue(propertyKey)) {
        Log.warn(`Cannot parse the following line in schema.describe(): ${line}`);
        return; // undefined values (if the parsing failed) are removed with _.compact
      }

      // then we extract the type from a string in the following format:
      // schema.propertyKey("{propertyKey}").{type}().single().create()

      const prefix = `schema.propertyKey("${propertyKey}").`;
      const tmp = line.substring(prefix.length);
      const type = tmp.substring(0, tmp.indexOf('('));

      return [propertyKey, type];
    })));

    // for each mapping we translate the type to one that we recognize:
    // string, integer, float, boolean, date
    return _.mapValues(result, mapping => {
      const res = MAPPING_DSE_TYPE[mapping];
      if (res) {
        return res;
      } else {
        return 'string';
      }
    });
  }

  /**
   * @example
   * Given:
   * ['schema.vertexLabel("Person").properties("born", "name").create()',
   *  'schema.vertexLabel("NoPropertiesLabel").create()']
   *
   * Return:
   * {
   *   Person: ['born', 'name'],
   *   NoPropertiesLabel: []
   * }
   *
   * @param {string[]} schemaLines
   * @returns {object}
   * @private
   */
  _parseSchemaDetails(schemaLines) {
    const result = {};

    schemaLines.forEach(line => {
      const literals = literalsParser.retrieveAllLiterals(line);
      const label = literals[0];
      const properties = literals.slice(1);

      if (Utils.noValue(label)) {
        Log.warn(`Cannot parse the following line in schema.describe(): ${line}`);
        return;
      }

      result[label] = properties;
    });

    return result;
  }

  /**
   * @example
   * Given:
   * ['schema.vertexLabel("Person").index("search").search().by("name").asString().add()',
   *  'schema.vertexLabel("Employee").index("search").search().by("name").asString().by("resume").asText().add()',]
   *
   * Return:
   * {
   *   Person: {
   *     name: 'string'
   *   },
   *   Employee: {
   *     name: 'string',
   *     resume: 'text'
   *   }
   * }
   *
   * @param {string[]} searchIndexLines
   * @returns {object}
   * @private
   */
  _parseSearchIndexDetails(searchIndexLines) {
    const result = {};

    searchIndexLines.forEach(line => {
      // we first remove '.index("search")' so we don't get the index name as a literal
      line = line.replace('.index("search").', '.');
      const literals = literalsParser.retrieveAllLiterals(line);
      const label = literals[0];
      const properties = literals.slice(1);

      if (Utils.noValue(label)) {
        Log.warn(`Cannot parse the following line in schema.describe(): ${line}`);
        return;
      }

      // Now for each indexed property we have to discover if they were indexed asString or asText
      result[label] = {};

      properties.forEach(property => {
        const prefixStr = `.by("${property}")`;
        if (line.includes(prefixStr + '.asString()')) {
          // if line contains 'by("{property}").asString()' is indexed as a string
          result[label][property] = 'string';
        } else if (line.includes(prefixStr + '.asText()')) {
          // if line contains 'by("{property}").asText()' is indexed as a text
          result[label][property] = 'text';
        } else {
          Log.warn(`Cannot parse the following line in schema.describe(): ${line}`);
        }
      });
    });

    return result;
  }

  /**
   * Return an array of property keys indexed for every node label
   * with a secondary or materialized index.
   *
   * @param {string[]} indexLines
   * @param {string[]} nodeLabels
   * @returns {string[]}
   * @private
   */
  _parseIndexedPropertiesDetails(indexLines, nodeLabels) {
    let labelPropertyPairs = indexLines.map(line => {
      const lineMatch = line.match(/schema\.vertexLabel\("(.*?)"\).*\.by\("(.*?)"\)/);
      if (lineMatch === null) {
        Log.warn(`Cannot parse the following line in schema.describe(): ${line}`);
        return;
      }

      return [lineMatch[1], lineMatch[2]];
    });

    labelPropertyPairs = _.compact(labelPropertyPairs);

    const groupedLabelPropertyPairs = _.groupBy(labelPropertyPairs, '1'); // we group by property key

    const result = [];

    for (const property of _.keys(groupedLabelPropertyPairs)) {
      const labelsIndexed = _.uniq(_.map(groupedLabelPropertyPairs[property], '0'));

      // if the property is indexed in every node label
      if (_.difference(nodeLabels, labelsIndexed).length === 0) {
        result.push(property);
      }
    }

    return result;
  }

  /**
   * Parse the schema info in DSE.
   *
   * Return an object with the following keys:
   *  - propertyTypes     Given a property key, return the type (among the ones LK recognizes)
   *  - nodeSchema        Given a node label, return the array of property keys
   *  - edgeSchema        Given an edge label, return the array of property keys
   *  - searchIndices     Given a node label, return an object describing which properties are indexed for full-text search
   *  - indexedProperties Array of property keys indexed for every node label with a secondary or materialized index
   *
   * @param {string} schemaDescribe
   * @returns {{propertyTypes: object, nodeSchema: object, edgeSchema: object, searchIndices: object, indexedProperties: string[]}}
   */
  parseSchemaInfo(schemaDescribe) {
    const schemaDescribeLines = schemaDescribe.split('\n');

    // TODO refactor by parsing `graph.schemaModel()` instead of `schema.describe()`

    // 1) create the answer for $getPropertyTypes
    const schemaPropertyKeyLines = _.filter(schemaDescribeLines,
      l => l.startsWith('schema.propertyKey'));

    const propertyTypes = this._parsePropertyTypesDetails(schemaPropertyKeyLines);

    // 2) create the answer for $getSchema
    const schemaVertexLabelLines = _.filter(schemaDescribeLines,
      l => l.startsWith('schema.vertexLabel') && l.includes('.create()'));
    const schemaEdgeLabelLines = _.filter(schemaDescribeLines,
      l => l.startsWith('schema.edgeLabel') && l.includes('.create()'));

    const nodeSchema = this._parseSchemaDetails(schemaVertexLabelLines);
    const edgeSchema = this._parseSchemaDetails(schemaEdgeLabelLines);

    // 3) get search indices
    // a search index can only be called "search"
    const searchIndexLines = _.filter(schemaDescribeLines,
      l => l.startsWith('schema.vertexLabel') && l.includes('.search()'));
    const searchIndices = this._parseSearchIndexDetails(searchIndexLines);

    // 4) get all the properties indexed
    const indexLines = _.filter(schemaDescribeLines, l => l.startsWith('schema.vertexLabel') &&
      l.includes('.materialized()') || l.includes('.secondary()'));
    const indexedProperties = this._parseIndexedPropertiesDetails(indexLines, _.keys(nodeSchema));

    return {
      propertyTypes: propertyTypes,
      nodeSchema: nodeSchema,
      edgeSchema: edgeSchema,
      searchIndices: searchIndices,
      indexedProperties: indexedProperties
    };
  }
}

module.exports = new DseUtils();
