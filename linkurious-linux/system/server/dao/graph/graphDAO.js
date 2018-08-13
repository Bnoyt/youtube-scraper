/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-12-30.
 */
'use strict';

// external libs
const Promise = require('bluebird');
const _ = require('lodash');
const through = require('through');

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();
const Config = LKE.getConfig();
const Errors = LKE.getErrors();

// locals
const DAO = require('../DAO');
const DaoUtils = require('../utils/daoUtils');

const MAX_CONCURRENT_DIGEST_REQS = 10;

const DEFAULT_SUPERNODE_THRESHOLD = 10000;

/**
 * LkNode
 *
 * @property {string}         id                 ID of the node
 * @property {any}            data               Properties of the node
 * @property {string[]}       categories?        Categories of the node (always sorted by name)
 * @property {LkEdge[]}       edges?             Array of edges adjacent to the node
 * @property {object}         statistics?        Statistics about the node
 * @property {LkDigestItem[]} statistics.digest? Adjacency digest of the node
 * @property {number}         statistics.degree? Degree of the node
 * @property {number}         version?           Version of the node
 */

/**
 * LkEdge
 *
 * @property {string} id       ID of the edge
 * @property {string} type     Type of the edge
 * @property {string} source   ID of the source node
 * @property {string} target   ID of the target node
 * @property {any}    data?    Properties of the edge
 * @property {number} version? Version of the edge
 */

/**
 * LkDigestItem
 *
 * Number of nodes and edges grouped by node categories and edge types
 *
 * @property {string[]} nodeCategories Categories of the nodes
 * @property {string}   edgeType       Type of the edges
 * @property {number}   nodes          Number of nodes
 * @property {number}   edges          Number of edges
 */

// TODO #766 serializeArrayProperties: we always serialize and never parse

/**
 * GraphFeatures
 *
 * @property {boolean}  edgeProperties?           Whether edge properties are allowed
 * @property {boolean}  immutableNodeCategories?  Whether node categories are immutable for this vendor
 * @property {number}   minNodeCategories?        Minimum number of categories for a node
 * @property {number}   maxNodeCategories?        Maximum number of categories for a node
 * @property {boolean}  serializeArrayProperties? Whether to serialize/parse property values that are arrays
 * @property {boolean}  canCount?                 Whether the graph can count nodes and edges
 * @property {boolean}  alerts?                   Whether alerts are supported
 * @property {boolean}  shortestPaths?            Whether the DAO can compute a shortest path
 * @property {boolean}  alternativeIds?           Whether the DAO supports alternative ids
 * @property {boolean}  emptyNodes?               Whether empty nodes are allowed (usually not allowed in RDF stores)
 * @property {string[]} dialects?                 List of supported dialects
 * @property {boolean}  canStream                 Whether the DAO can stream all nodes and edges
 * @property {boolean}  detectSupernodes          Whether the DAO makes a difference between supernodes and regular nodes
 */

class GraphDAO extends DAO {
  /**
   * Abstract Graph DAO constructor
   *
   * @param {string}                                 vendor           Name of the vendor for this DAO (e.g.: neo4j, elasticSearch)
   * @param {string[]}                               requiredOptions  List of required option properties
   * @param {string[]}                               availableOptions List of available option properties
   * @param {any}                                    options          DAO constructor options
   * @param {GraphFeatures}                          features         Features of the graph DAO
   * @param {string | string[]}                      [connectors]     Name of the connector of the DAO (optional to support old DAOs, see #634)
   * @param {Array<{version: string, name: string}>} [drivers]        Name of the driver to use from a given version (optional to support old DAOs, see #634)
   * @constructor
   */
  constructor(vendor, requiredOptions, availableOptions, options, features, connectors, drivers) {
    super(
      'Graph',
      vendor,
      requiredOptions,
      availableOptions.concat([
        // name of the property used as alternative ID for node and edges
        'alternativeNodeId', 'alternativeEdgeId',
        // node properties for latitude and longitude (for geographical layout)
        'latitudeProperty', 'longitudeProperty'
      ]),
      options,
      null,
      connectors,
      drivers
    );

    if (!features) {
      throw Errors.technical('bug', 'Graph DAO: "features" is required');
    }

    this._features = features;
    Utils.check.properties('features', this._features, {
      edgeProperties: {required: true, type: 'boolean'},
      immutableNodeCategories: {required: true, type: 'boolean'},
      minNodeCategories: {required: true, check: ['integer', 0]},
      maxNodeCategories: {check: ['integer', 0]},
      serializeArrayProperties: {required: true, type: 'boolean'},
      canCount: {required: true, type: 'boolean'},
      alerts: {required: true, type: 'boolean'},
      shortestPaths: {required: true, type: 'boolean'},
      alternativeIds: {required: true, type: 'boolean'},
      emptyNodes: {required: true, type: 'boolean'},
      dialects: {required: true, arrayItem: {check: 'nonEmpty'}},
      canStream: {required: true, type: 'boolean'},
      detectSupernodes: {required: true, type: 'boolean'}
    });

    if (Utils.noValue(this._features.edgeProperties) &&
      Utils.hasValue(this._features.alternativeIds)) {
      throw Errors.technical('bug',
        'The feature alternativeIds can be true only if the feature edgeProperties is true.'
      );
    }
  }

