/**
 * LINKURIOUS CONFIDENTIAL
 * __________________
 *
 *  [2012] - [2014] Linkurious SAS
 *  All Rights Reserved.
 *
 */
'use strict';

// services
const LKE = require('../../index');
const Config = LKE.getConfig();
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const Access = LKE.getAccess();
const DataProxy = LKE.getData(true);

// locals
const api = require('../api');

/**
 * @apiDefine ReturnSubGraph
 *
 * @apiSuccess {object[]} nodes              Nodes
 * @apiSuccess {string}   nodes.id           ID of the node
 * @apiSuccess {object}   nodes.data         Properties of the node
 * @apiSuccess {string[]} nodes.categories   Categories of the node
 * @apiSuccess {object}   [nodes.statistics] Statistics of the node
 * @apiSuccess {type:LkDigestItem[]} [nodes.statistics.digest] Statistics of the neighborhood of the node
 * @apiSuccess {number}              [nodes.statistics.degree] Number of neighbors of the node readable by the current user
 * @apiSuccess {object[]} nodes.edges        Subset of adjacent edges of this node (only the ones matching the API description)
 * @apiSuccess {string}   nodes.edges.id     ID of the edge
 * @apiSuccess {object}   nodes.edges.data   Properties of the edge
 * @apiSuccess {string}   nodes.edges.type   Type of the edge
 * @apiSuccess {string}   nodes.edges.source ID of the source node
 * @apiSuccess {string}   nodes.edges.target ID of the target node
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 200 OK
 *   [
 *     {
 *       "id": 1,
 *       "data": {
 *         "name": "Keanu Reeves",
 *         "born": 1964
 *       },
 *       "categories": ["Person"],
 *       "statistics": {
 *         "digest": [
 *           {
 *             "nodeCategories": ["Movie", "TheMatrix", "TheMatrixReloaded"],
 *             "edgeType": "ACTED_IN",
 *             "nodes": 3,
 *             "edges": 3
 *           }
 *         ]
 *       },
 *       "edges": [
 *         {
 *           "id": 100,
 *           "type": "ACTED_IN",
 *           "source": 1,
 *           "target": 2,
 *           "data": {
 *             "role": "Neo"
 *           }
 *         },
 *         {
 *           "id": 101,
 *           "type": "ACTED_IN",
 *           "source": 1,
 *           "target": 3,
 *           "data": {
 *             "role": "Neo"
 *           }
 *         }
 *       ]
 *     },
 *     {
 *       "id": 2,
 *       "data": {
 *         "title": "The Matrix",
 *         "release": 1999
 *       },
 *       "categories": ["Movie"],
 *       "statistics": {
 *         "digest": [
 *           {
 *             "nodeCategories": ["Person"],
 *             "edgeType": "ACTED_IN",
 *             "nodes": 2,
 *             "edges": 2
 *           }
 *         ]
 *       },
 *       "edges": [
 *         {
 *           "id": 100,
 *           "type": "ACTED_IN",
 *           "source": 1,
 *           "target": 2,
 *           "data": {
 *             "role": "Neo"
 *           }
 *         },
 *         {
 *           "id": 102
 *           "type": "SEQUEL_OF",
 *           "source": 3,
 *           "target": 2,
 *           "data": {}
 *         }
 *       ]
 *     },
 *     {
 *       "id": 3,
 *       "data": {
 *         "title": "The Matrix Reloaded",
 *         "release": 2003
 *       },
 *       "categories": ["Movie"],
 *       "statistics": {
 *         "digest": [
 *           {
 *             "nodeCategories": ["Person"],
 *             "edgeType": "ACTED_IN",
 *             "nodes": 2,
 *             "edges": 2
 *           }
 *         ]
 *       },
 *       "edges": [
 *         {
 *           "id": 101,
 *           "type": "ACTED_IN",
 *           "source": 1,
 *           "target": 3,
 *           "data": {
 *             "role": "Neo"
 *           }
 *         },
 *         {
 *           "id": 102
 *           "type": "SEQUEL_OF",
 *           "source": 3,
 *           "target": 2,
 *           "data": {}
 *         }
 *       ]
 *     }
 *   ]
 */

