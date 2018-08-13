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

// our libs
const MockStream = require('../../../lib/MockStream');

// services
const LKE = require('../../services');
const Errors = LKE.getErrors();
const Config = LKE.getConfig();
const Log = LKE.getLogger(__filename);
const Utils = LKE.getUtils();

// locals
const GraphDriver = require('./graphDriver');
const DaoUtils = require('../utils/daoUtils');
const GremlinUtils = require('../utils/gremlinUtils');
const GremlinStream = require('../utils/gremlinStream');

/**
 * Notes:
 * Transactions are always assumed to be started automatically.
 * They are committed automatically only if manageTransactions is true.
 */
class GremlinDriver extends GraphDriver {

  /**
   * @param {Connector} connector                         Connector used by the DAO
   * @param {any}       graphOptions                      GraphDAO options
   * @param {any}       connectorData                     Data from the connector
   * @param {object}    gremlinOptions
   * @param {boolean}   gremlinOptions.manageTransactions Whether transactions are committed automatically
   */
  constructor(connector, graphOptions, connectorData, gremlinOptions) {
    super(connector, graphOptions, connectorData);

    this._manageTransactions = gremlinOptions.manageTransactions;
  }

  /**
   * Get the connector used by the DAO.
   *
   * @type {GremlinConnector}
   */
  get connector() {
    return this._connector;
  }

