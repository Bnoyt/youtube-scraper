/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-10-14.
 *
 * File: graphSchemaBuilder.js
 * Description : This aims at both building and making the graph database schema persistent
 */
'use strict';

// internal libs
const crypto = require('crypto');

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../index');
const DbModels = LKE.getSqlDb().models;
const sqlDb = LKE.getSqlDb();
const Utils = LKE.getUtils();
const Log = LKE.getLogger(__filename);

/**
 *
 * @param {string} name
 * @constructor
 */
function TypeMapEntry(name) {
  this.name = name;
  this.properties = new Map();
}

TypeMapEntry.prototype = {
  name: null,
  count: 0,
  properties: null,

  /**
   * Add an item to this type.
   * Increments the count for the type and each contained property.
   *
   * @param {string[]} properties item properties
   */
  addProperties: function(properties) {
    this.count++;
    let count, key;
    for (let i = 0, l = properties.length; i < l; ++i) {
      key = properties[i];
      count = this.properties.get(key);
      this.properties.set(key, count === undefined ? 1 : count + 1);
    }
  }
};

/**
 * @param {DataSource} dataSource
 * @constructor
 */
function GraphSchemaBuilder(dataSource) {
  this.source = dataSource;
  this.nodeTypesByName = new Map();
  this.edgeTypesByName = new Map();
}

