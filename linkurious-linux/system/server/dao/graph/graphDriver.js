/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-07-26.
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
const Driver = require('../driver');
const DaoUtils = require('../utils/daoUtils');

class GraphDriver extends Driver {

  /**
   * Abstract Graph Driver constructor
   *
   * @param {Connector} connector     Connector used by the DAO
   * @param {any}       graphOptions  GraphDAO options
   * @param {any}       connectorData Data from the connector
   * @constructor
   */
  constructor(connector, graphOptions, connectorData) {
    super(connector, graphOptions, connectorData);
    this._connector = connector;
    this._graphOptions = graphOptions;
    this._connectorData = connectorData;
  }

  /**
   * Special properties that can't be read, created or updated.
   *
   * Optional to implement.
   *
   * @type {Array<{key: string, read: boolean, create: boolean, update: boolean}>}
   */
  get $specialProperties() {
    return [];
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
  $checkEdgeId(key, id, skipDecoding) {
    return Utils.NOT_IMPLEMENTED();
  }

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
  $checkNodeId(key, id, skipDecoding) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Called at the begin of the internal indexation phase for additional initializations.
   * Not called for external indices.
   *
   * Optional to implement.
   * Implement only if features.canStream is true.
   *
   * @returns {Bluebird<void>}
   */
  $onInternalIndexation() {
    return Promise.resolve();
  }

  /**
   * Get all the shortest paths between a pair of nodes.
   * Edges have to appear only on the first node in the path.
   *
   * Implement only if features.shortestPaths is true.
   *
   * @param {any}    startNodeId ID of the starting node (decoded for the graph database)
   * @param {any}    endNodeId   ID of the ending node (decoded for the graph database)
   * @param {number} maxDepth    Max depth of the search
   * @param {number} resultLimit Max number of returned paths
   * @returns {Bluebird<LkNode[][]>} paths between the starting node and the ending node
   */
  $getAllShortestPaths(startNodeId, endNodeId, maxDepth, resultLimit) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * List all edgeTypes, nodeCategories, edgeProperties, nodeProperties
   * that exist in the graph database.
   *
   * @returns {Bluebird<{nodeCategories: string[], edgeTypes: string[], nodeProperties: string[], edgeProperties: string[]}>}
   */
  $getSimpleSchema() {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Count the number of nodes.
   *
   * Implement only if features.canCount is true.
   *
   * @param {boolean} [approx] Allow an approximated answer
   * @returns {Bluebird<number>}
   */
  $getNodeCount(approx) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Count the number of edges.
   *
   * Implement only if features.canCount is true.
   *
   * @param {boolean} [approx] Allow an approximated answer
   * @returns {Bluebird<number>}
   */
  $getEdgeCount(approx) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Get a node by ID.
   *
   * Support options.alternativeId only if features.alternativeIds is true.
   *
   * @param {object}  options
   * @param {any}     options.id              ID of the node (decoded for the graph database)
   * @param {boolean} [options.withEdges]     Whether to include adjacent edges
   * @param {string}  [options.alternativeId] The property to match `options.id` on (instead of the actual ID)
   * @returns {Bluebird<LkNode>} null if not found
   */
  $getNode(options) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Get a stream of all nodes.
   *
   * Implement only if features.canStream is true.
   *
   * @param {object} options
   * @param {number} [options.chunkSize]
   * @param {number} [options.offset=0]
   * @returns {Bluebird<Readable<LkNode>>}
   */
  $getNodeStream(options) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Get a list of nodes by ID.
   *
   * Support options.alternativeId only if features.alternativeIds is true.
   *
   * @param {object} options
   * @param {any[]}  options.ids             List of IDs to read (decoded for the graph database)
   * @param {string} options.edges           "all":    Include every adjacent edges and digest
   *                                         "strict": Include only edges with both ends in the result nodes
   *                                         "none":   Don't include any edges
   * @param {string} [options.alternativeId] The property to match `options.ids` on (instead of the actual IDs)
   * @returns {Bluebird<LkNode[]>}
   */
  $getNodesByID(options) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Get a list of edges by ID.
   *
   * Support options.alternativeId only if features.alternativeIds and features.edgeProperties are true.
   *
   * @param {object} options
   * @param {any[]}  options.ids             List of IDs to read (decoded for the graph database)
   * @param {string} [options.alternativeId] The property to match `options.ids` on (instead of the actual IDs)
   * @returns {Bluebird<LkEdge[]>}
   */
  $getEdgesByID(options) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Get the neighbors of a subset of nodes.
   *
   * This method is responsible to check that all the source nodes have been found.
   *
   * @param {any[]}    nodeIds                IDs of the nodes to retrieve the neighbors for (decoded for the graph database)
   * @param {object}   options
   * @param {any[]}    options.ignoredNodeIds IDs of nodes we do not want in the results (decoded for the graph database)
   * @param {any[]}    options.visibleNodeIds IDs of nodes already visible in the visualization (decoded for the graph database)
   *                                          We won't return them but we return edges to them
   * @param {number}   [options.limit]        Max number of nodes in result
   * @param {string}   options.limitType      "id", "lowestDegree" or "highestDegree" to sort results before limiting
   * @param {string[]} [options.categories]   Exclusive list of node-categories to restrict the result
   * @param {string[]} [options.types]        Exclusive list of edge-type to restrict the result
   * @returns {Bluebird<LkNode[]>}
   */
  $getAdjacentNodes(nodeIds, options) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Provide a neighborhood simple digest for a specific node.
   *
   * Implement only if features.detectSupernodes is true.
   *
   * @param {string}   nodeId                  ID of the node (encoded for Linkurious)
   * @param {object}   options
   * @param {string[]} [options.readableTypes] Exclusive list of edge-type to restrict the result
   * @returns {Bluebird<LkSimpleDigestItem[]>}
   */
  $getSimpleDigest(nodeId, options) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Provide a neighborhood digest of a specified subset of nodes.
   *
   * @param {any[]} nodeIds IDs of the nodes (decoded for the graph database)
   * @returns {Bluebird<LkDigestItem[]>}
   */
  $getAdjacencyDigest(nodeIds) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Return `true` if the node is a supernode.
   * A supernode is a node with a number of relationships greater or equal than `supernodeThreshold`.
   * Return `false` if the node is not found.
   *
   * Implement only if features.detectSupernodes is true.
   *
   * @param {string} nodeId
   * @param {number} supernodeThreshold
   * @returns {Bluebird<boolean>}
   */
  $isSuperNode(nodeId, supernodeThreshold) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Return the degree of the specified node if `nodeIds` has cardinality 1.
   * If multiple `nodeIds` are specified, return the cardinality of the intersection
   * of the neighbors of the nodes (not including the nodes in input themselves).
   *
   * @param {any[]}    nodeIds                      IDs of the nodes (decoded for the graph database)
   * @param {object}   options
   * @param {string[]} [options.readableCategories] Exclusive list of node-categories to restrict the result
   * @param {string[]} [options.readableTypes]      Exclusive list of edge-type to restrict the result
   * @returns {Bluebird<number>}
   */
  $getNodeDegree(nodeIds, options) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Create a node.
   *
   * Support empty nodes (no categories and no data) only if features.emptyNodes is true.
   *
   * @param {LkNodeAttributes} newNode
   * @returns {Bluebird<LkNode>}
   */
  $createNode(newNode) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Update the properties and categories of a node.
   * Check if the node exists and fail if it doesn't.
   *
   * Support to update the node categories only if features.immutableNodeCategories is false.
   * Throw an error if features.emptyNodes is not respected.
   * Throw an error if features.minNodeCategories or features.maxNodeCategories are not respected.
   *
   * @param {any}      nodeId                       ID of the node to update (decoded for the graph database)
   * @param {object}   nodeUpdate
   * @param {any}      nodeUpdate.data              Properties to update
   * @param {string[]} nodeUpdate.deletedProperties Properties to delete
   * @param {string[]} nodeUpdate.addedCategories   Categories to add
   * @param {string[]} nodeUpdate.deletedCategories Categories to delete
   * @returns {Bluebird<LkNode>} null if not found
   */
  $updateNode(nodeId, nodeUpdate) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Delete a node and all edges connected to it.
   *
   * @param {any} nodeId ID of the node to delete (decoded for the graph database)
   * @returns {Bluebird<boolean>} true if deleted
   */
  $deleteNode(nodeId) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Get the adjacent edges of a node.
   * The adjacent, source and target options are mutually exclusive.
   *
   * @param {object} options
   * @param {any}    options.nodeId       ID of the node (decoded for the graph database)
   * @param {string} options.orientation 'source', 'target' or 'both'
   * @param {string} [options.type]       An edge type to filter on (expand following only edges of this type)
   * @param {number} [options.skip]       For pagination
   * @param {number} [options.limit]      For pagination
   * @returns {Bluebird<LkEdge[]>}
   */
  $getAdjacentEdges(options) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Get an edge by id.
   *
   * Support options.alternativeId only if features.alternativeIds and features.edgeProperties are true.
   *
   * @param {object} options
   * @param {any}    options.id              ID of the edge (decoded for the graph database)
   * @param {string} [options.alternativeId] The property to match `options.id` on (instead of the actual ID)
   * @returns {Bluebird<LkEdge>} null if not found
   */
  $getEdge(options) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Get the extremities of the given edge IDs. Each edge is included in the result
   * (in the target and source node).
   *
   * This method is responsible to check that all the edge ids have been found.
   *
   * Optional to implement.
   *
   * @param {any[]} edgeIds IDs of the edges (decoded for the graph database)
   * @returns {Bluebird<LkNode[]>}
   */
  $getNodesByEdgesID(edgeIds) {
    // Driver independent implementation of $getNodesByEdgesID
    return this.$getEdgesByID({ids: edgeIds}).then(edges => {
      DaoUtils.checkMissing('edge', edgeIds, edges);

      const nodeIdsSet = new Set();
      edges.forEach(edge => {
        nodeIdsSet.add(edge.source);
        nodeIdsSet.add(edge.target);
      });

      const nodeIds = Array.from(nodeIdsSet);

      return this.$getNodesByID({ids: nodeIds, edges: 'none'}).then(nodes => {
        return DaoUtils.populateNodesWithEdges(nodes, edges, 'all');
      });
    });
  }

  /**
   * Get a stream of all edges.
   *
   * Implement only if features.canStream is true.
   *
   * @param {object} options
   * @param {number} [options.chunkSize]
   * @param {number} [options.offset=0]
   * @returns {Bluebird<Readable<LkEdge>>}
   */
  $getEdgeStream(options) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Create an edge.
   *
   * This method is responsible to check that source and target nodes have been found.
   *
   * Support to create an edge with data only if features.edgeProperties is true.
   *
   * @param {LkEdgeAttributes} newEdge The edge to create
   * @returns {Bluebird<LkEdge>}
   */
  $createEdge(newEdge) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Update an edge content.
   * It's not possible to update the type of an edge.
   *
   * Implement only if features.edgeProperties is true.
   *
   * @param {any}      edgeId                       ID of the edge (decoded for the graph database)
   * @param {object}   edgeUpdate
   * @param {any}      edgeUpdate.data              Properties updates
   * @param {string[]} edgeUpdate.deletedProperties Properties to delete
   * @returns {Bluebird<LkEdge>} null if not found
   */
  $updateEdge(edgeId, edgeUpdate) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Delete an edge.
   *
   * @param {any} edgeId ID of the edge (decoded for the graph database)
   * @returns {Bluebird<boolean>} true if deleted
   */
  $deleteEdge(edgeId) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Run a raw query.
   *
   * If options.populated is true, return a Readable<QueryMatchPopulated>, otherwise a Readable<QueryMatch>.
   *
   * Support options.dialect only if it appears in features.dialects.
   *
   * @param {object}  options
   * @param {string}  options.dialect   Supported graph query dialect
   * @param {string}  options.query     The graph query
   * @param {boolean} options.canWrite  Whether the query is allowed to alter the data
   * @param {boolean} options.populated Whether to return QueryMatchPopulated or QueryMatch
   * @param {number}  options.limit     Maximum number of matched subgraphs
   * @returns {Bluebird<Readable<(QueryMatch | QueryMatchPopulated)>>}
   */
  $rawQuery(options) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Return true if the node specified is empty.
   *
   * Implement only if features.emptyNodes is false.
   *
   * @param {LkNode | LkNodeAttributes} node
   * @returns {boolean}
   */
  $isEmptyNode(node) {
    return Utils.NOT_IMPLEMENTED();
  }
}

module.exports = GraphDriver;
