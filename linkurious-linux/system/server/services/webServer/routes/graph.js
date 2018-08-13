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
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const Access = LKE.getAccess();
const DataProxy = LKE.getData(true);
const GraphQueryDAO = LKE.getGraphQueryDAO();

// locals
const api = require('../api');

module.exports = function(app) {

  app.all('/api/:dataSource/graph/*', api.proxy(req => {
    return Access.isAuthenticated(req);
  }));

  /**
   * @apiDefine ReturnGraphQuery
   *
   * @apiSuccess {number} id        ID of the graph query
   * @apiSuccess {string} content   Content of the graph query
   * @apiSuccess {string} [name]    Name of the graph query
   * @apiSuccess {string} dialect   Dialect of the graph query (`cypher`, `gremlin`, `sparql`, etc.)
   * @apiSuccess {string} createdAt Creation date in ISO-8601 format
   * @apiSuccess {string} updatedAt Last update date in ISO-8601 format
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "id": 2,
   *     "name": "my other saved query",
   *     "dialect": "cypher",
   *     "content": "MATCH (n)-[r:DIRECTED]-(n2) RETURN n, r, n2",
   *     "createdAt": "2015-06-11T13:22:51.000Z",
   *     "updatedAt": "2015-06-11T13:22:51.000Z"
   *   }
   */

  /**
   * @apiDefine ReturnGraphQueryOnCreate
   *
   * @apiSuccess(Success 201) {number} id        ID of the graph query
   * @apiSuccess(Success 201) {string} content   Content of the graph query
   * @apiSuccess(Success 201) {string} [name]    Name of the graph query
   * @apiSuccess(Success 201) {string} dialect   Dialect of the graph query (`cypher`, `gremlin`, `sparql`, etc.)
   * @apiSuccess(Success 201) {string} createdAt Creation date in ISO-8601 format
   * @apiSuccess(Success 201) {string} updatedAt Last update date in ISO-8601 format
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 201 Created
   *   {
   *     "id": 1,
   *     "name": "my saved query",
   *     "dialect": "cypher",
   *     "content": "MATCH (n) RETURN n",
   *     "createdAt": "2015-06-11T13:22:51.000Z",
   *     "updatedAt": "2015-06-11T13:22:51.000Z"
   *   }
   */

  // run graph queries

  /**
   * @api {post} /api/:dataSource/graph/rawQuery Execute a graph query
   * @apiName RunRawGraphQuery
   * @apiGroup Graph
   * @apiPermission authenticated
   * @apiPermission apiright:rawReadQuery
   * @apiPermission apiright:rawWriteQuery
   * @apiPermission apiright:admin.alerts
   * @apiVersion 1.0.0
   *
   * @apiDescription Get all the nodes and edges matching the given graph query.
   *
   * @apiParam {string}  dataSource           Key of the data-source
   * @apiParam {string}  [dialect]            Dialect of the graph query (`cypher`, `gremlin`, `sparql`, etc.). If not defined, it defaults to the first supported dialect of the data-source
   * @apiParam {string}  query                Content of the graph query
   * @apiParam {number}  [limit]              Maximum limit for number of results
   * @apiParam {number}  [timeout]            Query maximum execution time (in milliseconds)
   * @apiParam {boolean} [with_version=false] Whether to include the node and edge versions
   * @apiParam {boolean} [with_digest=false]  Whether to include the adjacency digest in the returned nodes
   * @apiParam {boolean} [with_degree=false]  Whether to include the degree in the returned nodes
   * @apiParam {boolean} [groupResults=true]  Whether to group all the matched subgraphs in one subgraph
   * @apiParam {object[]}                 [columns]          Columns among the returned values of the query to return as scalar values (this is a valid parameter only if `group_results` is `false`)
   * @apiParam {string="number","string"} columns.type       Type of the column
   * @apiParam {string}                   columns.columnName Name of the column in the query
   *
   * @apiSuccessExample {json} groupResults=false:
   *   HTTP/1.1 200 OK
   *   [
   *     {
   *       "nodes": [
   *         {
   *           "id": 1,
   *           "data": {
   *             "name": "Keanu Reeves",
   *             "born": 1964
   *           },
   *           "categories": ["Person"],
   *           "statistics": {
   *             "digest": [
   *               {
   *                 "nodeCategories": ["Movie", "TheMatrix", "TheMatrixReloaded"],
   *                 "edgeType": "ACTED_IN",
   *                 "nodes": 3,
   *                 "edges": 3
   *               }
   *             ]
   *           },
   *           "edges": [
   *             {
   *               "id": 100,
   *               "type": "ACTED_IN",
   *               "source": 1,
   *               "target": 2,
   *               "data": {
   *                 "role": "Neo"
   *               }
   *             },
   *             {
   *               "id": 101,
   *               "type": "ACTED_IN",
   *               "source": 1,
   *               "target": 3,
   *               "data": {
   *                 "role": "Neo"
   *               }
   *             }
   *           ]
   *         },
   *         {
   *           "id": 2,
   *           "data": {
   *             "title": "The Matrix",
   *             "release": 1999
   *           },
   *           "categories": ["Movie"],
   *           "statistics": {
   *             "digest": [
   *               {
   *                 "nodeCategories": ["Person"],
   *                 "edgeType": "ACTED_IN",
   *                 "nodes": 2,
   *                 "edges": 2
   *               }
   *             ]
   *           },
   *           "edges": [
   *             {
   *               "id": 100,
   *               "type": "ACTED_IN",
   *               "source": 1,
   *               "target": 2,
   *               "data": {
   *                 "role": "Neo"
   *               }
   *             },
   *             {
   *               "id": 102
   *               "type": "SEQUEL_OF",
   *               "source": 3,
   *               "target": 2,
   *               "data": {}
   *             }
   *           ]
   *         },
   *         {
   *           "id": 3,
   *           "data": {
   *             "title": "The Matrix Reloaded",
   *             "release": 2003
   *           },
   *           "categories": ["Movie"],
   *           "statistics": {
   *             "digest": [
   *               {
   *                 "nodeCategories": ["Person"],
   *                 "edgeType": "ACTED_IN",
   *                 "nodes": 2,
   *                 "edges": 2
   *               }
   *             ]
   *           },
   *           "edges": [
   *             {
   *               "id": 101,
   *               "type": "ACTED_IN",
   *               "source": 1,
   *               "target": 3,
   *               "data": {
   *                 "role": "Neo"
   *               }
   *             },
   *             {
   *               "id": 102
   *               "type": "SEQUEL_OF",
   *               "source": 3,
   *               "target": 2,
   *               "data": {}
   *             }
   *           ]
   *         }
   *       ],
   *       "columns": [
   *         1999
   *       ]
   *     },
   *     {
   *       "nodes": [
   *         // ...
   *       ],
   *       "columns": [
   *         1998
   *       ]
   *     }
   *   ]
   *
   * @apiUse ReturnSubGraph
   */
  app.post('/api/:dataSource/graph/rawQuery', api.respond(req => {
    if (!LKE.isEnterprise() && req.param('groupResults') === false) {
      return Errors.business(
        'not_implemented',
        'Non grouped results are not available in Linkurious Starter edition.', true
      );
    }

    // special case of access right enforced by the DAO ("canWrite" passed to the graph DAO)
    const user = Access.getUserCheck(req, 'graph.rawRead');
    let canWrite = true;
    if (Utils.hasValue(req.application)) {
      canWrite = req.application.rights['graph.rawWrite'];
    }

    if (req.param('groupResults') !== false) { // default value is true
      return DataProxy.rawQuery({
        sourceKey: req.param('dataSource'),
        query: req.param('query'),
        dialect: req.param('dialect'),
        limit: req.param('limit'),
        timeout: req.param('timeout'),
        withVersion: Utils.parseBoolean(req.param('with_version')),
        withDigest: Utils.parseBoolean(req.param('with_digest')),
        withDegree: Utils.parseBoolean(req.param('with_degree')),
        canWrite: canWrite
      }, user);
    } else {
      return DataProxy.alertPreviewQuery({
        sourceKey: req.param('dataSource'),
        query: req.param('query'),
        dialect: req.param('dialect'),
        columns: req.param('columns'),
        limit: req.param('limit'),
        timeout: req.param('timeout'),
        withVersion: Utils.parseBoolean(req.param('with_version')),
        withDigest: Utils.parseBoolean(req.param('with_digest')),
        withDegree: Utils.parseBoolean(req.param('with_degree'))
      }, user);
    }
  }));

  // Saved graph queries

  /**
   * @api {post} /api/:dataSource/graph/my/rawQuery Save a graph query
   * @apiName SaveRawGraphQuery
   * @apiGroup Graph
   * @apiPermission authenticated
   * @apiPermission apiright:savedGraphQuery.create
   * @apiVersion 1.0.0
   *
   * @apiDescription Save a graph query for the current user.
   *
   * @apiParam {string} dataSource Key of the data-source
   * @apiParam {string} dialect    Dialect of the graph query (`cypher`, `gremlin`, `sparql`, etc.)
   * @apiParam {string} content    Content of the graph query
   * @apiParam {string} [name]     Name of the graph query
   *
   * @apiUse ReturnGraphQueryOnCreate
   */
  app.post('/api/:dataSource/graph/my/rawQuery', api.respond(req => {
    return GraphQueryDAO.createQuery({
      sourceKey: req.param('dataSource'),
      name: req.param('name'),
      content: req.param('content'),
      dialect: req.param('dialect')
    }, Access.getUserCheck(req, 'savedGraphQuery.create'));
  }, 201));

  /**
   * @api {get} /api/:dataSource/graph/my/rawQuery/all Get all saved graph queries
   * @apiName ListRawGraphQuery
   * @apiGroup Graph
   * @apiPermission authenticated
   * @apiPermission apiright:savedGraphQuery.read
   * @apiVersion 1.0.0
   *
   * @apiDescription Get all the graph queries owned by the current user.
   *
   * @apiParam {string} dataSource Key of the data-source
   *
   * @apiSuccess {object[]} queries           Graph queries
   * @apiSuccess {number}   queries.id        ID of the graph query
   * @apiSuccess {string}   queries.content   Content of the graph query
   * @apiSuccess {string}   [queries.name]    Name of the graph query
   * @apiSuccess {string}   queries.dialect   Dialect of the graph query (`cypher`, `gremlin`, `sparql`, etc.)
   * @apiSuccess {string}   queries.createdAt Creation date in ISO-8601 format
   * @apiSuccess {string}   queries.updatedAt Last update date in ISO-8601 format
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   [
   *     {
   *       "id": 1,
   *       "name": "my saved query",
   *       "dialect": "cypher",
   *       "content": "MATCH (n) RETURN n",
   *       "createdAt": "2015-06-11T13:22:51.000Z",
   *       "updatedAt": "2015-06-11T13:22:51.000Z"
   *     },
   *     {
   *       "id": 2,
   *       "name": "my other saved query",
   *       "dialect": "cypher",
   *       "content": "MATCH (n)-[r:DIRECTED]-(n2) RETURN n, r, n2",
   *       "createdAt": "2015-06-11T13:22:51.000Z",
   *       "updatedAt": "2015-06-11T13:22:51.000Z"
   *     }
   *   ]
   */
  app.get('/api/:dataSource/graph/my/rawQuery/all', api.respond(req => {
    return GraphQueryDAO.listQueries(
      req.param('dataSource'),
      Access.getUserCheck(req, 'savedGraphQuery.read')
    );
  }));

  /**
   * @api {get} /api/:dataSource/graph/my/rawQuery/:id Get a saved graph query
   * @apiName GetRawGraphQuery
   * @apiGroup Graph
   * @apiPermission authenticated
   * @apiPermission apiright:savedGraphQuery.read
   * @apiVersion 1.0.0
   *
   * @apiDescription Get a graph query owned by the current user.
   *
   * @apiParam {string} dataSource Key of the data-source
   * @apiParam {number} id         ID of the graph query
   *
   * @apiUse ReturnGraphQuery
   */
  app.get('/api/:dataSource/graph/my/rawQuery/:id', api.respond(req => {
    return GraphQueryDAO.getQuery(
      Utils.tryParsePosInt(req.param('id'), 'id'),
      Access.getUserCheck(req, 'savedGraphQuery.read'));
  }));

  /**
   * @api {delete} /api/:dataSource/graph/my/rawQuery/:id Delete a saved graph query
   * @apiName DeleteRawGraphQuery
   * @apiGroup Graph
   * @apiPermission authenticated
   * @apiPermission apiright:savedGraphQuery.delete
   * @apiVersion 1.0.0
   *
   * @apiDescription Delete a graph query owned by the current user.
   *
   * @apiParam {string} dataSource Key of the data-source
   * @apiParam {number} id         ID of the graph query
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 204 No Content
   */
  app.delete('/api/:dataSource/graph/my/rawQuery/:id', api.respond(req => {
    return GraphQueryDAO.deleteQuery(
      Utils.tryParsePosInt(req.param('id'), 'id'),
      Access.getUserCheck(req, 'savedGraphQuery.delete')
    );
  }, 204));

  /**
   * @api {patch} /api/:dataSource/graph/my/rawQuery/:id Update a saved graph query
   * @apiName UpdateRawGraphQuery
   * @apiGroup Graph
   * @apiPermission authenticated
   * @apiPermission apiright:savedGraphQuery.edit
   * @apiVersion 1.0.0
   *
   * @apiDescription Update a graph query owned by the current user.
   *
   * @apiParam {string} dataSource Key of the data-source
   * @apiParam {number} id         ID of the graph query
   * @apiParam {string} [name]     New name of the graph query
   * @apiParam {string} [content]  New content of the graph query
   *
   * @apiUse ReturnGraphQuery
   */
  app.patch('/api/:dataSource/graph/my/rawQuery/:id', api.respond(req => {
    // @backward-compatibility for compatibility with older version, saved raw queries
    const properties = req.param('properties');

    return GraphQueryDAO.updateQuery(
      Utils.tryParsePosInt(req.param('id'), 'id'),
      {
        name: req.param('name', properties.name),
        content: req.param('content', properties.content)
      },
      Access.getUserCheck(req, 'savedGraphQuery.edit')
    );
  }));

  /**
   * @api {get} /api/:dataSource/graph/shortestPaths Get all the shortest paths between two nodes
   * @apiName GetAllShortestPaths
   * @apiGroup Graph
   * @apiPermission authenticated
   * @apiPermission apiright:graph.shortestPath
   * @apiVersion 1.0.0
   *
   * @apiDescription
   * Get an array containing all the shortest paths between two given nodes.
   * A path is not returned if the current user doesn't have read access to each element of the path.
   * Edges will appear only on the first node in the path.
   *
   * @apiParam {string}  dataSource           Key of the data-source
   * @apiParam {string}  startNode            ID of the starting node
   * @apiParam {string}  endNode              ID of the ending node
   * @apiParam {number}  [maxDepth]           Max depth of the shortest path
   * @apiParam {boolean} [with_version=false] Whether to include the node and edge versions
   * @apiParam {boolean} [with_digest=false]  Whether to include the adjacency digest in the returned nodes
   * @apiParam {boolean} [with_degree=false]  Whether to include the degree in the returned nodes
   *
   * @apiSuccess {object[][]} results              Paths
   * @apiSuccess {string}     results.id           ID of the node
   * @apiSuccess {object}     results.data         Properties of the node
   * @apiSuccess {string[]}   results.categories   Categories of the node
   * @apiSuccess {object}     [results.statistics] Statistics of the node
   * @apiSuccess {type:LkDigestItem[]} [results.statistics.digest] Statistics of the neighborhood of the node
   * @apiSuccess {number}              [results.statistics.degree] Number of neighbors of the node readable by the current user
   * @apiSuccess {object[]}   results.edges        Subset of adjacent edges of this node (only the ones belonging to the path)
   * @apiSuccess {string}     results.edges.id     ID of the edge
   * @apiSuccess {object}     results.edges.data   Properties of the edge
   * @apiSuccess {string}     results.edges.type   Type of the edge
   * @apiSuccess {string}     results.edges.source ID of the source node
   * @apiSuccess {string}     results.edges.target ID of the target node
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "results": [
   *       [
   *         {
   *           "id": 1,
   *           "categories": ["COMPANY"],
   *           "data": {"name": "Linkurious", "created": 2013},
   *           "edges": [
   *             {"id": 6, "source": 1, "target": 2, "type": "HAS_CITY", "data": {"address": "75014"}}
   *           ]
   *         },
   *         {
   *           "id": 2,
   *           "categories": ["CITY"],
   *           "data": {"name": "Paris", "size": 7000000},
   *           "edges": [
   *             {"id": 7, "source": 3, "target": 2, "type": "HAS_CITY", "data": {"address": "75009"}}
   *           ]
   *         },
   *         {
   *           "id": 3,
   *           "categories": ["COMPANY"],
   *           "data": {"name": "Linkfluence", "created": 2006},
   *           "edges": [
   *           ]
   *         }
   *       ]
   *     ]
   *   }
   */
  app.get('/api/:dataSource/graph/shortestPaths', api.respond(req => {
    return DataProxy.getAllShortestPaths(
      req.param('startNode', req.param('start_node')),
      req.param('endNode', req.param('end_node')),
      {
        maxDepth: req.param('maxDepth', req.param('max_depth')),
        withVersion: Utils.parseBoolean(req.param('with_version')),
        withDigest: Utils.parseBoolean(req.param('with_digest')),
        withDegree: Utils.parseBoolean(req.param('with_degree'))
      },
      req.param('dataSource'),
      Access.getUserCheck(req, 'graph.shortestPath')
    ).then(r => ({results: r}));
  }));

};