/**
 * @apiDefine ReturnNode
 * @apiSuccess {string}              id                  ID of the node
 * @apiSuccess {object}              data                Properties of the node
 * @apiSuccess {object}              [statistics]        Statistics of the node
 * @apiSuccess {type:LkDigestItem[]} [statistics.digest] Statistics of the neighborhood of the node
 * @apiSuccess {number}              [statistics.degree] Number of neighbors of the node readable by the current user
 * @apiSuccess {string[]}            categories          Categories of the node
 * @apiSuccess {number}              [version]           Version of the node
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 200 OK
 *   {
 *     "id": 123,
 *     "data": {
 *       "name": "Keanu Reeves",
 *       "born": 1964
 *     },
 *     "categories": [
 *       "Person"
 *     ],
 *     "statistics": {
 *       "digest": [
 *         {
 *           "nodeCategories": ["Movie"],
 *           "edgeType": "ACTED_IN",
 *           "nodes": 1,
 *           "edges": 1
 *         }
 *       ]
 *     }
 *   }
*/

/**
 * @apiDefine ReturnNodeOnUpdate
 * @apiSuccess {string}   id         ID of the node
 * @apiSuccess {object}   data       Properties of the node
 * @apiSuccess {string[]} categories Categories of the node
 * @apiSuccess {number}   version    Version of the node
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 200 OK
 *   {
 *     "id": 123,
 *     "data": {
 *       "name": "Keanu Reeves",
 *       "born": 1964
 *     },
 *     "categories": [
 *       "Person"
 *     ],
 *     "version": 2
 *   }
 */

/**
 * @apiDefine ReturnNodeOnCreate
 * @apiSuccess(Success 201) {string}   id         ID of the node
 * @apiSuccess(Success 201) {object}   data       Properties of the node
 * @apiSuccess(Success 201) {string[]} categories Categories of the node
 * @apiSuccess(Success 201) {number}   version    Version of the node
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 201 Created
 *   {
 *     "id": 123,
 *     "data": {
 *       "name": "Keanu Reeves",
 *       "born": 1964
 *     },
 *     "categories": [
 *       "Person"
 *     ],
 *     "version": 1
 *   }
 */