  /**
   * @type {GraphDriver}
   */
  get driver() {
    if (this.$driver) {
      return this.$driver;
    }

    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * The features supported by the underlying graph database.
   *
   * @type {GraphFeatures}
   */
  get features() {
    return this._features;
  }

  /**
   * Special properties that can't be read, created or updated.
   *
   * @type {Array<{key: string, read: boolean, create: boolean, update: boolean}>}
   */
  get specialProperties() {
    if (this.$driver) {
      return this.$driver.$specialProperties;
    }

    return [];
  }

  /**
   * Create a Graph DAO instance.
   *
   * @param {string} vendor  Vendor name
   * @param {any}    options GraphDAO constructor options
   * @returns {GraphDAO}
   */
  static createInstance(vendor, options) {
    return /**@type {GraphDAO}*/ (DAO.createInstance('Graph', vendor, options));
  }

  /**
   * @param {any}     properties
   * @param {boolean} [isEdge]   Whether the item containing these properties is an edge
   * @returns {any} normalized properties
   * @throws {LkError} if a property value is a non-array object
   * @private
   */
  _normalizeProperties(properties, isEdge) {
    const keys = Object.keys(properties);
    const normalized = {};
    let value, key;

    if (isEdge && !this.features.edgeProperties && keys.length > 0) {
      throw Errors.business(
        'not_implemented',
        `Cannot create/update edge properties with this database ("${this.vendor}").`
      );
    }

    for (let i = 0, l = keys.length; i < l; ++i) {
      key = keys[i];
      value = properties[key];

      // ignore null/undefined
      if (value === null || value === undefined) {
        continue;
      }

      // set basic types (number, string) as they are
      if (typeof(value) !== 'object') {
        normalized[key] = value;
        continue;
      }

      // normalize arrays
      if (Array.isArray(value)) {
        normalized[key] = this.features.serializeArrayProperties
          ? JSON.stringify(value)
          : value;
        continue;
      }

      // value is an object that is not an array. Can't be good.
      throw Errors.business(
        'invalid_parameter',
        `Property "${keys[i]}" has an invalid type (object)`
      );
    }

    return normalized;
  }

  /**
   * Check that `data` is an object and it doesn't have an empty property key.
   *
   * @param {any} data
   * @private
   */
  _checkNoEmptyPropertyKey(data) {
    Utils.check.objectKeys('data', data, null, null, ['']);
  }

  /**
   * Check if `dialect` is supported by this Graph DAO.
   *
   * @param {string}  dialect      Name of a query dialect
   * @param {boolean} [throwIfNot] Whether to reject if the condition is not met
   * @returns {boolean}
   * @private
   */
  _checkDialect(dialect, throwIfNot) {
    if (throwIfNot) {
      // this throws an error if dialect is not in this.features.dialect
      Utils.check.values('dialect', dialect, this.features.dialects);
      return true;
    }

    // non-throwing alternative
    for (let i = 0; i < this.features.dialects.length; ++i) {
      if (this.features.dialects[i] === dialect) { return true; }
    }
    return false;
  }

  /**
   * Check if the given edge ID is legal.
   *
   * Coding/decoding is used when the edge ID is not originally a string or a number.
   * An encoded edge ID is an ID for Linkurious (ID in input).
   * A decoded edge ID is an ID for the graph database (ID in output).
   *
   * @param {string}  key
   * @param {string}  id
   * @param {boolean} [skipDecoding=false] Skip the decoding (return id)
   * @returns {any} The ID of the edge (encoded or not)
   * @throws {LkError} if the ID is not valid
   */
  checkEdgeId(key, id, skipDecoding) { return this.driver.$checkEdgeId(key, id, skipDecoding); }

  /**
   * Check if the given node ID is legal.
   *
   * Coding/decoding is used when the node ID is not originally a string or a number.
   * An encoded node ID is an ID for Linkurious (ID in input).
   * A decoded node ID is an ID for the graph database (ID in output).
   *
   * @param {string}  key
   * @param {string}  id
   * @param {boolean} [skipDecoding=false] Skip the decoding (return id)
   * @returns {any} the ID of the node (encoded or not)
   * @throws {LkError} if the ID is not valid
   */
  checkNodeId(key, id, skipDecoding) { return this.driver.$checkNodeId(key, id, skipDecoding); }

  /**
   * Check if an array of node IDs is legal.
   *
   * @param {string}   key
   * @param {string[]} encodedNodeIds
   * @param {number}   [minSize=0]
   * @param {boolean}  [skipDecoding]
   * @returns {any[]} the IDs of the nodes (encoded or not)
   */
  checkNodeIds(key, encodedNodeIds, minSize, skipDecoding) {
    Utils.check.array(key, encodedNodeIds, minSize);
    return encodedNodeIds.map((nodeId, i) =>
      this.checkNodeId(key + '[' + i + ']', nodeId, skipDecoding)
    );
  }

  /**
   * Check if an array of edge IDs is legal.
   *
   * @param {string}   key
   * @param {string[]} encodedEdgeIds
   * @param {number}   [minSize=0]
   * @param {boolean}  [skipDecoding]
   * @returns {any[]} the IDs of the edges (encoded or not)
   */
  checkEdgeIds(key, encodedEdgeIds, minSize, skipDecoding) {
    Utils.check.array(key, encodedEdgeIds, minSize);
    return encodedEdgeIds.map((edgeId, i) =>
      this.checkEdgeId(key + '[' + i + ']', edgeId, skipDecoding)
    );
  }

  /**
   * Check if an array of alternative IDs is legal.
   *
   * @param {string}   key         Field name of this array of IDs
   * @param {string[]} ids         Array of alternative IDs to check
   * @param {number}   [minSize=0] Minimum size of the array of IDs
   */
  static checkAlternativeIds(key, ids, minSize) {
    Utils.check.stringArray(key, ids, minSize, undefined, true);
  }

  /**
   * Check if the given alternative ID is legal.
   *
   * @param {string} key
   * @param {string} id
   */
  static checkAlternativeId(key, id) {
    Utils.check.nonEmpty(key, id);
  }

  /**
   * Called at the begin of the internal indexation phase for additional initializations.
   * Not called for external indices.
   *
   * @returns {Bluebird<void>}
   */
  onInternalIndexation() {
    if (!this.features.canStream) {
      return Errors.business('not_supported', 'Internal indices are not supported ' +
        'by ' + this.vendor + '.', true);
    }

    if (!this.$driver) {
      return Promise.resolve();
    }

    return this.driver.$onInternalIndexation();
  }

  /**
   * Get all the shortest paths between a pair of nodes.
   * Edges have to appear only on the first node in the path.
   *
   * @param {string}   startNodeId                  ID of the starting node (encoded for Linkurious)
   * @param {string}   endNodeId                    ID of the ending node (encoded for Linkurious)
   * @param {object}   options
   * @param {number}   [options.maxDepth]           Max depth of the search
   * @param {boolean}  [options.withDigest]         Whether to include an adjacency digest in the result
   * @param {boolean}  [options.withDegree]         Whether to include the degree in the result
   * @param {string[]} [options.readableCategories] Exclusive list of node-categories to restrict the result (used for the node degree)
   * @param {string[]} [options.readableTypes]      Exclusive list of edge-type to restrict the result (used for the node degree)
   * @returns {Bluebird<LkNode[][]>}
   */
  getAllShortestPaths(startNodeId, endNodeId, options) {
    return Promise.resolve().then(() => {
      if (!this.features.shortestPaths) {
        return Errors.business(
          'not_supported', 'Shortest paths are not supported by ' + this.vendor + '.', true
        );
      }

      Utils.check.object('options', options);

      // maximum path length
      const maxDepthLimit = Config.get('advanced.maxPathLength');

      const maxDepth = /**@type {number}*/ (
        Utils.tryParsePosInt(options.maxDepth, 'maxDepth', true, 15)
      );

      Utils.check.integer('maxDepth', maxDepth, 0, maxDepthLimit);

      // result count limit
      const maxResultLimit = Config.get('advanced.shortestPathsMaxResults', 10);

      // start node id
      if (Utils.noValue(startNodeId)) {
        return Errors.business('invalid_parameter', 'startNode must be defined', true);
      }
      startNodeId = this.checkNodeId('startNodeId', startNodeId);

      // end node id
      if (Utils.noValue(endNodeId)) {
        return Errors.business('invalid_parameter', 'endNode must be defined', true);
      }
      endNodeId = this.checkNodeId('endNodeId', endNodeId);

      return this.driver.$getAllShortestPaths(startNodeId, endNodeId, maxDepth, maxResultLimit);
    }).map(path => {
      return Promise.map(path, node => this._addStatistics(node, options), {
        concurrency: MAX_CONCURRENT_DIGEST_REQS
      });
    });
  }

  /**
   * List all edgeTypes, nodeCategories, edgeProperties, nodeProperties
   * that exist in the graph database.
   *
   * @returns {Bluebird<{nodeCategories: string[], edgeTypes: string[], nodeProperties: string[], edgeProperties: string[]}>}
   */
  getSimpleSchema() { return this.driver.$getSimpleSchema(); }

  /**
   * Count the number of nodes.
   *
   * @param {boolean} [approx] Allow an approximated answer
   * @returns {Bluebird<number>}
   */
  getNodeCount(approx) {
    if (!this.features.canCount) {
      return Errors.business('not_supported', 'Counting nodes is not supported ' +
        'by ' + this.vendor + '.', true);
    } else {
      return this.driver.$getNodeCount(approx);
    }
  }

  /**
   * Count the number of edges.
   *
   * @param {boolean} [approx] Allow an approximated answer
   * @returns {Bluebird<number>}
   */
  getEdgeCount(approx) {
    if (!this.features.canCount) {
      return Errors.business('not_supported', 'Counting edges is not supported ' +
        'by ' + this.vendor + '.', true);
    } else {
      return this.driver.$getEdgeCount(approx);
    }
  }

  /**
   * @param {string}           id         ID of the node to retrieve the statistics for (encoded for Linkurious)
   * @param {LkNodeStatistics} statistics Statistics object where to add the digest
   * @returns {Bluebird<void>}
   * @private
   */
  _addSupernodeStatistic(id, statistics) {
    return Promise.resolve().then(() => {
      if (Utils.noValue(statistics.supernode)) {
        return this.isSuperNode(id).then(isSuperNode => {
          statistics.supernode = isSuperNode;
        });
      }
    });
  }

  /**
   * @param {string}           id                           ID of the node to retrieve the statistics for (encoded for Linkurious)
   * @param {LkNodeStatistics} statistics                   Statistics object where to add the digest
   * @param {object}           options
   * @param {string[]}         [options.readableCategories] Exclusive list of node-categories to restrict the result
   * @param {string[]}         [options.readableTypes]      Exclusive list of edge-type to restrict the result
   * @returns {Bluebird<void>}
   * @private
   */
  _addDigestStatistic(id, statistics, options) {
    return this._addSupernodeStatistic(id, statistics).then(() => {
      if (statistics.supernode) {
        return this.getSimpleDigest(
          id, {readableTypes: options.readableTypes}
        ).then(digest => {
          statistics.supernodeDigest = digest;
        });
      }

      return this.getAdjacencyDigest([id]).then(digest => {
        statistics.digest = digest;
      });
    });
  }

  /**
   * @param {string}           id                           ID of the node to retrieve the statistics for (encoded for Linkurious)
   * @param {LkNodeStatistics} statistics                   Statistics object where to add the degree
   * @param {object}           options
   * @param {string[]}         [options.readableCategories] Exclusive list of node-categories to restrict the result
   * @param {string[]}         [options.readableTypes]      Exclusive list of edge-type to restrict the result
   * @returns {Bluebird<void>}
   * @private
   */
  _addDegreeStatistic(id, statistics, options) {
    return this._addSupernodeStatistic(id, statistics).then(() => {
      if (statistics.supernode) {
        statistics.supernodeDegree = Config.get(
          'advanced.supernodeThreshold', DEFAULT_SUPERNODE_THRESHOLD
        );
        return;
      }

      return this.getNodeDegree([id], {readableCategories: options.readableCategories,
        readableTypes: options.readableTypes
      }).then(degree => {
        statistics.degree = degree;
      });
    });
  }

  /**
   * @param {LkNode}   node                         A node without statistics
   * @param {object}   options
   * @param {boolean}  [options.withDigest]         Whether to include an adjacency digest in the result
   * @param {boolean}  [options.withDegree]         Whether to include the degree in the result
   * @param {string[]} [options.readableCategories] Exclusive list of node-categories to restrict the result
   * @param {string[]} [options.readableTypes]      Exclusive list of edge-type to restrict the result
   * @returns {Bluebird<LkNode>}
   * @private
   */
  _addStatistics(node, options) {
    if (!options.withDigest && !options.withDegree) {
      return Promise.resolve(node);
    }

    return this.getStatistics(node.id, options).then(statistics => {
      node.statistics = statistics;
      return node;
    });
  }

  /**
   * @param {string}   id                           ID of the node to retrieve the statistics for (encoded for Linkurious)
   * @param {object}   options
   * @param {boolean}  [options.withDigest]         Whether to include an adjacency digest in the result
   * @param {boolean}  [options.withDegree]         Whether to include the degree in the result
   * @param {string[]} [options.readableCategories] Exclusive list of node-categories to restrict the result
   * @param {string[]} [options.readableTypes]      Exclusive list of edge-type to restrict the result
   * @returns {Bluebird<LkNodeStatistics>}
   */
  getStatistics(id, options) {
    const statistics = {};
    return Promise.resolve().then(() => {
      if (options.withDigest) {
        return this._addDigestStatistic(id, statistics, options);
      }
    }).then(() => {
      if (options.withDegree) {
        return this._addDegreeStatistic(id, statistics, options);
      }
    }).return(statistics);
  }

  /**
   * Get a node by ID.
   *
   * @param {object}   options
   * @param {string}   options.id                   ID of the node (encoded for Linkurious)
   * @param {boolean}  [options.withEdges]          Whether to include adjacent edges
   * @param {string}   [options.alternativeId]      The property to match `options.id` on (instead of the actual ID)
   * @param {boolean}  [options.withDigest]         Whether to include an adjacency digest in the result
   * @param {boolean}  [options.withDegree]         Whether to include the degree in the result
   * @param {string[]} [options.readableCategories] Exclusive list of node-categories to restrict the result (used for the node degree)
   * @param {string[]} [options.readableTypes]      Exclusive list of edge-type to restrict the result (used for the node degree)
   *
   * @returns {Bluebird<LkNode>}
   */
  getNode(options) {
    const encodedId = options.id;
    return Promise.resolve().then(() => {

      if (Utils.noValue(options.alternativeId)) {
        options.id = this.checkNodeId('nodeId', options.id);
      } else {
        if (!this.features.alternativeIds) {
          throw Errors.business('not_supported', 'Alternative ids are not supported ' +
            'by ' + this.vendor + '.');
        }

        // getting by property
        GraphDAO.checkAlternativeId('nodeId', options.id);
      }

      // actually fetch the node
      return this.driver.$getNode(options);

    }).then(node => {
      if (!node) {
        return Errors.business('node_not_found', `Node #${encodedId} was not found.`, true);
      }

      // add adjacency digest if required
      return this._addStatistics(node, options);
    });
  }

  /**
   * Get a stream of all nodes.
   *
   * @param {object} options
   * @param {number} [options.chunkSize]
   * @param {number} [options.offset=0]
   * @returns {Bluebird<Readable<LkNode>>}
   */
  getNodeStream(options) {
    if (!this.features.canStream) {
      return Errors.business('not_supported', 'Internal indices are not supported ' +
        'by ' + this.vendor + '.', true);
    }

    return this.driver.$getNodeStream(options);
  }

  /**
   * Get a list of nodes by ID.
   *
   * @param {object}   options
   * @param {string[]} options.ids                  List of IDs to read (encoded for Linkurious)
   * @param {string}   [options.edges="none"]       "all":    Include every adjacent edges and digest
   *                                                "strict": Include only edges with both ends in the result nodes
   *                                                "none":   Don't include any edges
   * @param {boolean}  [options.ignoreMissing]      Whether to fail if there are missing nodes
   * @param {string}   [options.alternativeId]      The property to match `options.ids` on (instead of the actual IDs)
   * @param {boolean}  [options.withDigest]         Whether to include an adjacency digest in the result
   * @param {boolean}  [options.withDegree]         Whether to include the degree in the result
   * @param {string[]} [options.readableCategories] Exclusive list of node-categories to restrict the result (used for the node degree)
   * @param {string[]} [options.readableTypes]      Exclusive list of edge-type to restrict the result (used for the node degree)
   * @returns {Bluebird<LkNode[]>}
   */
  getNodesByID(options) {
    return Promise.resolve().then(() => {

      Utils.check.properties('options', options, {
        // options for higher level (in the data service)
        sourceKey: {required: false, type: 'string'},
        withVersion: {required: false, type: 'boolean'},
        // encoded node ids
        ids: {required: true, arrayItem: {type: ['string', 'number']}},
        // alternative IDs
        alternativeId: {required: false, type: 'string'},
        // edges fetching
        edges: {required: false, values: ['all', 'strict', 'none']},
        // ignore missing
        ignoreMissing: {required: false, type: 'boolean'},
        // include the digest
        withDigest: {required: false, type: 'boolean'},
        // include the degree
        withDegree: {required: false, type: 'boolean'},
        readableCategories: {arrayItem: {required: false, type: 'string'}},
        readableTypes: {arrayItem: {required: false, type: 'string'}}
      });
      if (Utils.noValue(options.edges)) { options.edges = 'none'; }

      // trivial case
      if (options.ids.length === 0) { return []; }

      const encodedNodeIds = options.ids;

      // decode IDs
      if (Utils.noValue(options.alternativeId)) {
        options.ids = this.checkNodeIds('options.ids', options.ids, 0);
      } else {
        if (!this.features.alternativeIds) {
          return Errors.business(
            'not_supported', `Alternative ids are not supported by ${this.vendor}.`, true
          );
        }

        GraphDAO.checkAlternativeIds('options.ids', options.ids, 0);
      }

      return this.driver.$getNodesByID(
        // Property 'edges' is mandatory in $getNodesByID, but it's set
        /**@type{{ids: any[], edges: string, alternativeId?: string}}*/ (options)
      ).then(nodes => {
        if (!options.ignoreMissing) {
          DaoUtils.checkMissing('node', encodedNodeIds, nodes, options.alternativeId);
        }

        return nodes;
      });
    }).map(node => this._addStatistics(node, options), {
      concurrency: MAX_CONCURRENT_DIGEST_REQS
    });
  }

  /**
   * Get a list of edges by ID.
   *
   * @param {object}   options
   * @param {string[]} options.ids             List of IDs to read (encoded for Linkurious)
   * @param {boolean}  [options.ignoreMissing] Whether to fail if there are missing nodes
   * @param {string}   [options.alternativeId] The property to match `options.ids` on (instead of the actual IDs)
   * @returns {Bluebird<LkEdge[]>}
   */
  getEdgesByID(options) {
    return Promise.resolve().then(() => {

      Utils.check.properties('options', options, {
        // options for higher level (in the data service)
        sourceKey: {required: false, type: 'string'},
        withVersion: {required: false, type: 'boolean'},
        // node ids
        ids: {required: true, type: 'array'},
        // alternative IDs
        alternativeId: {required: false, type: 'string'},
        // ignore missing
        ignoreMissing: {required: false, type: 'boolean'}
      });

      // trivial case
      if (options.ids.length === 0) { return []; }

      const encodedEdgeIds = options.ids;

      // decode IDs
      if (Utils.noValue(options.alternativeId)) {
        options.ids = this.checkEdgeIds('options.ids', options.ids);
      } else {
        if (!this.features.alternativeIds) {
          throw Errors.business('not_supported', 'Alternative ids are not supported ' +
            'by ' + this.vendor + '.');
        }

        GraphDAO.checkAlternativeIds('options.ids', options.ids, 0);
      }

      return this.driver.$getEdgesByID(options).then(edges => {
        if (!options.ignoreMissing) {
          DaoUtils.checkMissing('edge', encodedEdgeIds, edges, options.alternativeId);
        }

        return edges;
      });
    });
  }

  /**
   * Get the neighbors of a subset of nodes.
   *
   * @param {string[]} nodeIds                      IDs of the node to retrieve the neighbors for (encoded for Linkurious)
   * @param {object}   options
   * @param {string[]} [options.ignoredNodeIds]     IDs of nodes we do not want in the results (encoded for Linkurious)
   * @param {string[]} [options.visibleNodeIds]     IDs of nodes already visible in the visualization (encoded for Linkurious)
   *                                                We won't return them but we return edges to them
   * @param {string}   [options.nodeCategory]       A node category to filter on (only this category in results)
   *                                                '[no_category]' for nodes with  no categories
   * @param {string}   [options.edgeType]           An edge type to filter on (expand following only edges of this type)
   * @param {number}   [options.limit]              Max number of nodes in result
   * @param {string}   [options.limitType="id"]     "id", "lowestDegree" or "highestDegree" to sort results before limiting
   * @param {boolean}  [options.withDigest]         Whether to include an adjacency digest in the result
   * @param {boolean}  [options.withDegree]         Whether to include the degree in the result
   * @param {string[]} [options.readableCategories] Exclusive list of node-categories to restrict the result
   * @param {string[]} [options.readableTypes]      Exclusive list of edge-type to restrict the result
   * @returns {Bluebird<LkNode[]>}
   */
  getAdjacentNodes(nodeIds, options) {
    return Promise.resolve().then(() => {

      // node ids
      nodeIds = this.checkNodeIds('ids', nodeIds, 1);

      // options
      if (Utils.noValue(options)) { options = {}; }
      Utils.check.object('options', options);

      // ignored node ids
      if (Utils.noValue(options.ignoredNodeIds)) { options.ignoredNodeIds = []; }
      options.ignoredNodeIds = this.checkNodeIds('ignoredNodeIds', options.ignoredNodeIds);

      // visible node ids
      if (Utils.noValue(options.visibleNodeIds)) { options.visibleNodeIds = []; }
      options.visibleNodeIds = this.checkNodeIds('visibleNodeIds', options.visibleNodeIds);

      let categories;
      let types;
      // node category
      if (Utils.hasValue(options.nodeCategory)) {
        Utils.check.string('nodeCategory', options.nodeCategory, true);
        categories = [options.nodeCategory];
      } else {
        categories = options.readableCategories;
      }

      // edge type
      if (Utils.hasValue(options.edgeType)) {
        Utils.check.string('edgeType', options.edgeType, true);
        types = [options.edgeType];
      } else {
        types = options.readableTypes;
      }

      // limit
      if (Utils.hasValue(options.limit)) {
        Utils.check.integer('limit', options.limit, 1, 1000000);
      }

      // limit type
      if (Utils.noValue(options.limitType)) { options.limitType = 'id'; }
      Utils.check.values('limitType', options.limitType, ['id', 'lowestDegree', 'highestDegree']);

      return this.driver.$getAdjacentNodes(
        // @ts-ignore Properties 'ignoredNodeIds' and 'visibleNodeIds' are mandatory in $getAdjacentNodes, but they are set
        nodeIds, _.merge({categories: categories, types: types}, options)
      );
    }).map(node => this._addStatistics(node, options), {
      concurrency: MAX_CONCURRENT_DIGEST_REQS
    });
  }

  /**
   * Provide a neighborhood simple digest for a specific node.
   *
   * @param {string}   nodeId                  ID of the node (encoded for Linkurious)
   * @param {object}   options
   * @param {string[]} [options.readableTypes] Exclusive list of edge-type to restrict the result
   * @returns {Bluebird<LkSimpleDigestItem[]>}
   */
  getSimpleDigest(nodeId, options) {
    return Promise.resolve().then(() => {
      if (!this.features.detectSupernodes) {
        throw Errors.business('not_supported', 'Computing the simple digest is not supported ' +
          'by ' + this.vendor + '.');
      }

      nodeId = this.checkNodeId('nodeId', nodeId);

      return this.driver.$getSimpleDigest(nodeId, options);
    });
  }

  /**
   * Provide a neighborhood digest of a specified subset of nodes.
   *
   * @param {string[]} nodeIds IDs of the nodes (encoded for Linkurious)
   * @returns {Bluebird<LkDigestItem[]>}
   */
  getAdjacencyDigest(nodeIds) {
    return Promise.resolve().then(() => {
      // @backward-compatibility cast single values into an array
      if (Utils.hasValue(nodeIds) && !Array.isArray(nodeIds)) {
        nodeIds = [nodeIds];
      }

      // check if the array has legal ids
      nodeIds = this.checkNodeIds('nodeIds', nodeIds, 1);

      return this.driver.$getAdjacencyDigest(nodeIds);
    });
  }

  /**
   * Return `true` if the node is a supernode.
   * A supernode is a node with a number of relationships greater than `supernodeThreshold`.
   * Return `false` if the node is not found.
   *
   * @param {string} nodeId
   * @returns {Bluebird<boolean>}
   */
  isSuperNode(nodeId) {
    if (!this.features.detectSupernodes) {
      return Promise.resolve(false);
    }

    const supernodeThreshold = Config.get(
      'advanced.supernodeThreshold', DEFAULT_SUPERNODE_THRESHOLD
    );

    return this.driver.$isSuperNode(nodeId, supernodeThreshold);
  }

  /**
   * Return the degree of the specified node if `nodeIds` has cardinality 1.
   * If multiple `nodeIds` are specified, return the cardinality of the intersection
   * of the neighbors of the nodes (not including the nodes in input themselves).
   *
   * @param {string[]} nodeIds                      IDs of the nodes (encoded for Linkurious)
   * @param {object}   options
   * @param {string[]} [options.readableCategories] Exclusive list of node-categories to restrict the result
   * @param {string[]} [options.readableTypes]      Exclusive list of edge-type to restrict the result
   * @returns {Bluebird<number>}
   */
  getNodeDegree(nodeIds, options) {
    return Promise.resolve().then(() => {
      // @backward-compatibility cast single values into an array
      if (Utils.hasValue(nodeIds) && !Array.isArray(nodeIds)) {
        nodeIds = [nodeIds];
      }

      // check if the array has legal ids
      nodeIds = this.checkNodeIds('nodeIds', nodeIds, 1);

      return this.driver.$getNodeDegree(nodeIds, options);
    });
  }

  /**
   * Create a node.
   *
   * @param {LkNodeAttributes} newNode
   * @returns {Bluebird<LkNode>}
   */
  createNode(newNode) {
    return Promise.resolve().then(() => {
      // node
      Utils.check.object('newNode', newNode);

      // clone to avoid modifying the original parameter
      newNode = Utils.clone(newNode);

      // node properties (an empty property key is not allowed)
      this._checkNoEmptyPropertyKey(newNode.data);
      newNode.data = this._normalizeProperties(newNode.data);

      // node categories (an empty category is not allowed)
      Utils.check.stringArray(
        'categories',
        newNode.categories,
        this.features.minNodeCategories,
        this.features.maxNodeCategories,
        true
      );

      // if empty nodes are not allowed, check that we have some properties or categories
      if (!this.features.emptyNodes && this._isEmptyNode(newNode)) {
        return Errors.business(
          'invalid_parameter',
          'A node must have at least one property or one category.',
          true
        );
      }

      return this.driver.$createNode(newNode);
    }).then(node => {
      if (!node) {
        return Errors.business('creation_failed', 'Could not create the given node.', true);
      }

      return node;
    });
  }

  /**
   * Update the properties and categories of a node.
   * Check if the node exists and fail if it doesn't.
   *
   * @param {string}   nodeId                            ID of the node to update (encoded for Linkurious)
   * @param {object}   nodeUpdate
   * @param {any}      [nodeUpdate.data]                 Properties to update
   * @param {string[]} [nodeUpdate.deletedProperties=[]] Properties to delete
   * @param {string[]} [nodeUpdate.addedCategories=[]]   Categories to add
   * @param {string[]} [nodeUpdate.deletedCategories=[]] Categories to delete
   * @returns {Bluebird<LkNode>}
   */
  updateNode(nodeId, nodeUpdate) {
    const encodedId = nodeId;
    return Promise.resolve().then(() => {
      // node id
      nodeId = this.checkNodeId('nodeId', nodeId);

      // node
      Utils.check.object('nodeUpdate', nodeUpdate);

      // clone to avoid modifying the original parameter
      nodeUpdate = Utils.clone(nodeUpdate);

      // node properties
      if (Utils.noValue(nodeUpdate.data)) { nodeUpdate.data = []; }
      this._checkNoEmptyPropertyKey(nodeUpdate.data);
      nodeUpdate.data = this._normalizeProperties(nodeUpdate.data);

      // properties to delete
      if (Utils.noValue(nodeUpdate.deletedProperties)) { nodeUpdate.deletedProperties = []; }
      Utils.check
        .stringArray('deletedProperties', nodeUpdate.deletedProperties, 0, undefined, true);

      // categories to add
      if (Utils.noValue(nodeUpdate.addedCategories)) { nodeUpdate.addedCategories = []; }
      Utils.check.stringArray('addedCategories', nodeUpdate.addedCategories, 0, undefined, true);

      // categories to delete
      if (Utils.noValue(nodeUpdate.deletedCategories)) { nodeUpdate.deletedCategories = []; }
      Utils.check.stringArray(
        'deletedCategories', nodeUpdate.deletedCategories, 0, undefined, true
      );

      // category immutability check
      if (this.features.immutableNodeCategories) {
        if (nodeUpdate.addedCategories.length) {
          return Errors.business(
            'not_implemented', 'Cannot add categories to a node (immutable).', true
          );
        }
        if (nodeUpdate.deletedCategories.length) {
          return Errors.business(
            'not_implemented', 'Cannot delete categories from a node (immutable).', true
          );
        }
      }

      // @ts-ignore Properties 'data', 'deletedProperties', 'addedCategories' and 'deletedCategories' are mandatory in $updateNode, but they are set
      return this.driver.$updateNode(nodeId, nodeUpdate).then(node => {
        if (!node) {
          return Errors.business('node_not_found', `Node #${encodedId} was not found.`, true);
        }
        return node;
      });
    });
  }

  /**
   * Delete a node and all edges connected to it.
   *
   * @param {string} nodeId ID of the node to delete (encoded for Linkurious)
   * @returns {Bluebird<void>}
   */
  deleteNode(nodeId) {
    const encodedId = nodeId;
    return Promise.resolve().then(() => {

      // node id
      nodeId = this.checkNodeId('nodeId', nodeId);

      return this.driver.$deleteNode(nodeId).then(found => {
        if (found) { return; }

        return Errors.business('node_not_found', `Node #${encodedId} was not found.`, true);
      });
    });
  }

  /**
   * Get the adjacent edges of a node.
   * The adjacent, source and target options are mutually exclusive.
   *
   * @param {object} options
   * @param {string} options.adjacent ID of the node (for in AND out edges) (encoded for Linkurious)
   * @param {string} options.source   ID of the node (for out edges ONLY) (encoded for Linkurious)
   * @param {string} options.target   ID of the node (for in edges ONLY) (encoded for Linkurious)
   * @param {string} [options.type]   An edge type to filter on (expand following only edges of this type)
   * @param {number} [options.skip]   For pagination
   * @param {number} [options.limit]  For pagination
   * @returns {Bluebird<LkEdge[]>}
   */
  getAdjacentEdges(options) {
    return Promise.resolve().then(() => {

      // adjacent / source / target
      Utils.check.exclusive('options', options, ['adjacent', 'source', 'target'], true);

      // get node id and edge orientation
      let nodeId = options.adjacent;
      let orientation = 'both';
      if (Utils.noValue(nodeId)) {
        nodeId = options.source;
        orientation = 'source';
      }
      if (Utils.noValue(nodeId)) {
        nodeId = options.target;
        orientation = 'target';
      }

      // check node id
      nodeId = this.checkNodeId(orientation, nodeId);

      // check edge type
      if (Utils.hasValue(options.type)) {
        Utils.check.string('type', options.type, true);
      }

      // check skip
      if (Utils.hasValue(options.skip)) {
        Utils.check.integer('skip', options.skip, 0);
      }

      if (Utils.hasValue(options.limit)) {
        Utils.check.integer('limit', options.limit, 1);
      }

      return this.driver.$getAdjacentEdges({
        nodeId: nodeId,
        orientation: orientation,
        type: options.type,
        skip: options.skip,
        limit: options.limit
      });
    });
  }

  /**
   * Get an edge by id.
   *
   * @param {object} options
   * @param {string} options.id              ID of the edge (encoded for Linkurious)
   * @param {string} [options.alternativeId] The property to match `options.id` on (instead of the actual ID)
   * @returns {Bluebird<LkEdge>}
   */
  getEdge(options) {
    const encodedId = options.id;
    return Promise.resolve().then(() => {
      if (Utils.noValue(options.alternativeId)) {
        // if getting by native ID
        options.id = this.checkEdgeId('edgeId', options.id);
      } else {
        if (!this.features.alternativeIds) {
          throw Errors.business('not_supported', 'Alternative ids are not supported ' +
            'by ' + this.vendor + '.');
        }

        // if getting by property
        GraphDAO.checkAlternativeId('id', options.id);
      }

      return this.driver.$getEdge(options);
    }).then(edge => {
      if (!edge) {
        return Errors.business('edge_not_found', `Edge #${encodedId} was not found.`, true);
      }
      return edge;
    });
  }

  /**
   * Get the extremities of the given edge IDs. Each edge is included in the result
   * (in the target and source node).
   *
   * @param {string[]} edgeIds                      IDs of the edges (encoded for Linkurious)
   * @param {object}   options
   * @param {boolean}  [options.withDigest]         Whether to include an adjacency digest in the result
   * @param {boolean}  [options.withDegree]         Whether to include the degree in the result
   * @param {string[]} [options.readableCategories] Exclusive list of node-categories to restrict the result (used for the node degree)
   * @param {string[]} [options.readableTypes]      Exclusive list of edge-type to restrict the result (used for the node degree)
   * @returns {Bluebird<LkNode[]>}
   */
  getNodesByEdgesID(edgeIds, options) {
    return Promise.resolve().then(() => {

      Utils.check.object('options', options);

      // solve trivial case
      if (edgeIds.length === 0) { return []; }

      // check edge ids
      edgeIds = this.checkEdgeIds('edgeIds', edgeIds, 1);

      return this.driver.$getNodesByEdgesID(edgeIds);
    }).map(node => this._addStatistics(node, options), {
      concurrency: MAX_CONCURRENT_DIGEST_REQS
    });
  }

  /**
   * Get a stream of all edges.
   *
   * @param {object} options
   * @param {number} [options.chunkSize]
   * @param {number} [options.offset=0]
   * @returns {Bluebird<Readable<LkEdge>>}
   */
  getEdgeStream(options) {
    if (!this.features.canStream) {
      return Errors.business('not_supported', 'Internal indices are not supported ' +
        'by ' + this.vendor + '.', true);
    }

    return this.driver.$getEdgeStream(options);
  }

  /**
   * Create an edge.
   *
   * @param {LkEdgeAttributes} newEdge The edge to create
   * @returns {Bluebird<LkEdge>}
   */
  createEdge(newEdge) {
    return Promise.resolve().then(() => {
      Utils.check.object('newEdge', newEdge);

      // clone to avoid updating the original parameter
      newEdge = Utils.clone(newEdge);

      // check if source and target are defined
      if (Utils.noValue(newEdge.source) || Utils.noValue(newEdge.target)) {
        return Errors.business('missing_field', 'Missing source and/or target.', true);
      }

      // check if source and target are legal node ids
      newEdge.source = this.checkNodeId('source', newEdge.source);
      newEdge.target = this.checkNodeId('target', newEdge.target);

      // check if edge type is legal
      Utils.check.string('type', newEdge.type, true);

      // check properties (an empty property key is not allowed)
      if (Utils.noValue(newEdge.data)) { newEdge.data = {}; }
      this._checkNoEmptyPropertyKey(newEdge.data);
      newEdge.data = this._normalizeProperties(newEdge.data, true);

      if (!this.features.edgeProperties && !_.isEqual(newEdge.data, {})) {
        throw Errors.business('not_supported', 'Edge properties are not supported ' +
          'by ' + this.vendor + '.');
      }

      return this.driver.$createEdge(newEdge);
    }).then(edge => {
      if (!edge) {
        return Errors.business('creation_failed', 'Could not create the given edge.', true);
      }
      return edge;
    });
  }

  /**
   * Update an edge content.
   * It's not possible to update the type of an edge.
   *
   * @param {string}   edgeId                            ID of the edge (encoded for Linkurious)
   * @param {object}   edgeUpdate
   * @param {any}      [edgeUpdate.data]                 Properties updates
   * @param {string}   [edgeUpdate.type]                 Fail if this is defined
   * @param {string[]} [edgeUpdate.deletedProperties=[]] Properties to delete
   * @returns {Bluebird<LkEdge>}
   */
  updateEdge(edgeId, edgeUpdate) {
    const encodedId = edgeId;
    return Promise.resolve().then(() => {

      if (!this.features.edgeProperties) {
        throw Errors.business('not_supported', 'Edge properties are not supported ' +
          'by ' + this.vendor + '.');
      }

      // check edgeUpdate
      Utils.check.object('edgeUpdate', edgeUpdate);

      // clone to avoid modifying the original parameter
      edgeUpdate = Utils.clone(edgeUpdate);

      // check edge id
      edgeId = this.checkEdgeId('edgeId', edgeId);

      // check delete properties
      if (Utils.noValue(edgeUpdate.deletedProperties)) { edgeUpdate.deletedProperties = []; }
      Utils.check
        .stringArray('deletedProperties', edgeUpdate.deletedProperties, 0, undefined, true);

      // check added/updated properties
      if (Utils.noValue(edgeUpdate.data)) { edgeUpdate.data = {}; }
      this._checkNoEmptyPropertyKey(edgeUpdate.data);

      // normalize properties
      edgeUpdate.data = this._normalizeProperties(edgeUpdate.data, true);

      // check edge type (immutable)
      if (Utils.hasValue(edgeUpdate.type)) {
        return Errors.business('not_implemented', 'Cannot change the type of an edge.', true);
      }

      return this.driver.$updateEdge(
        edgeId,
        // Properties 'data' and 'deletedProperties' are mandatory in $updateEdge, but they are set
        /**@type {{data: any, deletedProperties: string[]}}*/ (edgeUpdate)
      ).then(edge => {
        if (!edge) {
          return Errors.business('edge_not_found', `Edge #${encodedId} was not found.`, true);
        }
        return edge;
      });
    });
  }

  /**
   * Delete an edge.
   *
   * @param {string} edgeId ID of the edge (encoded for Linkurious)
   * @returns {Bluebird<void>}
   */
  deleteEdge(edgeId) {
    const encodedId = edgeId;
    return Promise.resolve().then(() => {

      // check edge id
      edgeId = this.checkEdgeId('edgeId', edgeId);

      return this.driver.$deleteEdge(edgeId).then(found => {
        if (found) { return; }

        return Errors.business(
          'edge_not_found', `Edge #${encodedId} was not found.`, true
        );
      });
    });
  }

  /**
   * Run a raw query.
   *
   * If options.populated is true, return a Readable<QueryMatchPopulated>, otherwise a Readable<QueryMatch>.
   *
   * @param {object}   options
   * @param {string}   [options.dialect]            Supported graph query dialect
   * @param {string}   options.query                The graph query
   * @param {boolean}  [options.canWrite]           Whether the query is allowed to alter the data
   * @param {boolean}  [options.populated=true]     Whether to return QueryMatchPopulated or QueryMatch
   * @param {number}   options.limit                Maximum number of matched subgraphs
   * @param {boolean}  [options.withDigest]         Whether to include an adjacency digest in the result (only if options.populated is true)
   * @param {boolean}  [options.withDegree]         Whether to include the degree in the result (only if options.populated is true)
   * @param {string[]} [options.readableCategories] Exclusive list of node-categories to restrict the result (used for the node degree)
   * @param {string[]} [options.readableTypes]      Exclusive list of edge-type to restrict the result (used for the node degree)
   * @returns {Bluebird<Readable<(QueryMatch | QueryMatchPopulated)>>}
   */
  rawQuery(options) {
    return Promise.resolve().then(() => {
      options = _.defaults(options, {canWrite: false, populated: true});

      if (options.dialect === undefined || options.dialect === null || options.dialect === '') {
        // The empty string check is to fix ClientV1 side issue #773
        options.dialect = this.features.dialects[0];
      }

      Utils.check.string('options.dialect', options.dialect, true);
      this._checkDialect(options.dialect, true);
      Utils.check.string('options.query', options.query, true);
      Utils.check.boolean('options.canWrite', options.canWrite);
      Utils.check.boolean('options.populated', options.populated);
      Utils.check.integer('options.limit', options.limit, 1, Config.get('alerts.maxMatchesLimit'));

      return this.driver.$rawQuery({
        dialect: options.dialect,
        query: options.query,
        canWrite: options.canWrite,
        populated: options.populated,
        limit: options.limit
      });
    }).then(readableStream => {
      if (!options.populated) {
        // we can't add statistics if the result is not populated
        return readableStream;
      }

      const self = this;

      readableStream.resume();

      return Utils.safePipe(readableStream, through(function(match) {
        // stop the flow to be able to retrieve the digest
        this.pause();

        Promise.map(match.nodes, node => self._addStatistics(node, options), {
          concurrency: MAX_CONCURRENT_DIGEST_REQS
        }).then(nodes => {
          match.nodes = nodes;

          this.emit('data', match);
          this.resume();
        });
      }));
    });
  }

  /**
   * Return true if the node specified is empty.
   *
   * @param {LkNode | LkNodeAttributes} node
   * @returns {boolean}
   * @private
   */
  _isEmptyNode(node) {
    return this.driver.$isEmptyNode(node);
  }
}

module.exports = GraphDAO;
