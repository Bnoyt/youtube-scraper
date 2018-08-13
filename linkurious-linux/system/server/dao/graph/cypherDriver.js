/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-10-09.
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');
const through = require('through');

// services
const LKE = require('../../services');
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();

// locals
const GraphDriver = require('./graphDriver');
const CypherUtils = require('./../utils/cypherUtils');
const DaoUtils = require('./../utils/daoUtils');

// Batch size for retrieving items by id
const SLICED_QUERY_SIZE = 400;

class CypherDriver extends GraphDriver {

  /**
   * Get the connector used by the DAO.
   *
   * @type {CypherConnector}
   */
  get connector() {
    return this._connector;
  }

  /**
   * Create a node.
   *
   * @param {LkNodeAttributes} newNode
   * @returns {Bluebird<LkNode>}
   */
  $createNode(newNode) {
    let sLabel = '';
    if (newNode.categories.length > 0) {
      sLabel = ':' + newNode.categories.map(
        category => CypherUtils.encodeName(category)).join((':'));
    }

    return this.connector.$doCypherQuery(
      `CREATE (n${sLabel} {data}) RETURN n`, {data: newNode.data}, true
    ).then(response => {
      return response.results[0].nodes[0];
    });
  }

  /**
   * Create an edge.
   *
   * This method is responsible to check that source and target nodes have been found.
   *
   * @param {LkEdgeAttributes} newEdge The edge to create
   * @returns {Bluebird<LkEdge>}
   */
  $createEdge(newEdge) {
    return this.connector.$doCypherQuery(
      `MATCH (a), (b) WHERE id(a) = ${newEdge.source} AND id(b) = ${newEdge.target}
       CREATE (a)-[r:${CypherUtils.encodeName(newEdge.type)} {data}]->(b) RETURN r`,
      {data: newEdge.data}, true
    ).then(response => {
      if (response.results.length === 0) {
        throw Errors.business('node_not_found', 'Source or target node not found.');
      }

      this._invalidateCaches();
      return response.results[0].edges[0];
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
  $getNodeStream(options) {
    // getStream with SKIP but without ORDER BY is risky. We hope Neo4j always returns the nodes
    // in the same order, but no guarantee is given. ORDER BY is extremely expensive:
    // sorting all nodes is done in memory and does not scale

    const query = 'MATCH (n) RETURN n' +
      (options.offset ? ' SKIP ' + options.offset : '');

    return this.connector.$safeCypherQueryStream(query).then(response => {
      // for every returned row, we emit the first element that is a node
      return Utils.safePipe(response.results, through(function(record) {
        this.emit('data', record.nodes[0]);
      }));
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
  $getEdgeStream(options) {
    const query = 'MATCH ()-[r]->() RETURN r' +
      (options.offset ? ' SKIP ' + options.offset : '');

    return this.connector.$safeCypherQueryStream(query).then(response => {
      // for every returned row, we emit the first element that is an edge
      return Utils.safePipe(response.results, through(function(record) {
        this.emit('data', record.edges[0]);
      }));
    });
  }

  /**
   * Create a QueryMatchPopulated from a Neo4j response record.
   *
   * @param {{nodes: LkNode[], edges: LkEdge[], rows: any[]}} record A record from Neo4j
   * @param {string[]}                                        keys   The list of returned keys of the query
   * @returns {QueryMatchPopulated}
   * @private
   */
  _getNeoMatchPopulated(record, keys) {
    const properties = {};
    for (let i = 0; i < keys.length; i++) {
      properties[keys[i]] = record.rows[i];
    }

    const nodes = new Map();

    record.nodes.forEach(node => {
      nodes.set(node.id, node);
      node.edges = [];
    });

    // we populate the nodes with edges
    record.edges.forEach(edge => {
      const sourceNode = nodes.get(edge.source);
      const targetNode = nodes.get(edge.target);

      if (Utils.noValue(sourceNode) || Utils.noValue(targetNode)) {
        return;
      }

      sourceNode.edges.push(edge);

      if (sourceNode.id !== targetNode.id) {
        targetNode.edges.push(edge);
      }
    });

    // we return the populated nodes
    return {
      nodes: /**@type {LkNode[]}*/ (Array.from(nodes.values())),
      properties: properties
    };
  }

  /**
   * Create a QueryMatch from a Neo4j response record.
   *
   * @param {{nodes: LkNode[], edges: LkEdge[], rows: any[]}} record A record from Neo4j
   * @param {string[]}                                        keys   The list of returned keys of the query
   * @returns {QueryMatch}
   * @private
   */
  _getNeoMatch(record, keys) {
    const properties = {};
    for (let i = 0; i < keys.length; i++) {
      properties[keys[i]] = record.rows[i];
    }

    // we just return the ids
    return {
      nodes: _.map(record.nodes, 'id'),
      edges: _.map(record.edges, 'id'),
      properties: properties
    };
  }

  /**
   * Run a raw query.
   *
   * If options.populated is true, return a Readable<QueryMatchPopulated>, otherwise a Readable<QueryMatch>.
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
    return this.connector.$safeCypherQueryStream(
      options.query, null, options.canWrite, options.limit
    ).then(response => {
      const self = this;
      if (options.populated) {
        return Utils.safePipe(
          response.results,
          through(function(record) {
            this.queue(self._getNeoMatchPopulated(record, response.keys));
          })
        );
      } else {
        return Utils.safePipe(
          response.results,
          through(function(record) {
            this.queue(self._getNeoMatch(record, response.keys));
          })
        );
      }
    });
  }

  /**
   * Get a node by ID.
   *
   * @param {object}  options
   * @param {any}     options.id              ID of the node (decoded for the graph database)
   * @param {boolean} [options.withEdges]     Whether to include adjacent edges
   * @param {string}  [options.alternativeId] The property to match `options.id` on (instead of the actual ID)
   * @returns {Bluebird<LkNode>} null if not found
   */
  $getNode(options) {
    const sMatch = Utils.noValue(options.alternativeId)
      ? 'WHERE id(n)=' + options.id
      : 'WHERE n.' + CypherUtils.encodeName(options.alternativeId) +
        '=' + CypherUtils.encodeValue(options.id);

    let query;
    if (options.withEdges) {
      query = 'MATCH (n) ' + sMatch + ' OPTIONAL MATCH (n)-[r]-() RETURN n, collect(r) LIMIT 1';

      return this.connector.$doCypherQuery(query).then(response => {
        // response.results[0].nodes will include destination nodes in HTTP/S but not in Bolt
        // we could, in theory, make it consistent at the price of decreasing the performance in Bolt
        const node = response.results[0] && _.find(response.results[0].nodes, n => {
          if (Utils.noValue(options.alternativeId)) {
            return n.id === options.id;
          } else {
            return n.data[options.alternativeId] === options.id;
          }
        }) || null;

        if (Utils.hasValue(node)) {
          node.edges = response.results[0].edges;
        }

        return node;
      });
    } else {
      query = 'MATCH (n) ' + sMatch + ' RETURN n LIMIT 1';
      return this.connector.$doCypherQuery(query).then(response => {
        return response.results[0] && response.results[0].nodes[0] || null;
      });
    }
  }

  /**
   * Get an edge by id.
   *
   * @param {object} options
   * @param {any}    options.id              ID of the edge (decoded for the graph database)
   * @param {string} [options.alternativeId] The property to match `options.id` on (instead of the actual ID)
   * @returns {Bluebird<LkEdge>} null if not found
   */
  $getEdge(options) {
    const sMatch = Utils.noValue(options.alternativeId)
      ? 'WHERE id(e)=' + options.id
      : 'WHERE e.' + CypherUtils.encodeName(options.alternativeId) +
        '=' + CypherUtils.encodeValue(options.id);

    const query = 'MATCH ()-[e]->() ' + sMatch + ' RETURN e LIMIT 1';
    return this.connector.$doCypherQuery(query).then(response => {
      return response.results[0] && response.results[0].edges[0] || null;
    });
  }

  /**
   * Update the properties and categories of a node.
   * Check if the node exists and fail if it doesn't.
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
    const sChanges = [];

    // add categories
    if (nodeUpdate.addedCategories.length > 0) {
      sChanges.push('SET n:' + nodeUpdate.addedCategories.map(
        category => CypherUtils.encodeName(category)).join((':')));
    }

    // remove categories
    if (nodeUpdate.deletedCategories.length > 0) {
      sChanges.push('REMOVE n:' + nodeUpdate.deletedCategories.map(
        category => CypherUtils.encodeName(category)).join((':')));
    }

    // set properties
    _.forEach(nodeUpdate.data, (value, key) => {
      sChanges.push('SET n.' + CypherUtils.encodeName(key) + ' = ' +
        CypherUtils.encodeValue(value));
    });

    // delete properties
    _.forEach(nodeUpdate.deletedProperties, key => {
      sChanges.push('REMOVE n.' + CypherUtils.encodeName(key));
    });

    const query = 'MATCH (n) WHERE id(n)=' + nodeId + ' ' + sChanges.join(' ') + ' RETURN n';
    return this.connector.$doCypherQuery(query, undefined, true).then(response => {
      return response.results[0] && response.results[0].nodes[0] || null;
    });
  }

  /**
   * Update an edge content.
   * It's not possible to update the type of an edge.
   *
   * @param {any}      edgeId                       ID of the edge (decoded for the graph database)
   * @param {object}   edgeUpdate
   * @param {any}      edgeUpdate.data              Properties updates
   * @param {string[]} edgeUpdate.deletedProperties Properties to delete
   * @returns {Bluebird<LkEdge>} null if not found
   */
  $updateEdge(edgeId, edgeUpdate) {
    const sChanges = [];

    // set properties
    _.forEach(edgeUpdate.data, (value, key) => {
      sChanges.push('SET e.' + CypherUtils.encodeName(key) + ' = ' +
        CypherUtils.encodeValue(value));
    });

    // delete properties
    _.forEach(edgeUpdate.deletedProperties, key => {
      sChanges.push('REMOVE e.' + CypherUtils.encodeName(key));
    });

    const query = 'MATCH ()-[e]->() WHERE id(e)=' + edgeId + ' ' + sChanges.join(' ') + ' RETURN e';
    return this.connector.$doCypherQuery(query, undefined, true).then(response => {
      this._invalidateCaches();
      return response.results[0] && response.results[0].edges[0] || null;
    });
  }

  /**
   * Delete an edge.
   *
   * @param {any} edgeId ID of the edge (decoded for the graph database)
   * @returns {Bluebird<boolean>} true if deleted
   */
  $deleteEdge(edgeId) {
    const query = 'MATCH ()-[e]->() WITH e, id(e) AS id ' +
      'WHERE id=' + edgeId + ' DELETE e RETURN id';
    return this.connector.$doCypherQuery(query, undefined, true).then(response => {
      this._invalidateCaches();
      return Utils.hasValue(response.results[0]);
    });
  }

  /**
   * Delete a node and all edges connected to it.
   *
   * @param {any} nodeId ID of the node to delete (decoded for the graph database)
   * @returns {Bluebird<boolean>} true if deleted
   */
  $deleteNode(nodeId) {
    const query = 'MATCH (n) WITH n, id(n) AS id ' +
      'WHERE id=' + nodeId + ' OPTIONAL MATCH (n)-[r]-() DELETE n, r RETURN id';
    return this.connector.$doCypherQuery(query, undefined, true).then(response => {
      return Utils.hasValue(response.results[0]);
    });
  }

  /**
   * Get a list of nodes by ID.
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
    return Utils.sliceMap(options.ids, SLICED_QUERY_SIZE, idSlice => {
      const sMatch = Utils.noValue(options.alternativeId)
        ? `id(n) IN ${CypherUtils.encodeIDArray(idSlice)}`
        : `n.${CypherUtils.encodeName(options.alternativeId)} IN ` +
        CypherUtils.encodeValue(idSlice);

      const query = options.edges !== 'none'
        ? `MATCH (n) WHERE ${sMatch} OPTIONAL MATCH (n)-[e]-() RETURN n, collect(e)`
        : `MATCH (n) WHERE ${sMatch} RETURN n`;

      // options.edges "strict" is enforced in DaoUtils.populateNodesWithEdges

      return this.connector.$doCypherQuery(query);
    }).reduce(
      (accumulator, response) => accumulator.concat(response.results), []
    ).then(response => {
      // allNodes will include destination nodes in HTTP/S but not in Bolt
      // we could, in theory, make it consistent at the price of decreasing the performance in Bolt
      const allNodes = _.uniqBy(_.flatten(_.map(response, record => record.nodes)), 'id');
      const sourceNodes = _.filter(allNodes, n => {
        if (Utils.noValue(options.alternativeId)) {
          return options.ids.includes(n.id);
        } else {
          return options.ids.includes(n.data[options.alternativeId]);
        }
      });

      if (options.edges === 'none') {
        return sourceNodes;
      }

      const edges = _.uniqBy(_.flatten(_.map(response, record => record.edges)), 'id');

      return DaoUtils.populateNodesWithEdges(sourceNodes, edges, options.edges);
    });
  }

  /**
   * Get the neighbors of a subset of nodes.
   *
   * This method is responsible to check that all the source nodes have been found.
   *
   * @param {string[]} nodeIds                IDs of the nodes to retrieve the neighbors for (decoded for the graph database)
   * @param {object}   options
   * @param {string[]} options.ignoredNodeIds IDs of nodes we do not want in the results (decoded for the graph database)
   * @param {string[]} options.visibleNodeIds IDs of nodes already visible in the visualization (decoded for the graph database)
   *                                          We won't return them but we return edges to them
   * @param {number}   [options.limit]        Max number of nodes in result
   * @param {string}   options.limitType      "id", "lowestDegree" or "highestDegree" to sort results before limiting
   * @param {string[]} [options.categories]   Exclusive list of node-categories to restrict the result
   * @param {string[]} [options.types]        Exclusive list of edge-type to restrict the result
   * @returns {Bluebird<LkNode[]>}
   */
  $getAdjacentNodes(nodeIds, options) {
    let sEdgeTypeFilter = '';
    let sMatchEdges = '';
    let sReadableCategories = '';
    let sOrder = '';
    if (options.limitType !== 'id') {
      // we have to match edges if we sort nodes by cardinality
      sMatchEdges = 'MATCH (nN)-[nE]-() WITH n, nN, count(nE) as degree ';
    }

    if (options.limitType === 'lowestDegree') {
      sOrder = 'ASC';
    } else if (options.limitType === 'highestDegree') {
      sOrder = 'DESC';
    }

    if (Utils.hasValue(options.categories)) {
      // we remove the special LABEL_NODES_WITH_NO_CATEGORY case
      const readableCategories = _.filter(options.categories,
        c => c !== DaoUtils.LABEL_NODES_WITH_NO_CATEGORY)
        .map(category => 'nN:' + CypherUtils.encodeName(category));

      sReadableCategories = 'AND (' + readableCategories.join(' OR ');

      // if we can read nodes with no categories
      if (options.categories.includes(DaoUtils.LABEL_NODES_WITH_NO_CATEGORY)) {
        sReadableCategories += ' OR size(labels(n)) = 0';
      }
      sReadableCategories += ') ';
    }

    // Note this filter will not work anymore in the future
    // in conjunction with the use of variable binding, e.g.: ()-[e:TYPE1|:TYPE2]-()
    if (Utils.hasValue(options.types)) {
      sEdgeTypeFilter = options.types.map(
        type => ':' + CypherUtils.encodeName(type)
      ).join('|');
    }

    // nN=neighborNode
    let expandQuery = `MATCH (n)-[${sEdgeTypeFilter}]-(nN) ` +
      `WHERE id(n) IN ${CypherUtils.encodeIDArray(nodeIds)} ` +
      `AND NOT (id(nN) IN ${CypherUtils.encodeIDArray(options.visibleNodeIds)}) ` +
      `AND NOT (id(nN) IN ${CypherUtils.encodeIDArray(options.ignoredNodeIds)}) ` +
      sReadableCategories +
      sMatchEdges +
      'RETURN n, nN ';

    if (options.limit > 0) {
      if (options.limitType !== 'id') {
        expandQuery += `ORDER BY degree ${sOrder} `;
      }

      expandQuery += `LIMIT ${options.limit}`;
    }

    let sourceNodesAndNeighbors;
    return this.$getNodesByID({ids: nodeIds, edges: 'none'}).then(sourceNodes => {
      // we check that all source nodes exist
      DaoUtils.checkMissing('node', nodeIds, sourceNodes);

      // we get the neighbors
      return this.connector.$doCypherQuery(expandQuery).then(response => {
        sourceNodesAndNeighbors = _.uniqBy(_.flatten(
          _.map(response.results, record => record.nodes).concat(sourceNodes)
        ), 'id');

        // S := source nodes
        // N := neighbors nodes
        // V := visible nodes
        //
        // Our response will be made of every node in: N and S
        // with edges in: S-S, S-N, S-V, N-N, N-V
        // note: edges exclusively in V-V are not returned (also nodes exclusively in V are not returned)
        //
        // The following query works by getting all the edges between S+N and S+N+V

        const sourceNodesAndNeighborsIds =
          /**@type {string[]}*/ (_.map(sourceNodesAndNeighbors, 'id'));
        const sSourceNodesAndNeighbors = CypherUtils.encodeIDArray(sourceNodesAndNeighborsIds);

        const allNodesIds = _.union(sourceNodesAndNeighborsIds, options.visibleNodeIds);
        const sAllNodes = CypherUtils.encodeIDArray(allNodesIds);

        const edgeQuery = `MATCH (n)-[e${sEdgeTypeFilter}]-(n2) ` +
          `WHERE id(n) IN ${sSourceNodesAndNeighbors} AND id(n2) IN ${sAllNodes} ` +
          'RETURN DISTINCT e';

        return this.connector.$doCypherQuery(edgeQuery);
      }).then(response => {
        const edges = _.map(response.results, record => record.edges[0]);

        return DaoUtils.populateNodesWithEdges(sourceNodesAndNeighbors, edges, 'all');
      });
    });
  }

  /**
   * Provide a neighborhood digest of a specified subset of nodes.
   *
   * @param {any[]} nodeIds IDs of the nodes (decoded for the graph database)
   * @returns {Bluebird<LkDigestItem[]>}
   */
  $getAdjacencyDigest(nodeIds) {
    const digestQuery = 'MATCH (node)-[e]-(n) ' +
      `WHERE ID(node) IN ${CypherUtils.encodeIDArray(nodeIds)} ` +
      'RETURN type(e), labels(n), count(DISTINCT n), count(DISTINCT e)';

    return this.connector.$doCypherQuery(digestQuery).then(response => {
      return _.map(response.results, result => ({
        edgeType: result.rows[0],
        nodeCategories: result.rows[1].sort(),
        nodes: result.rows[2],
        edges: result.rows[3]
      }));
    });
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
    const sNodeIds = CypherUtils.encodeIDArray(nodeIds);
    let sReadableCategories = '';
    let sEdgeTypeFilter = '';

    if (Utils.hasValue(options.readableCategories)) {
      // we remove the special LABEL_NODES_WITH_NO_CATEGORY case
      const readableCategories = _.filter(options.readableCategories,
        c => c !== DaoUtils.LABEL_NODES_WITH_NO_CATEGORY)
        .map(category => 'n:' + CypherUtils.encodeName(category));

      sReadableCategories = 'AND (' + readableCategories.join(' OR ');

      // if we can read nodes with no categories
      if (options.readableCategories.includes(DaoUtils.LABEL_NODES_WITH_NO_CATEGORY)) {
        sReadableCategories += ' OR size(labels(n)) = 0';
      }
      sReadableCategories += ')';
    }

    // Note this filter will not work anymore in the future
    // in conjunction with the use of variable binding, e.g.: ()-[e:TYPE1|:TYPE2]-()
    if (Utils.hasValue(options.readableTypes)) {
      sEdgeTypeFilter = options.readableTypes.map(
        type => ':' + CypherUtils.encodeName(type)
      ).join('|');
    }

    const degreeQuery = `MATCH (node)-[e${sEdgeTypeFilter}]-(n)
      WHERE id(node) IN ${sNodeIds}
      AND NOT id(n) IN ${sNodeIds}
      ${sReadableCategories}
      RETURN count(DISTINCT n)`;

    return this.connector.$doCypherQuery(degreeQuery).then(response => {
      return response.results[0].rows[0];
    });
  }

  /**
   * Get a list of edges by ID.
   *
   * @param {object} options
   * @param {any[]}  options.ids             List of IDs to read (decoded for the graph database)
   * @param {string} [options.alternativeId] The property to match `options.ids` on (instead of the actual IDs)
   * @returns {Bluebird<LkEdge[]>}
   */
  $getEdgesByID(options) {
    return Utils.sliceMap(options.ids, SLICED_QUERY_SIZE, idSlice => {
      const sMatch = Utils.noValue(options.alternativeId)
        ? `id(e) IN ${CypherUtils.encodeIDArray(idSlice)}`
        : `e.${CypherUtils.encodeName(options.alternativeId)} IN ` +
        CypherUtils.encodeValue(idSlice);

      const query = `MATCH ()-[e]->() WHERE ${sMatch} RETURN e`;

      return this.connector.$doCypherQuery(query);
    }).reduce(
      (accumulator, response) => accumulator.concat(response.results), []
    ).map(record => record.edges[0]);
  }

  /**
   * Get all the shortest paths between a pair of nodes.
   * Edges have to appear only on the first node in the path.
   *
   * @param {any}    startNodeId ID of the starting node (decoded for the graph database)
   * @param {any}    endNodeId   ID of the ending node (decoded for the graph database)
   * @param {number} maxDepth    Max depth of the search
   * @param {number} resultLimit Max number of returned paths
   * @returns {Bluebird<LkNode[][]>} paths between the starting node and the ending node
   */
  $getAllShortestPaths(startNodeId, endNodeId, maxDepth, resultLimit) {
    const shortestPathQuery = 'MATCH (a), (b), ' +
      'p = allShortestPaths((a)-[*..' + maxDepth + ']-(b)) ' +
      `WHERE id(a) = ${startNodeId} AND id(b) = ${endNodeId} RETURN p LIMIT ${resultLimit}`;

    return this.connector.$doCypherQuery(shortestPathQuery).get('results').map(record => {
      DaoUtils.populateNodesWithEdges(record.nodes, record.edges, 'all');

      // we index every node by id
      const nodesById = new Map();

      record.nodes.forEach(node => {
        node.edges = [];
        nodesById.set(node.id, node);
      });

      let nextNodeId = startNodeId;

      const path = [];
      for (let i = 0; i < record.nodes.length; i++) {
        const nextNode = nodesById.get(nextNodeId);
        path.push(nextNode);

        if (record.edges.length > 0) {
          const edgeIndex = _.findIndex(record.edges, edge => {
            if (edge.source === nextNodeId) {
              nextNodeId = edge.target;
              return true;
            }
            if (edge.target === nextNodeId) {
              nextNodeId = edge.source;
              return true;
            }
            return false;
          });

          nextNode.edges.push(record.edges[edgeIndex]);
          record.edges.splice(edgeIndex, 1);
        }
      }

      return path;
    });
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
    let query;

    const sEdgeType = Utils.noValue(options.type) ? '' : `:${CypherUtils.encodeName(options.type)}`;
    const sLimit = Utils.noValue(options.limit) ? '' : `LIMIT ${options.limit}`;
    const sSkip = Utils.noValue(options.skip) ? '' : `SKIP ${options.skip}`;

    if (options.orientation === 'both') {
      query = `MATCH (a)-[e${sEdgeType}]-(b) WHERE id(a) = ${options.nodeId} ` +
        'OPTIONAL MATCH (dd)--(b) RETURN e, count(dd) as degree ' +
        `ORDER BY degree DESC ${sSkip} ${sLimit}`;
    }

    if (options.orientation === 'source') {
      query = `MATCH (source)-[e${sEdgeType}]->(target) WHERE id(source) = ${options.nodeId} ` +
        'OPTIONAL MATCH (dd)--(target) RETURN e, count(dd) as degree ' +
        `ORDER BY degree DESC ${sSkip} ${sLimit}`;
    }

    if (options.orientation === 'target') {
      query = `MATCH (source)-[e${sEdgeType}]->(target) WHERE id(target) = ${options.nodeId} ` +
        'OPTIONAL MATCH (dd)--(source) RETURN e, count(dd) as degree ' +
        `ORDER BY degree DESC ${sSkip} ${sLimit}`;
    }

    return this.connector.$doCypherQuery(query).then(response => {
      return _.map(response.results, record => record.edges[0]);
    });
  }

  /**
   * List all edgeTypes that exist in the graph database.
   *
   * @returns {Bluebird<string[]>}
   */
  $getEdgeTypes() {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Provide a neighborhood simple digest for a specific node.
   *
   * @param {string}   nodeId                  ID of the node (encoded for Linkurious)
   * @param {object}   options
   * @param {string[]} [options.readableTypes] Exclusive list of edge-type to restrict the result
   * @returns {Bluebird<LkSimpleDigestItem[]>}
   */
  $getSimpleDigest(nodeId, options) {
    return Promise.resolve().then(() => {
      // if readableTypes is defined, we know we have to compute the simple digest only
      // towards these edge types
      if (Utils.hasValue(options.readableTypes)) {
        return options.readableTypes;
      }

      // Otherwise, we need to retrieve the whole list of edge types
      return Promise.resolve().then(() => {
        // We cache the list of edge types to avoid to retrieve it all the times
        if (Utils.noValue(this._allEdgeTypesCached)) {
          return this.$getEdgeTypes().then(types => {
            this._allEdgeTypesCached = types;
          });
        }
      }).then(() => {
        return this._allEdgeTypesCached;
      });
    }).then(types => {
      if (types.length === 0) {
        return [];
      }

      const queryReturns = [];
      for (let i = 0; i < types.length; i++) {
        queryReturns.push(`size((n)-[:${CypherUtils.encodeName(types[i])}]-())`);
      }

      const query = `MATCH (n) WHERE id(n) = ${nodeId} RETURN ` + queryReturns.join(', ');

      return this.connector.$doCypherQuery(query).then(response => {
        let simpleDigest = _.map(_.zip(types, response.results[0].rows), digestEntry => {
          return {
            edgeType: digestEntry[0],
            edges: digestEntry[1]
          };
        });

        simpleDigest = _.filter(simpleDigest, digestEntry => digestEntry.edges > 0);

        return simpleDigest;
      });
    });
  }

  /**
   * Return `true` if the node is a supernode.
   * A supernode is a node with a number of relationships greater or equal than `supernodeThreshold`.
   * Return `false` if the node is not found.
   *
   * @param {string} nodeId
   * @param {number} supernodeThreshold
   * @returns {Bluebird<boolean>}
   */
  $isSuperNode(nodeId, supernodeThreshold) {
    return this.connector.$doCypherQuery(
      `MATCH (n) WHERE id(n) = ${nodeId} RETURN size((n)-[]-())`
    ).then(response => {
      return !!response.results[0] && response.results[0].rows[0] >= supernodeThreshold;
    });
  }

  /**
   * Invalidate the following caches:
   * - List of edge types (used to compute the simple digest)
   *
   * @private
   */
  _invalidateCaches() {
    this._allEdgeTypesCached = null;
  }

  /**
   * Called at the end of the indexation phase for additional initializations.
   *
   * @returns {Bluebird<void>}
   */
  $onAfterIndexation() {
    this._invalidateCaches();
    return Promise.resolve();
  }

  /**
   * Called at the end of the connect phase for additional initializations.
   *
   * @returns {Bluebird<void>}
   */
  $onAfterConnect() {
    this._invalidateCaches();
    return Promise.resolve();
  }
}

module.exports = CypherDriver;