module.exports = function(app) {

  const readOnly = !Config.get('access.dataEdition');
  function throwIfReadOnly() {
    if (readOnly) { throw Errors.access('readonly_right'); }
  }

  /**
   * @api {get} /api/:dataSource/graph/nodes/count Get nodes count
   * @apiName GetNodesCount
   * @apiGroup Nodes
   * @apiPermission authenticated
   * @apiVersion 1.0.0
   *
   * @apiParam {string} dataSource Key of the data-source
   *
   * @apiSuccess {number} count The number of nodes
   *
   * @apiDescription Get the number of nodes in the graph.
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *       "count": 42
   *   }
   */
  app.get('/api/:dataSource/graph/nodes/count', api.respond(req => {
    return Access.isAuthenticated(req).then(() => {
      return DataProxy.getNodeCount(
        req.param('dataSource')
      );
    }).then(count => ({count: count}));
  }));

  /**
   * @api {post} /api/:dataSource/graph/nodes/expand Get adjacent nodes and edges
   *
   * @apiName GetAdjacentGraph
   * @apiGroup Nodes
   * @apiPermission authenticated
   * @apiPermission __guest
   * @apiPermission apiright:graphItem.read
   * @apiVersion 1.0.0
   *
   * @apiDescription
   * Get all the adjacent nodes and edges to one or more source nodes (`ids`).
   * The result is an array of nodes containing the sources nodes and their neighbors.
   * Edges between sources nodes and their neighbors - as well as edges between the neighbors themselves - are returned in the `edges` field of each node.
   *
   * If `visible_nodes` is specified, edges between source nodes, their neighbors and the visible nodes are also included.
   *
   * @apiParam {string}    dataSource           Key of the data-source
   * @apiParam {type:id[]} ids                  List of node IDs
   * @apiParam {type:id[]} ignored_nodes        IDs of the nodes to ignore (they won't be included in the result)
   * @apiParam {type:id[]} visible_nodes        IDs of nodes that are already visible (they won't be included in the result, but their adjacent edges will be included in the `edges` field of the adjacent nodes)
   * @apiParam {string}    node_category        Filter by node category (use `[no_category]` to match nodes with no categories)
   * @apiParam {string}    edge_type            Filter by edge type
   * @apiParam {number}    limit                Maximum number of returned nodes (**EXCLUDING** source nodes)
   * @apiParam {string="id", "highestDegree", "lowestDegree"} [limit_type="id"] Order direction used to limit the result
   * @apiParam {boolean}   [with_digest=false]  Whether to include the adjacency digest
   * @apiParam {boolean}   [with_degree=false]  Whether to include the degree in the returned nodes
   * @apiParam {boolean}   [with_version=false] Whether to include the node version
   *
   * @apiParamExample {json} Request-Example:
   *   {
   *     "ids": [1],
   *     "node_category": "Movie",
   *     "limit": 2,
   *     "limit_type": "highestDegree"
   *   }
   *
   * @apiUse ReturnSubGraph
   */
  app.post('/api/:dataSource/graph/nodes/expand', api.respond(req => {

    return DataProxy.getAdjacentNodes(
      req.param('ids'),
      {
        ignoredNodeIds: Utils.toStringArray(req.param('ignored_nodes')),
        visibleNodeIds: Utils.toStringArray(req.param('visible_nodes')),
        nodeCategory: req.param('node_category'),
        edgeType: req.param('edge_type'),
        limit: Utils.tryParsePosInt(req.param('limit'), 'limit', true),
        limitType: req.param('limit_type'),
        withDigest: Utils.parseBoolean(req.param('with_digest')),
        withDegree: Utils.parseBoolean(req.param('with_degree')),
        withVersion: Utils.parseBoolean(req.param('with_version'))
      },
      req.param('dataSource'),
      Access.getUserCheck(req, 'graphItem.read', true)
    );
  }));

  /**
   * @api {get} /api/:dataSource/graph/nodes/:id Get a node
   * @apiName GetNode
   * @apiGroup Nodes
   * @apiPermission authenticated
   * @apiPermission __guest
   * @apiPermission apiright:graphItem.read
   * @apiVersion 1.0.0
   *
   * @apiDescription Get a node of the graph.
   *
   * @apiParam {string}  dataSource           Key of the data-source
   * @apiParam {string}  id                   ID of the node
   * @apiParam {boolean} [with_edges=false]   Whether to include adjacent edges
   * @apiParam {boolean} [with_digest=false]  Whether to include the adjacency digest
   * @apiParam {boolean} [with_degree=false]  Whether to include the degree in the returned nodes
   * @apiParam {boolean} [with_version=false] Whether to include the node version
   *
   * @apiUse ReturnNode
   *
   */
  app.get('/api/:dataSource/graph/nodes/:id', api.respond(req => {
    return DataProxy.getNode(
      {
        id: req.param('id'),
        withEdges: Utils.parseBoolean(req.param('with_edges')),
        withDigest: Utils.parseBoolean(req.param('with_digest')),
        withDegree: Utils.parseBoolean(req.param('with_degree')),
        withVersion: Utils.parseBoolean(req.param('with_version')),
        alternativeId: req.param('alternative_id'),
        sourceKey: req.param('dataSource')
      },
      Access.getUserCheck(req, 'graphItem.read', true)
    );
  }));

  /**
   * @api {post} /api/:dataSource/graph/neighborhood/statistics Get statistics of adjacent nodes/edges
   * @apiName GetNeighborsStatistics
   * @apiGroup Nodes
   * @apiPermission authenticated
   * @apiPermission __guest
   * @apiPermission apiright:graphItem.read
   * @apiVersion 1.0.0
   *
   * @apiDescription Get the digest (the number of adjacent nodes and edges grouped by node categories and edge types)
   * and/or the degree of a given subset of nodes (`ids`).
   * You can't get aggregated statistics of a subset of nodes containing one or more supernodes.
   * To get the statistics of a supernode invoke the API with only its node ID.
   *
   * @apiParam {string}    dataSource           Key of the data-source
   * @apiParam {type:id[]} ids                  List of node IDs
   * @apiParam {boolean}   [with_digest=false]  Whether to include the adjacency digest
   * @apiParam {boolean}   [with_degree=false]  Whether to include the degree in the returned nodes
   *
   * @apiSuccess {type:LkDigestItem[]} [digest] Statistics of the neighborhood of the nodes
   * @apiSuccess {number}              [degree] Number of neighbors of the nodes readable by the current user
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "digest": [
   *       {
   *         "edgeType": "ACTED_IN",
   *         "nodeCategories": ["TheMatrix", "Movie"],
   *         "nodes": 1,
   *         "edges": 1
   *       }
   *     ],
   *     "degree": 1
   *   }
   */
  app.post('/api/:dataSource/graph/neighborhood/statistics', api.respond(req => {
    return DataProxy.getStatistics(
      Utils.toStringArray(req.param('ids')),
      req.param('dataSource'),
      {
        withDigest: Utils.parseBoolean(req.param('with_digest')),
        withDegree: Utils.parseBoolean(req.param('with_degree'))
      },
      Access.getUserCheck(req, 'graphItem.read', true)
    );
  }));

  /**
   * @api {post} /api/:dataSource/graph/nodes Create a node
   * @apiName PostNode
   * @apiGroup Nodes
   * @apiPermission authenticated
   * @apiPermission apiright:graphItem.create
   * @apiVersion 1.0.0
   *
   * @apiDescription Add a node to the graph.
   *
   * @apiParam {string}   dataSource   Key of the data-source
   * @apiParam {object}   [properties] Properties of the node
   * @apiParam {string[]} [categories] Categories of the node
   *
   * @apiUse ReturnNodeOnCreate
   */
  app.post('/api/:dataSource/graph/nodes', api.respond(req => {
    throwIfReadOnly();
    return DataProxy.createNode(
      {
        data: req.param('properties', {}),
        categories: req.param('categories', [])
      },
      req.param('dataSource'),
      Access.getUserCheck(req, 'graphItem.create')
    );
  }, 201));

  /**
   * @api {patch} /api/:dataSource/graph/nodes/:id Update a node
   * @apiName PatchNode
   * @apiGroup Nodes
   * @apiPermission authenticated
   * @apiPermission apiright:graphItem.edit
   * @apiVersion 1.0.0
   *
   * @apiDescription Update a subset of properties and categories of a node. Keep every other property and category of the node unchanged.
   *
   * @apiParam {string}   dataSource           Key of the data-source
   * @apiParam {string}   id                   ID of the node
   * @apiParam {object}   [properties]         Properties to update or create
   * @apiParam {string[]} [deleted_properties] Properties to delete
   * @apiParam {string[]} [added_categories]   Categories of the node to add
   * @apiParam {string[]} [deleted_categories] Categories of the node to delete
   * @apiParam {number}   version              The current node version
   *
   * @apiUse ReturnNodeOnUpdate
   */
  app.patch('/api/:dataSource/graph/nodes/:id', api.respond(req => {
    throwIfReadOnly();
    return DataProxy.updateNode(
      req.param('id'),
      {
        data: req.param('properties', {}),
        version: req.param('version'),
        deletedProperties: req.param('deleted_properties', []),
        addedCategories: req.param('added_categories', []),
        deletedCategories: req.param('deleted_categories', [])
      },
      req.param('dataSource'),
      Access.getUserCheck(req, 'graphItem.edit')
    );
  }));

  /**
   * @api {delete} /api/:dataSource/graph/nodes/:id Delete a node
   * @apiName DeleteNode
   * @apiGroup Nodes
   * @apiPermission authenticated
   * @apiPermission apiright:graphItem.delete
   * @apiVersion 1.0.0
   *
   * @apiDescription Delete a node and its adjacent edges from the graph.
   *
   * @apiParam {string}  dataSource Key of the data-source
   * @apiParam {string}  id         ID of the node
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 204 No Content
   */
  app.delete('/api/:dataSource/graph/nodes/:id', api.respond(req => {
    throwIfReadOnly();
    return DataProxy.deleteNode(
      req.param('id'),
      req.param('dataSource'),
      Access.getUserCheck(req, 'graphItem.delete')
    ).return(undefined);
  }, 204));
};
