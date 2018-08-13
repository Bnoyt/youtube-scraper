/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-10-15.
 *
 * File: GraphSchemaDAO
 * Description : File handling the logic behind the api of the graph schema
 */
'use strict';

// ext libs
const _omit = require('lodash/omit');

// services
const LKE = require('../index');
const DbModels = LKE.getSqlDb().models;

/**
 *
 * @param {Object|Object[]} o
 * @param {string} [subField]
 * @returns {Object|Object[]}
 */
function omitSourceKey(o, subField) {
  if (Array.isArray(o)) {
    for (let i = 0; i < o.length; ++i) {
      o[i].sourceKey = undefined;
      o[i].id = undefined;
      if (subField) {
        o[i][subField] = omitSourceKey(o[i][subField]);
      }
      o[i] = normalizePropertiesField(o[i]);
    }
  } else if (o !== null && o !== undefined) {
    o.sourceKey = undefined;
    o.id = undefined;
    if (subField) {
      o[subField] = omitSourceKey(o[subField]);
    }
    o = normalizePropertiesField(o);
  }
  return o;
}

/**
 * Normalize 'nodeProperties'/'edgeProperties' field to 'properties'
 *
 * @param {Object} o
 * @private
 */
function normalizePropertiesField(o) {
  if (typeof o.get === 'function') { o = o.get(); }
  o.id = undefined;
  if (o.nodeProperties) {
    o.properties = o.nodeProperties.map(property => _omit(property, 'typeId'));
    o.nodeProperties = undefined;
  } else if (o.edgeProperties) {
    o.properties = o.edgeProperties.map(property => _omit(property, 'typeId'));
    o.edgeProperties = undefined;
  }
  return o;
}

/**
 * @class GraphSchemaDAO
 */
const GraphSchemaDAO = {

  NODE_CATEGORY: 'nodeCategory',
  EDGE_TYPE: 'edgeType',

  /**
   * Retrieves all Node Types with their properties. Inferred node types can be omitted to get
   * a list of node types with actual names.
   *
   * @param {string} sourceKey key of a data-source
   * @param {boolean} [omitInferred=false] When true, omit inferred node types
   * @param {boolean} [omitProperties=false]
   * @returns {Promise.<nodeType[]>}
   */
  getAllNodeTypes: function(sourceKey, omitInferred, omitProperties) {
    return DbModels.nodeType.findAll({
      where: {sourceKey: sourceKey, name: {$not: '*'}},
      include: omitProperties ? undefined : DbModels.nodeProperty
    }).then(types => {
      if (omitInferred) {
        types = types.filter(nodeType => nodeType.name.indexOf('inferred-') !== 0);
      }

      return omitSourceKey(types, 'nodeProperties');
    });
  },

  /**
   * Get all edgeTypes (these are META-types, they include targetNodeType and sourceNodeType)
   *
   * @param {string} sourceKey ID of a data-source
   * @param {boolean} [omitProperties=false]
   * @returns {Promise.<edgeType[]>}
   */
  getAllEdgeTypes: function(sourceKey, omitProperties) {
    return DbModels.edgeType.findAll({
      where: {sourceKey: sourceKey, name: {$not: '*'}},
      include: omitProperties ? undefined : DbModels.edgeProperty
    }).then(edgeTypes => omitSourceKey(edgeTypes, 'edgeProperties'));
  },

  /**
   * Gets all the node properties name and aggregates the node properties count by property key
   *
   * @param {string} sourceKey ID of a data-source
   * @returns {Promise.<nodeProperty[]>}
   */
  getAllNodeProperties: function(sourceKey) {
    return DbModels.nodeType.findOne({
      where: {sourceKey: sourceKey, name: '*'},
      include: DbModels.nodeProperty
    }).then(wildcardType => {
      if (wildcardType) {
        return omitSourceKey(wildcardType, 'nodeProperties').properties;
      }

      // reverse compatibility with old schemas
      return this.getAllNodeTypes(sourceKey, false, false).then(types => {
        // @backward-compatibility remove this code when we have forced all old schemas to re-index
        const map = new Map();
        types.forEach(type => {
          type.properties.forEach(p => {
            if (map.has(p.key)) {
              map.get(p.key).count += p.count;
            } else {
              map.set(p.key, {key: p.key, count: p.count});
            }
          });
        });

        return Array.from(map.values());
      });
    });
  },

  /**
   * @param {string} sourceKey ID of a data-source
   * @returns {Promise.<edgeProperty[]>}
   */
  getAllEdgeProperties: function(sourceKey) {
    return DbModels.edgeType.findOne({
      where: {sourceKey: sourceKey, name: '*'},
      include: DbModels.edgeProperty
    }).then(wildcardType => {
      // normal case
      if (wildcardType) {
        return omitSourceKey(wildcardType, 'edgeProperties').properties;
      }

      // reverse compatibility with old schemas
      return this.getAllEdgeTypes(sourceKey, false).then(types => {
        // @backward-compatibility remove this code when we have forced all old schemas to re-index
        const map = new Map();
        types.forEach(type => {
          type.properties.forEach(p => {
            if (map.has(p.key)) {
              map.get(p.key).count += p.count;
            } else {
              map.set(p.key, {key: p.key, count: p.count});
            }
          });
        });

        return Array.from(map.values());
      });
    });
  }
};

module.exports = GraphSchemaDAO;