  /**
   * Encode a raw Node ID in an ID usable in an LkNode.
   *
   * @param {any} rawId
   * @returns {string}
   */
  $encodeNodeId(rawId) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Encode a raw Edge ID in an ID usable in an LkEdge.
   *
   * @param {any} rawId
   * @returns {string}
   */
  $encodeEdgeId(rawId) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Add definitions in the gremlin session and/or perform additional checks.
   *
   * @returns {Bluebird<void>}
   */
  _initGremlinSession() {
    const query = `
      def computeDigest(triples) {
        result = [:];
      
        groupByEdgeLabel = [:];
        for (triple in triples) {
          if (groupByEdgeLabel.get(triple[1]) == null) {
            groupByEdgeLabel.put(triple[1], []);
          }
          groupByEdgeLabel.get(triple[1]).push(triple);
        }
        
        groupByEdgeLabel.each({edgeType, edgeGroup ->
          subGroupByNodeId = [:];
          for (triple in edgeGroup) {
            if (subGroupByNodeId.get(triple[0]) == null) {
              subGroupByNodeId.put(triple[0], []);
            }
            subGroupByNodeId.get(triple[0]).push(triple);
          }
          
          subGroupByNodeId.each({nodeId, nodeGroup ->
            nodeCategory = nodeGroup[0][2];
            numberOfEdgeEntries = nodeGroup.size();
            resultKey = edgeType + '_' + nodeCategory;
            
            if (result.get(resultKey) == null) {
              result.put(resultKey, [
                'nodeCategories': [nodeCategory],
                'edgeType': edgeType,
                'nodes': 0,
                'edges': 0
              ]);
            }

            resultCount = result.get(resultKey);
            resultCount.nodes++;
            resultCount.edges += numberOfEdgeEntries;
          });
        });
        
        return result.values();
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
      return this.$checkAlternativeIdsIndices();
    });
  }

  /**
   * Resolve if alternative IDs are not in use or if there exist indices for the alternative IDs.
   *
   * @returns {Bluebird<void>}
   */
  $checkAlternativeIdsIndices() {
    return Promise.resolve();
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
    const query = `
      g.V(${GremlinUtils.quote(startNodeId)}).repeat(
        bothE().otherV().simplePath()
        .where(loops().is(lte(${maxDepth - 1})))
      ).until(hasId(${GremlinUtils.quote(endNodeId)}))
      .path().limit(${resultLimit})`;

    return this.connector.$doGremlinQuery(query).map(mixedPath => {
      const nodesPath = [];

      // add each edge of the path to its previous node in the path
      for (let i = 0, l = mixedPath.objects.length; i < l - 1; i += 2) {
        // even-index items are nodes
        const node = this.rawNodeToLkNode(mixedPath.objects[i], []);
        // odd-index items are edges
        node.edges.push(this.rawEdgeToLkEdge(mixedPath.objects[i + 1]));
        nodesPath.push(node);
      }

      // the last node of the path has no edge in its edge array
      nodesPath.push(this.rawNodeToLkNode(mixedPath.objects[mixedPath.objects.length - 1], []));

      return nodesPath;
    }).then(paths => {
      return _.sortBy(paths, path => path.length);
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
    const sEdges = options.withEdges ? '.bothE().store(\'e\')' : '';

    // match by ID or by an arbitrary property
    const sMatch = Utils.noValue(options.alternativeId)
      ? `.V().hasId(${GremlinUtils.quote(options.id)})`
      : `.V().has(${GremlinUtils.quote(options.alternativeId)}, ${GremlinUtils.quote(options.id)})`;

    const query = `g${sMatch}.store('n')${sEdges}.cap('n', 'e')`;

    return this.connector.$doGremlinQuery(query).then(result => {
      if (!result.length || !result[0].n || !result[0].n.length) {
        return null;
      }

      return this.rawNodeToLkNode(result[0].n[0], result[0].e);
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
    return this._getStream('node', options);
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
    let sEdgeQuery;
    switch (options.edges) {
      case 'strict':
        sEdgeQuery = '.bothE().where(otherV().where(within(\'n\'))).dedup().store(\'e\')';
        break;
      case 'all':
        sEdgeQuery = '.bothE().dedup().store(\'e\')';
        break;
      default:
        sEdgeQuery = '';
    }

    const sMatch = Utils.noValue(options.alternativeId)
      ? `V(${GremlinUtils.quote(options.ids)})`
      : `V().has(${GremlinUtils.quote(options.alternativeId)},
       within(${GremlinUtils.quote(options.ids)}))`;

    const query = `g.${sMatch}.aggregate('n')${sEdgeQuery}.cap('n', 'e')`;

    return this.connector.$doGremlinQuery(query).then(results => {
      const nodes = results[0].n.map(rawNode => this.rawNodeToLkNode(rawNode, []));

      if (options.edges === 'none') {
        return nodes;
      }

      const edges = !results[0].e
        ? [] : results[0].e.map(rawEdge => this.rawEdgeToLkEdge(rawEdge));

      return DaoUtils.populateNodesWithEdges(nodes, edges, options.edges);
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
    const sMatch = Utils.noValue(options.alternativeId)
      ? `E(${GremlinUtils.quote(options.ids)})`
      : `E().has(${GremlinUtils.quote(options.alternativeId)},
       within(${GremlinUtils.quote(options.ids)}))`;

    return this.connector.$doGremlinQuery(`g.${sMatch}`).then(r => {
      return r.map(rawEdge => this.rawEdgeToLkEdge(rawEdge));
    });
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
    let sNodeCategories = '';
    let sEdgeTypes = '';

    if (Utils.hasValue(options.categories)) {
      const categories = options.categories
        .filter(c => c !== DaoUtils.LABEL_NODES_WITH_NO_CATEGORY);

      sNodeCategories = '.has("~label", within([' +
        categories.map(c => GremlinUtils.quote(c)).join(',') + ']))';
    }

    if (Utils.hasValue(options.types)) {
      sEdgeTypes = '.has("~label", within([' +
        options.types.map(t => GremlinUtils.quote(t)).join(',') + ']))';
    }

    // LKE enterprise always use visible nodes, so no need to optimize if they are no there
    let visibleNodes = _.differenceWith(options.visibleNodeIds, nodeIds, _.isEqual);
    if (visibleNodes.length === 0) {
      visibleNodes = [nodeIds[0]]; // workaround to avoid empty array because g.V([[]]) returns all
    }

    let sLimit = '';
    if (options.limitType !== 'id' && options.limit) {
      sLimit = this.$sOrderVerticesBy('bothE().count()', options.limitType === 'lowestDegree') +
        `.limit(${options.limit})`;
    } else if (options.limit) {
      sLimit = `.limit(${options.limit})`;
    }

    const sIgnored = options.ignoredNodeIds.length
      ? `.where(otherV().has(id, without(${GremlinUtils.quote(options.ignoredNodeIds)})))`
      : '';

    const query = `
      g.V(${GremlinUtils.quote(nodeIds)})
      .aggregate('s')
      .or(g.V(${GremlinUtils.quote(visibleNodes)}).aggregate('v'))
      .where(within('s'))
      .bothE()
      ${sEdgeTypes}
      ${sIgnored}
      .otherV()
      ${sNodeCategories}
      .dedup()
      .union(
        identity().where(not(within('v')))${sLimit}.aggregate('n'), identity().where(within('v'))
       )
      .dedup()
      .bothE()${sEdgeTypes}.where(
        otherV().where(within('n').or(within('s')).or(within('v')))
      ).dedup().aggregate('e')
      .cap('s', 'n', 'e')
    `;

    return this.connector.$doGremlinQuery(query).then(results => {
      const sourceNodes = results[0].s.map(rawNode => this.rawNodeToLkNode(rawNode, []));

      // check if all source nodes have been found
      DaoUtils.checkMissing('node', nodeIds, sourceNodes, null, this.$encodeNodeId.bind(this));

      const nodes = sourceNodes.concat(
        results[0].n.map(rawNode => this.rawNodeToLkNode(rawNode, [])));

      const edges = _.uniqBy(results[0].e, 'id')
        .map(rawEdge => this.rawEdgeToLkEdge(rawEdge));

      return DaoUtils.populateNodesWithEdges(nodes, edges, 'all');
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
    let edgeTypeFilter = '';
    let nodeCategoryFilter = '';

    if (options.readableTypes) {
      edgeTypeFilter = '.has("~label", within([' +
        options.readableTypes.map(t => GremlinUtils.quote(t)).join(',') + ']))';
    }

    if (options.readableCategories) {
      nodeCategoryFilter = '.has("~label", within([' +
        options.readableCategories.map(c => GremlinUtils.quote(c)).join(',') + ']))';
    }

    const query = `g.V(${GremlinUtils.quote(nodeIds)})
      .bothE()
      ${edgeTypeFilter}
      .otherV()
      ${nodeCategoryFilter}
      .dedup()
      .count()
    `;

    return this.connector.$doGremlinQuery(query).then(results => results[0]);
  }

  /**
   * Create a node.
   *
   * @param {LkNodeAttributes} newNode
   * @returns {Bluebird<LkNode>}
   */
  $createNode(newNode) {
    const properties = _.map(
      newNode.data, (value, key) => `, ${GremlinUtils.quote(key)}, ${GremlinUtils.quote(value)}`
    );

    const sProperties = properties.join('');

    const query = `
      newNode = graph.addVertex(label, ${GremlinUtils.quote(newNode.categories[0])}${sProperties});
      ${this._manageTransactions ? '' : 'graph.tx().commit();'}
      return newNode;
    `;

    return this.connector.$doGremlinQuery(query).then(createdNodes => {
      if (!createdNodes.length) { return null; }
      return this.rawNodeToLkNode(createdNodes[0]);
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
    return /**@type {Bluebird<LkNode>}*/ (this._updateItem(nodeId, 'node', nodeUpdate));
  }

  /**
   * Delete a node and all edges connected to it.
   *
   * @param {any} nodeId ID of the node to delete (decoded for the graph database)
   * @returns {Bluebird<boolean>} true if deleted
   */
  $deleteNode(nodeId) {
    return this._deleteItem(nodeId, 'node');
  }

  /**
   * Create the statement to order a traversal.
   * Items will also be sorted secondarily by ID.
   *
   * @param {string}  orderBy By what we order (e.g: bothE().count())
   * @param {boolean} incr    true, for increasing order
   * @returns {string}
   */
  $sOrderVerticesBy(orderBy, incr) {
    return `.as('k')
      .map(id())
      .order()
      .by(incr)
      .select('k')
      .map(${orderBy})
      .order()
      .by(${incr ? 'incr' : 'decr'})
      .select('k')
    `;
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
    // get node id and edge orientation
    const nodeId = options.nodeId;
    const orientation = options.orientation === 'source'
      ? 'out'
      : options.orientation === 'target' ? 'in' : 'both';

    // get edge type filter
    const sEdgeType = Utils.noValue(options.type) ? '' : GremlinUtils.quote(options.type);

    // sort and limit clause if needed
    if (Utils.noValue(options.skip)) {
      options.skip = 0;
    }
    const sLimit = Utils.noValue(options.limit)
      ? ''
      : `.otherV()${this.$sOrderVerticesBy('bothE().count()', false)}.select('edge')
       .range(${options.skip}, ${options.limit + options.skip})`;

    const query = `g.V().hasId(${GremlinUtils.quote(nodeId)})
      .${orientation}E(${sEdgeType}).as('edge')
      ${sLimit}`;

    return this.connector.$doGremlinQuery(query)
      .then(results => _.map(results, rawEdge => this.rawEdgeToLkEdge(rawEdge)));
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
    const query = Utils.noValue(options.alternativeId)
      ? `g.E(${GremlinUtils.quote(options.id)})`
      : `g.E().has(${GremlinUtils.quote(options.alternativeId)},
       ${GremlinUtils.quote(options.id)})`;

    return this.connector.$doGremlinQuery(query).then(rawEdges => {
      if (Utils.hasValue(rawEdges[0])) {
        return this.rawEdgeToLkEdge(rawEdges[0]);
      }
    });
  }

  /**
   * Get the extremities of the given edge IDs. Each edge is included in the result
   * (in the target and source node).
   *
   * This method is responsible to check that all the edge ids have been found.
   *
   * @param {any[]} edgeIds IDs of the edges (decoded for the graph database)
   * @returns {Bluebird<LkNode[]>}
   */
  $getNodesByEdgesID(edgeIds) {
    return this.connector.$doGremlinQuery(`g
      .E(${GremlinUtils.quote(edgeIds)}).store('edges')
      .bothV().dedup().store('nodes')
      .cap('edges', 'nodes')
    `).then(r => {
      const edges = r[0].edges.map(rawEdge => this.rawEdgeToLkEdge(rawEdge));
      const nodes = r[0].nodes.map(rawNode => this.rawNodeToLkNode(rawNode, []));
      DaoUtils.checkMissing('edge', edgeIds, edges, null, this.$encodeEdgeId.bind(this));
      return DaoUtils.populateNodesWithEdges(nodes, edges, 'all');
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
    return this._getStream('edge', options);
  }

  /**
   * @param {string} type                'node' or 'edge'
   * @param {object} options
   * @param {number} [options.chunkSize]
   * @param {number} [options.offset=0]
   * @returns {Bluebird<Readable<any>>}
   * @private
   */
  _getStream(type, options) {
    const sLimit = options.offset ? `.range(${options.offset}L, Long.MAX_VALUE)` : '';
    const firstQuery = `itemStream = g.${type === 'node' ? 'V' : 'E'}()${sLimit};null`;

    return this.connector.$doGremlinQuery(firstQuery).then(() => {
      const pageSize = options.chunkSize || 1000;
      const pageQuery = `
        results = [];
        while (itemStream.hasNext() && results.size < ${pageSize}) {
          results.push(itemStream.next());
        }
        return results;
      `;

      return new GremlinStream(this, pageQuery, type);
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
    const sSource = `g.V(${GremlinUtils.quote(newEdge.source)})`;

    const sTarget = `g.V(${GremlinUtils.quote(newEdge.target)})`;

    const properties = _.map(
      newEdge.data, (value, key) => `, ${GremlinUtils.quote(key)}, ${GremlinUtils.quote(value)}`
    );
    const sProperties = properties.join('');

    const query = `
      source = ${sSource}
      if (!source.hasNext()) { return "noSource"; }
      target = ${sTarget}
      if (!target.hasNext()) { return "noTarget"; }
      newEdge = source.next().addEdge(${GremlinUtils.quote(newEdge.type)},
       target.next()${sProperties});

      ${this._manageTransactions ? '' : 'graph.tx().commit();'}
      return newEdge;
    `;
    return this.connector.$doGremlinQuery(query).then(newEdges => {
      if (!newEdges.length || newEdges[0] === 'noSource' || newEdges[0] === 'noTarget') {
        return Errors.business('node_not_found', 'Source or target node not found.', true);
      }

      return this.rawEdgeToLkEdge(newEdges[0]);
    });
  }

  /**
   * @param {any}   rawNode
   * @param {any[]} [rawEdges]
   * @returns {LkNode}
   */
  rawNodeToLkNode(rawNode, rawEdges) {
    const n = {
      id: this.$encodeNodeId(rawNode.id),
      data: this._parseProperties(rawNode),
      categories: [rawNode.label]
    };

    if (rawEdges) {
      n.edges = rawEdges.map(rawEdge => this.rawEdgeToLkEdge(rawEdge));
    }

    return n;
  }

  /**
   * Convert a raw edge to an LkEdge.
   *
   * @param {any} rawEdge
   * @returns {LkEdge}
   */
  rawEdgeToLkEdge(rawEdge) {
    return {
      id: this.$encodeEdgeId(rawEdge.id),
      data: this._parseProperties(rawEdge),
      type: rawEdge.label,
      source: this.$encodeNodeId(rawEdge.outV),
      target: this.$encodeNodeId(rawEdge.inV)
    };
  }

  /**
   * @param {any} rawItem
   * @returns {any} the properties of the raw item
   * @private
   */
  _parseProperties(rawItem) {
    const data = {};
    if (rawItem.properties === undefined) {
      return data;
    }

    for (const key in rawItem.properties) {
      if (!rawItem.properties.hasOwnProperty(key)) { continue; }
      let value = rawItem.properties[key];
      if (rawItem.type === 'vertex') {
        value = value[0].value;
      }

      if (value === null) {
        // because typeof(null) is 'object'
        data[key] = value;
      } else if (typeof(value) === 'object') {
        if (value.type === 'Point') {
          data[key] = '' + value.coordinates[0] + ',' + value.coordinates[1];
        } else {
          Log.warn('GremlinDriver::_parseProperties: ' +
            'unknown type "' + value.type + '": ' + GremlinUtils.quote(value));
        }
      } else {
        data[key] = value;
      }
    }

    return data;
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
    return /**@type {Bluebird<LkEdge>}*/ (this._updateItem(edgeId, 'edge', edgeUpdate));
  }

  /**
   * Update an item content.
   *
   * @param {number}   itemId                       Existing item ID
   * @param {string}   itemType                     'node' or 'edge'
   * @param {object}   itemUpdate
   * @param {object}   itemUpdate.data              Property updates
   * @param {string[]} itemUpdate.deletedProperties Properties to delete
   * @returns {Bluebird<LkNode | LkEdge>}
   * @private
   */
  _updateItem(itemId, itemType, itemUpdate) {
    const sPropertiesUpdates = Object.keys(itemUpdate.data).map(
      key => `.property(${GremlinUtils.quote(key)}, ${GremlinUtils.quote(itemUpdate.data[key])})`
    );

    const sPropertyDeletes = itemUpdate.deletedProperties.length
      ? '.properties(' + GremlinUtils.quote(itemUpdate.deletedProperties, true) + ').drop()'
      : '';

    const query = `
      updated = g.${itemType === 'node' ? 'V' : 'E'}(${GremlinUtils.quote(itemId)}).store('updated')
        ${sPropertiesUpdates.join('')}
        ${sPropertyDeletes}
        .cap('updated');
      ${this._manageTransactions ? '' : 'graph.tx().commit();'}
      return updated;
    `;

    return this.connector.$doGremlinQuery(query).then(updatedItems => {
      if (updatedItems.length && updatedItems[0].length) {
        return itemType === 'node'
          ? this.rawNodeToLkNode(updatedItems[0][0])
          : this.rawEdgeToLkEdge(updatedItems[0][0]);
      }
      // will generate a *_not_found error in graphDAO
      return null;
    });
  }

  /**
   * Delete an edge.
   *
   * @param {any} edgeId ID of the edge (decoded for the graph database)
   * @returns {Bluebird<boolean>} true if deleted
   */
  $deleteEdge(edgeId) {
    return this._deleteItem(edgeId, 'edge');
  }

  /**
   * @param {any}    itemId ID of the node/edge to delete (decoded for the graph database)
   * @param {string} type   'node' or 'edge'
   * @returns {Bluebird<boolean>}
   * @private
   */
  _deleteItem(itemId, type) {
    const q = `
      deleted = g.${type === 'node' ? 'V' : 'E'}(${GremlinUtils.quote(itemId)})
        .store('d').by(id).drop().cap('d');
      ${this._manageTransactions ? '' : 'graph.tx().commit();'}
      return deleted;
    `;

    return this.connector.$doGremlinQuery(q).then(deletedIds => {
      return deletedIds.length > 0;
    });
  }

  /**
   * Extract from `root` all the vertex and edge encountered as LkNode and LkEdge.
   *
   * @param {any}      root
   * @param {LkNode[]} [nodes]
   * @param {LkEdge[]} [edges]
   * @private
   */
  _extractItems(root, nodes, edges) {
    if (Array.isArray(root)) {
      root.forEach(newRoot => this._extractItems(newRoot, nodes, edges));
    } else if (root.type === 'vertex') {
      nodes.push(this.rawNodeToLkNode(root, []));
    } else if (root.type === 'edge') {
      edges.push(this.rawEdgeToLkEdge(root));
    } else {
      if (_.isObject(root)) {
        _.values(root).forEach(newRoot => {
          this._extractItems(newRoot, nodes, edges);
        });
      }
    }
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
    // TODO gremlin rawQuery enforce limit

    return this.connector.$doGremlinQuery(
      options.query,
      // TODO #937 gremlin rawQuery, use a stream
      Config.get('advanced.rawQueryTimeout'),
      options.canWrite, false
    ).then(r => {
      const nodes = [];
      const edges = [];
      this._extractItems(r, nodes, edges);

      const nodesById = _.keyBy(nodes, 'id');
      _.uniqBy(edges, 'id').forEach(edge => {
        const source = nodesById[edge.source];
        const target = nodesById[edge.target];
        if (source) {
          source.edges.push(edge);
        }
        if (target && source !== target) {
          target.edges.push(edge);
        }
      });

      return _.values(nodesById);
    }).then(nodes => {
      const stream = new MockStream();
      stream.end({
        nodes: nodes
      });

      return stream;
    });
  }
}

module.exports = GremlinDriver;