GraphSchemaBuilder.prototype = {

  /**
   * @type {Map<string, TypeMapEntry>}
   */
  nodeTypesByName: null,

  /**
   * @type {Map<string, TypeMapEntry>}
   */
  edgeTypesByName: null,

  /**
   * Reset `nodeTypesByName` and `edgeTypesByName` maps.
   * Also, set `this.freeze` based on the arg `freeze`.
   *
   * @param {boolean} [freeze=false] Whether to allow edit to the schema or not
   */
  init: function(freeze) {
    this.nodeTypesByName.clear();
    this.edgeTypesByName.clear();
    this.freeze = freeze;
  },

  /**
   * @param {string} itemType "node" or "edge"
   * @param {{name:string, count:number, properties:{key:string, count:number}[]}[]} types
   */
  ingestTypes: function(itemType, types) {
    const map = itemType === 'node' ? this.nodeTypesByName : this.edgeTypesByName;
    types.forEach(type => {
      const entry = new TypeMapEntry(type.name);
      entry.count = type.count;

      if (Utils.hasValue(type.properties)) {
        type.properties.forEach(property => {
          entry.properties.set(property.key, property.count);
        });
      }

      map.set(entry.name, entry);
    });
  },

  /**
   * Clear the schema info for a data-source.
   *
   * @param {string} sourceKey Key of a data-source
   * @returns {Promise}
   */
  deleteAll: function(sourceKey) {
    Utils.checkSourceKey(sourceKey);
    // removing properties before types because of foreign key constraints
    return Promise.props({
      removeNodeProperties: DbModels.nodeProperty.destroy({where: {sourceKey: sourceKey}}),
      removeEdgeProperty: DbModels.edgeProperty.destroy({where: {sourceKey: sourceKey}})
    }).then(() => Promise.props({
      removeNodeTypes: DbModels.nodeType.destroy({where: {sourceKey: sourceKey}}),
      removeEdgeType: DbModels.edgeType.destroy({where: {sourceKey: sourceKey}})
    }));
  },

  /**
   * This methods takes as an argument an array of nodes. It builds up the the node Types in memory.
   *
   * A node type can be defined two ways:
   *
   *  First it is defined by the categories. When created from a category, node types have a name
   *  and the properties are not strictly assigned to a type. Ergo, some nodes can be part of a node
   *  type without having all the node type properties.
   *
   *  Second, a node type can be inferred from the node population. In that case, The inferring
   *  process is strict. A node type corresponds to a list of properties. A node respects a node
   *  Type only and only if all the properties of the nodes are the same as the properties of the
   *  node type.
   *
   *  An inferred node Type name is starts with 'inferred-' followed by a md5 hash of all the
   *  properties.
   *
   * @param {LkNode[]} nodes list of nodes. As an abstracted view of a specific implementation of the used
   * @param {number} nodes.id
   * @param {string[]} nodes.categories name of the node categories
   * @param {object} nodes.data properties by key
   */
  ingestNodes: function(nodes) {
    for (let i = 0, l = nodes.length; i < l; ++i) {
      this.ingestNode(nodes[i]);
    }
  },

  /**
   *
   * @param {LkNode} node
   */
  ingestNode: function(node) {
    const properties = itemProperties(node);

    // update/create each node type
    const typeNames = this._getNodeTypeNames(node, properties);
    let typeName, nodeTypeEntry;
    for (let i = 0, l = typeNames.length; i < l; ++i) {
      typeName = typeNames[i];

      /**
       * @type {TypeMapEntry}
       */
      nodeTypeEntry = this.nodeTypesByName.get(typeName);

      // create node type if not already existing
      if (nodeTypeEntry === undefined) {
        nodeTypeEntry = new TypeMapEntry(typeName);
        this.nodeTypesByName.set(typeName, nodeTypeEntry);
      }

      // update the type info
      nodeTypeEntry.addProperties(properties);
    }
  },

  /**
   * This methods takes as an argument an array of edges. It creates the edge schema in memory.
   *
   *  An edge type is defined as a Linkurious abstraction is defined as the unique tuple
   *  composed with a starting nodeType an ending node Type and the String that characterises the
   *  nature of the edge between the two nodeTypes
   *
   * That way we store the most information about our graph, statistics can be inferred from there.
   *
   * @param {LkEdge[]} edges list of edges.
   * @param {number} edges.id
   * @param {string} edges.type name of the edge type
   * @param {object} edges.data properties by key
   */
  ingestEdges: function(edges) {
    for (let i = 0, l = edges.length; i < l; ++i) {
      this.ingestEdge(edges[i]);
    }
  },

  /**
   *
   * @param {LkEdge} edge
   */
  ingestEdge: function(edge) {
    // add properties field
    const properties = itemProperties(edge);

    // update/create each edge type
    const edgeTypeNames = this._getEdgeTypeNames(edge, properties);

    let edgeTypeName, edgeTypeEntry;
    for (let i = 0, l = edgeTypeNames.length; i < l; ++i) {
      edgeTypeName = edgeTypeNames[i];

      /**
       * @type {TypeMapEntry}
       */
      edgeTypeEntry = this.edgeTypesByName.get(edgeTypeName);

      // create edge type if not already existing
      if (edgeTypeEntry === undefined) {
        edgeTypeEntry = new TypeMapEntry(edgeTypeName);
        this.edgeTypesByName.set(edgeTypeName, edgeTypeEntry);
      }

      // update the type info
      edgeTypeEntry.addProperties(properties);
    }
  },

  /**
   * Saves the detected schema to the database.
   *
   * @returns {Promise}
   */
  saveSchema: function() {
    return this._saveTypes('node').then(() => {
      return this._saveTypes('edge');
    }).then(() => {
      this.init(this.freeze);
      return sqlDb.sync();
    });
  },

  /**
   * Persist node and edge types stored in `nodeTypesByName` and `edgeTypesName`.
   * Type instances are created 20 by 20 to avoid generating huge SQL statements.
   *
   * @param {string} type 'node' or 'edge'
   * @returns {Promise}
   * @private
   */
  _saveTypes: function(type) {
    const typesByName = type === 'node' ? this.nodeTypesByName : this.edgeTypesByName;
    const typeModel = type === 'node' ? 'nodeType' : 'edgeType';
    const propertyModel = type === 'node' ? 'nodeProperty' : 'edgeProperty';

    const sourceKey = this.source.getSourceKey();

    const typesToCreate = [];
    typesByName.forEach(type => {
      typesToCreate.push({
        name: type.name,
        count: type.count,
        sourceKey: sourceKey
      });
    });

    Log.info(`Saving new database schema: ${typesToCreate.length} detected ${type} types.`);

    return Utils.sliceMap(typesToCreate, 20, typesSlice => {
      // create 20 node/edge types
      return Promise.resolve(DbModels[typeModel].bulkCreate(typesSlice)).then(() => {

        // read the created type instances back
        const names = typesSlice.map(t => t.name);
        return Promise.resolve(DbModels[typeModel].findAll({
          where: {sourceKey: sourceKey, name: names}
        }));
      }).map(typeInstance => {

        // match types and type instances
        const typeEntry = typesByName.get(typeInstance.name);

        // cannot find the original type?
        if (!typeEntry) {
          Log.warn(`"${type}" type not found: ${typeInstance.name}`);
          return;
        }

        // build properties array for node-type
        const propertiesToAdd = [];
        typeEntry.properties.forEach((value, key) => {
          propertiesToAdd.push({
            sourceKey: sourceKey,
            key: key,
            count: value,
            // explicitly set the foreign key to type instance to enable bulk creation
            typeId: typeInstance.id
          });
        });

        // add properties for type instance
        return DbModels[propertyModel].bulkCreate(propertiesToAdd);
      });
    });
  },

  // ------------------------------------------------------------------------------------------
  //                           Schema maintenance on Nodes operations
  // ------------------------------------------------------------------------------------------

  /**
   * Updates the graph schema upon node creation.
   *
   * @param {LkNode} newNode created node
   * @returns {Promise}
   */
  nodeCreation: function(newNode) {
    return this._itemCreation('node', newNode);
  },

  /**
   * Updates the graph schema upon node deletion.
   *
   * @param {LkNode} oldNode node that was deleted
   * @returns {Promise}
   */
  nodeDeletion: function(oldNode) {
    return this._itemDeletion('node', oldNode);
  },

  /**
   * Updates the graph schema upon node modification.
   *
   * @param {LkNode} nodeBefore node before the update
   * @param {LkNode} nodeAfter node after the update
   * @returns {Promise}
   */
  nodeUpdate: function(nodeBefore, nodeAfter) {
    return this._itemUpdate('node', nodeBefore, nodeAfter);
  },

  /**
   * List node type names for a node.
   *
   * @param {LkNode} node
   * @param {string[]} properties property keys
   * @returns {string[]} nodeTypeNames
   * @private
   */
  _getNodeTypeNames: function(node, properties) {
    if (node.categories && node.categories.length > 0) {
      return node.categories.concat(['*']);
    } else if (!properties.length) {
      return ['*', 'inferred-none'];
    } else {
      return [
        '*',
        'inferred-' + crypto.createHash('md5').update(properties.sort().join('|')).digest('hex')
      ];
    }
  },

  // ------------------------------------------------------------------------------------------
  //                     Schema maintenance on Edges operations
  // ------------------------------------------------------------------------------------------

  /**
   * Updates the graph schema upon edge creation
   *
   * @param {LkEdge} newEdge created edge
   * @returns {Promise}
   */
  edgeCreation: function(newEdge) {
    return this._itemCreation('edge', newEdge);
  },

  /**
   * Updates the graph schema when an edge is deleted
   *
   * @param {LkEdge} oldEdge edge that was deleted
   * @returns {Promise}
   */
  edgeDeletion: function(oldEdge) {
    return this._itemDeletion('edge', oldEdge);
  },

  /**
   * Updates the graph schema when an edge is updated
   *
   * @param {LkEdge} edgeBefore edge before the update
   * @param {LkEdge} edgeAfter edge after the update
   * @returns {Promise}
   */
  edgeUpdate: function(edgeBefore, edgeAfter) {
    return this._itemUpdate('edge', edgeBefore, edgeAfter);
  },

  /**
   * List edge type names for an edge.
   *
   * @param {LkEdge} edge
   * @param {string[]} properties edge property keys
   * @returns {string[]} edgeTypeNames
   * @private
   */
  _getEdgeTypeNames: function(edge, properties) {
    if (edge.type !== undefined && edge.type !== null) {
      return [edge.type, '*'];
    } else if (!properties.length) {
      return ['*', 'inferred-none'];
    } else {
      return [
        '*',
        'inferred-' + crypto.createHash('md5').update(properties.sort().join('|')).digest('hex')
      ];
    }
  },

  // ------------------------------------------------------------------------------------------
  //                     Abstract Schema maintenance operations
  // ------------------------------------------------------------------------------------------

  /**
   * Updates the graph schema upon node/edge creation.
   *
   * @param {string} type 'node' or 'edge'
   * @param {LkNode|LkEdge} newItem
   * @returns {Promise}
   * @private
   */
  _itemCreation: function(type, newItem) {
    if (this.freeze) {
      return Promise.resolve();
    }

    return this._getOrCreateTypeInstances(type, newItem).each(typeInstance => {
      return incrementInstanceCount(typeInstance).then(() => {
        return this._incrementTypeProperties(type, typeInstance, itemProperties(newItem));
      });
    });
  },

  /**
   * Updates the graph schema upon node/edge deletion.
   *
   * @param {string} type 'node' or 'edge'
   * @param {LkNode|LkEdge} oldItem
   * @returns {Promise}
   * @private
   */
  _itemDeletion: function(type, oldItem) {
    if (this.freeze) {
      return Promise.resolve();
    }

    return this._getOrCreateTypeInstances(type, oldItem).each(typeInstance => {
      return this._decrementTypeProperties(type, typeInstance, itemProperties(oldItem)).then(() => {
        return decrementInstanceCount(typeInstance);
      });
    });
  },

  /**
   * Updates the graph schema upon node/edge modification.
   *
   * @param {string} type 'node' or 'edge'
   * @param {LkNode|LkEdge} itemBefore
   * @param {LkNode|LkEdge} itemAfter
   * @returns {Promise}
   * @private
   */
  _itemUpdate: function(type, itemBefore, itemAfter) {
    if (this.freeze) {
      return Promise.resolve();
    }

    const typeChanged = this._checkTypesChanged(type, itemBefore, itemAfter);

    if (typeChanged) {
      // the types/categories have changed
      return this._itemDeletion(type, itemBefore).then(() => {
        return this._itemCreation(type, itemAfter);
      });
    }

    // the types/categories have not changed
    const propertyChanges = getPropertyChanges(itemBefore, itemAfter);
    return this._getOrCreateTypeInstances(type, itemAfter).each(typeInstance => {
      // increment/create added properties of type instance
      return this._incrementTypeProperties(type, typeInstance, propertyChanges.added).then(() => {
        // decrement/delete removed properties of type instance
        return this._decrementTypeProperties(type, typeInstance, propertyChanges.deleted);
      });
    });
  },

  /**
   * Get edgeTypes or nodeTypes by name. Does not create missing ones.
   *
   * @param {string} type 'node' or 'edge'
   * @param {string[]} typeNames
   * @returns {Promise.<edgeType[]|nodeType[]>} edgeType or nodeType instances
   * @private
   */
  _getTypeInstances: function(type, typeNames) {
    const typeModel = type === 'node' ? 'nodeType' : 'edgeType';
    const propertyModel = type === 'node' ? 'nodeProperty' : 'edgeProperty';

    // cast sequelize promise into bluebird A+ promise
    return Promise.resolve(DbModels[typeModel].findAll({
      where: {
        name: typeNames,
        sourceKey: this.source.getSourceKey()
      },
      include: [{model: DbModels[propertyModel]}]
    }));
  },

  /**
   * Creates edgeTypes or nodeTypes by name (count set to 0)
   *
   * @param {string} type 'node' or 'edge'
   * @param {string[]} typeNames
   * @returns {Promise.<edgeType[]|nodeType[]>}
   * @private
   */
  _createTypeInstances: function(type, typeNames) {
    const typeModel = type === 'node' ? 'nodeType' : 'edgeType';
    const typesToCreate = typeNames.map(typeName => ({
      name: typeName,
      sourceKey: this.source.getSourceKey(),
      count: 0
    }));

    // update user groups for access to new types
    return DbModels[typeModel].bulkCreate(typesToCreate);
  },

  /**
   * Increment property counts for a node type or an edge type.
   * Missing properties are created.
   *
   * @param {string} type 'node' or 'edge'
   * @param {edgeType|nodeType} typeInstance nodeType or edgeType sequelize instance
   * @param {String[]} propertyKeys list of properties keys to create or increment
   * @returns {Promise}
   * @private
   */
  _incrementTypeProperties: function(type, typeInstance, propertyKeys) {
    const propertiesField = type === 'node' ? 'nodeProperties' : 'edgeProperties';
    const propertyModel = type === 'node' ? 'nodeProperty' : 'edgeProperty';
    const propertiesToCreate = [];

    // index existing properties by key
    const existingPropertiesByKey = _.keyBy(typeInstance[propertiesField], 'key');

    // update each property
    return Promise.each(propertyKeys, propertyKey => {
      const propertyInstance = existingPropertiesByKey[propertyKey];

      // if the property already exists in DB, just increment it
      if (propertyInstance !== undefined) {
        return incrementInstanceCount(propertyInstance);
      }

      // else, create a new property for bulk creation
      propertiesToCreate.push({
        key: propertyKey,
        count: 1,
        sourceKey: typeInstance.sourceKey,
        // explicitly set the foreign key to type instance to enable bulk creation
        typeId: typeInstance.id
      });

    }).then(() => {

      // create missing edge properties in DB
      if (propertiesToCreate.length === 0) { return; }
      return DbModels[propertyModel].bulkCreate(propertiesToCreate);
    });
  },

  /**
   * Decrement property counts for edge type.
   * Properties with a count reaching 0 are deleted.
   *
   * @param {string} type 'node' or 'edge'
   * @param {edgeType|nodeType} typeInstance nodeType or edgeType sequelize instance
   * @param {String[]} propertyKeys list of properties keys to decrement or destroy
   * @returns {Promise}
   * @private
   */
  _decrementTypeProperties: function(type, typeInstance, propertyKeys) {
    const propertiesField = type === 'node' ? 'nodeProperties' : 'edgeProperties';

    // index existing properties by name
    const existingPropertiesByKey = _.keyBy(typeInstance[propertiesField], 'key');

    // update each property
    return Promise.each(propertyKeys, propertyKey => {
      const propertyInstance = existingPropertiesByKey[propertyKey];

      // if the property does not exist, ignore
      if (propertyInstance === undefined) { return; }

      // else, decrement or delete
      return decrementInstanceCount(propertyInstance);
    });
  },

  /**
   * Get types instances for an item. If some types are missing from DB, creates them.
   *
   * @param {string} type 'node' or 'edge'
   * @param {LkNode|LkEdge} item
   * @returns {Promise.<edgeType>|Promise.<nodeType>}
   * @private
   */
  _getOrCreateTypeInstances: function(type, item) {
    const properties = itemProperties(item);
    const typeNames = type === 'node'
      ? this._getNodeTypeNames(item, properties)
      : this._getEdgeTypeNames(item, properties);

    // read types instances from DB
    return this._getTypeInstances(type, typeNames).then(typeInstances => {

      // compute list of types names NOT already in DB
      const missingTypeNames = _.difference(typeNames, typeInstances.map(t => t.name));

      // no missing instance types, return now
      if (missingTypeNames.length === 0) {
        return typeInstances;
      }

      // create missing types instances in DB
      return this._createTypeInstances(type, missingTypeNames).then(() => {

        // return complete list, after creation of missing instances
        return this._getTypeInstances(type, typeNames);
      });
    });
  },

  /**
   * Detect if the item's types (node categories or edge types) have changed.
   *
   * @param {string} type 'node' or 'edge'
   * @param {LkNode|LkEdge} itemBefore
   * @param {LkNode|LkEdge} itemAfter
   * @returns {boolean} true if the types have changed
   * @private
   */
  _checkTypesChanged: function(type, itemBefore, itemAfter) {
    let typesBefore, typesAfter;

    const propertiesBefore = itemProperties(itemBefore);
    const propertiesAfter = itemProperties(itemAfter);

    if (type === 'node') {
      typesBefore = this._getNodeTypeNames(itemBefore, propertiesBefore);
      typesAfter = this._getNodeTypeNames(itemAfter, propertiesAfter);
    } else {
      typesBefore = this._getEdgeTypeNames(itemBefore, propertiesBefore);
      typesAfter = this._getEdgeTypeNames(itemAfter, propertiesAfter);
    }

    if (typesBefore.length !== typesAfter.length) {
      // added or removed
      return true;
    }

    if (_.difference(typesBefore, typesAfter).length > 0) {
      // some removed types
      return true;
    }

    if (_.difference(typesAfter, typesBefore).length > 0) {
      // some added types
      return true;
    }

    return false;
  }
};

// Private helpers

/**
 * Decrements the count of the instance argument.
 * If the count reaches zero, the instance is destroyed from DB.
 *
 * @param {nodeType|edgeType|nodeProperty|edgeProperty} instance Sequelize instance
 * @param {number} instance.count value to decrement
 * @returns {Promise}
 */
function decrementInstanceCount(instance) {
  if (instance.count > 1) {
    instance.count--;
    return instance.save({fields: ['count']});
  } else {
    return instance.destroy();
  }
}

/**
 * Increments the count of the instance argument.
 *
 * @param {nodeType|edgeType|nodeProperty|edgeProperty} instance Sequelize instance
 * @param {number} instance.count value to increment
 * @returns {Promise}
 */
function incrementInstanceCount(instance) {
  instance.count++;
  return instance.save({fields: ['count']});
}

/**
 * Compute the property changes for an item (node / edge)
 *
 * @param {object} itemBefore
 * @param {object} itemBefore.data property values by key (before)
 * @param {object} itemAfter
 * @param {object} itemAfter.data property values by key (after)
 * @returns {{added: string[], deleted: string[]}}
 */
function getPropertyChanges(itemBefore, itemAfter) {
  const propertiesBefore = itemProperties(itemBefore);
  const propertiesAfter = itemProperties(itemAfter);
  return {
    added: _.difference(propertiesAfter, propertiesBefore),
    deleted: _.difference(propertiesBefore, propertiesAfter)
  };
}

/**
 *
 * @param {LkNode|LkEdge} item
 * @param {object} item.data
 * @returns {string[]} sorted list of property names
 */
function itemProperties(item) {
  if (!item.data) { return []; }
  return Object.keys(item.data).sort();
}

module.exports = GraphSchemaBuilder;
