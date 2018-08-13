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
const Data = LKE.getData(true);
const Utils = LKE.getUtils();
const Config = LKE.getConfig();
const Access = LKE.getAccess();
const Errors = LKE.getErrors();

// locals
const api = require('../api');

/**
 * @apiDefine ReturnEdge
 *
 * @apiSuccess {string}  id        ID of the edge
 * @apiSuccess {string}  source    ID of the source node
 * @apiSuccess {string}  target    ID of the target node
 * @apiSuccess {string}  type      Type of the edge
 * @apiSuccess {object}  data      Properties of the edge
 * @apiSuccess {number}  [version] Version of the edge
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 200 OK
 *   {
 *     "id": 1,
 *     "source": 1,
 *     "target": 2,
 *     "type": "my_link",
 *     "data": {
 *       "direction": "north"
 *     }
 *   }
 */

/**
 * @apiDefine ReturnEdgeOnUpdate
 *
 * @apiSuccess {string}  id      ID of the edge
 * @apiSuccess {string}  source  ID of the source node
 * @apiSuccess {string}  target  ID of the target node
 * @apiSuccess {string}  type    Type of the edge
 * @apiSuccess {object}  data    Properties of the edge
 * @apiSuccess {number}  version Version of the edge
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 200 OK
 *   {
 *     "id": 1,
 *     "source": 1,
 *     "target": 2,
 *     "type": "my_link",
 *     "data": {
 *       "direction": "north"
 *     },
 *     "version": 2
 *   }
 */

/**
 * @apiDefine ReturnEdgeOnCreate
 *
 * @apiSuccess(Success 201) {string}  id      ID of the edge
 * @apiSuccess(Success 201) {string}  source  ID of the source node
 * @apiSuccess(Success 201) {string}  target  ID of the target node
 * @apiSuccess(Success 201) {string}  type    Type of the edge
 * @apiSuccess(Success 201) {object}  data    Properties of the edge
 * @apiSuccess(Success 201) {number}  version Version of the edge
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 201 Created
 *   {
 *     "id": 1,
 *     "source": 1,
 *     "target": 2,
 *     "type": "my_link",
 *     "data": {
 *       "direction": "north"
 *     },
 *     "version": 1
 *   }
 */

/**
 * @apiDefine ReturnEdges
 *
 * @apiSuccess {object[]} edges        Edges
 * @apiSuccess {string}   edges.id     ID of the edge
 * @apiSuccess {string}   edges.source ID of the source node
 * @apiSuccess {string}   edges.target ID of the target node
 * @apiSuccess {string}   edges.type   Type of the edge
 * @apiSuccess {object}   edges.data   Properties of the edge
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 200 OK
 *   [
 *     {
 *       "id": 1,
 *       "source": 1,
 *       "target": 2,
 *       "type": "my_link",
 *       "data": {
 *         "direction": "south"
 *       }
 *     },
 *     {
 *       "id": 15,
 *       "source": 22,
 *       "target": 2,
 *       "type": "my_other_link",
 *       "data": {
 *         "direction": "north"
 *       }
 *     }
 *   ]
 */

module.exports = function(app) {

  function throwIfReadOnly() {
    if (!Config.get('access.dataEdition')) {
      throw Errors.access('readonly_right');
    }
  }

  /**
   * @api {get} /api/:dataSource/graph/edges/count Get edges count
   * @apiName GetEdgesCount
   * @apiGroup Edges
   * @apiPermission authenticated
   * @apiVersion 1.0.0
   *
   * @apiDescription Get the number of edges in the graph.
   *
   * @apiParam {string} dataSource Key of the data-source
   *
   * @apiSuccess {number} count The number of edges
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "count": 42
   *   }
   */
  app.get('/api/:dataSource/graph/edges/count', api.respond(req => {
    return Access.isAuthenticated(req).then(() => {
      return Data.getEdgeCount(
        req.param('dataSource')
      );
    }).then(count => ({count: count}));
  }));

  /**
   * @api {get} /api/:dataSource/graph/edges Get adjacent edges of a node
   * @apiName GetAdjacentEdged
   * @apiGroup Edges
   * @apiPermission authenticated
   * @apiPermission __guest
   * @apiPermission apiright:graphItem.read
   * @apiVersion 1.0.0
   *
   * @apiDescription Get the adjacent edges of a node from the graph.
   *
   * The **source**, **target** and **adjacent** parameters are mutually exclusive:
   *
   * - if **source** is provided, return outgoing edges only.
   * - otherwise, if **target** is provided, return incoming edges only.
   * - otherwise, if **adjacent** is provided, return all the adjacent edges.
   *
   * @apiParam {string} dataSource            Key of the data-source
   * @apiParam {string}  source               ID of the source node
   * @apiParam {string}  target               ID of the target node
   * @apiParam {string}  adjacent             ID of the node
   * @apiParam {string} [type]                Filter by edge type
   * @apiParam {number} skip                  Offset from the first result
   * @apiParam {number} limit                 Page size (maximum number of returned edges)
   * @apiParam {boolean} [with_version=false] Whether to include the edge versions
   *
   * @apiUse ReturnEdges
   */
  app.get('/api/:dataSource/graph/edges', api.respond(req => {
    return Data.getAdjacentEdges(
      {
        source: req.param('source'),
        target: req.param('target'),
        adjacent: req.param('adjacent'),
        type: req.param('type'),
        skip: Utils.tryParsePosInt(req.param('skip'), 'skip', true),
        limit: Utils.tryParsePosInt(req.param('limit'), 'limit', true),
        withVersion: Utils.parseBoolean(req.param('with_version'))
      },
      req.param('dataSource'),
      Access.getUserCheck(req, 'graphItem.read', true)
    );
  }));

  /**
   * @api {get} /api/:dataSource/graph/edges/:id Get an edge
   * @apiName GetEdge
   * @apiGroup Edges
   * @apiPermission authenticated
   * @apiPermission __guest
   * @apiPermission apiright:graphItem.read
   * @apiVersion 1.0.0
   *
   * @apiDescription Get an edge of the graph.
   *
   * @apiParam {string}  dataSource           Key of the data-source
   * @apiParam {string}  id                   ID of the edge
   * @apiParam {boolean} [with_version=false] Whether to include the edge version
   *
   * @apiUse ReturnEdge
   */
  app.get('/api/:dataSource/graph/edges/:id', api.respond(req => {
    return Data.getEdge(
      {
        id: req.param('id'),
        withVersion: Utils.parseBoolean(req.param('with_version')),
        sourceKey: req.param('dataSource'),
        alternativeId: req.param('alternative_id')
      },
      Access.getUserCheck(req, 'graphItem.read', true)
    );
  }));

  /**
   * @api {post} /api/:dataSource/graph/edges Create an edge
   * @apiName PostEdge
   * @apiGroup Edges
   * @apiPermission authenticated
   * @apiPermission apiright:graphItem.create
   * @apiVersion 1.0.0
   *
   * @apiDescription Add an edge to the graph.
   *
   * @apiParam {string}  dataSource Key of the data-source
   * @apiParam {string}  source     ID of the source node
   * @apiParam {string}  target     ID of the target node
   * @apiParam {string}  type       Type of the edge
   * @apiParam {object}  properties Properties of the edge
   *
   * @apiUse ReturnEdgeOnCreate
   */
  app.post('/api/:dataSource/graph/edges', api.respond(req => {
    throwIfReadOnly();
    return Data.createEdge(
      {
        source: req.param('source'),
        target: req.param('target'),
        type: req.param('type'),
        data: req.param('properties')
      },
      req.param('dataSource'),
      Access.getUserCheck(req, 'graphItem.create')
    );
  }, 201));

  /**
   * @api {patch} /api/:dataSource/graph/edges/:id Update an edge
   * @apiName PatchEdge
   * @apiGroup Edges
   * @apiPermission authenticated
   * @apiPermission apiright:graphItem.edit
   * @apiVersion 1.0.0
   *
   * @apiDescription Update a subset of properties and the type of an edge. Keep every other property of the edge unchanged.
   *
   * @apiParam {string}   dataSource           Key of the data-source
   * @apiParam {string}   id                   ID of the edge
   * @apiParam {object}   [properties]         Properties to update or create
   * @apiParam {string[]} [deleted_properties] Properties to delete
   * @apiParam {string}   [type]               Type of the edge to update
   * @apiParam {number}   version              The current edge version
   *
   * @apiUse ReturnEdgeOnUpdate
   */
  app.patch('/api/:dataSource/graph/edges/:id', api.respond(req => {
    throwIfReadOnly();
    return Data.updateEdge(
      req.param('id'),
      {
        data: req.param('properties'),
        deletedProperties: req.param('deleted_properties') || [],
        type: req.param('type'),
        version: req.param('version')
      },
      req.param('dataSource'),
      Access.getUserCheck(req, 'graphItem.edit')
    );
  }));

  /**
   * @api {delete} /api/:dataSource/graph/edges/:id Delete an edge
   *
   * @apiName DeleteEdge
   * @apiGroup Edges
   * @apiPermission authenticated
   * @apiPermission apiright:graphItem.delete
   * @apiVersion 1.0.0
   *
   * @apiDescription Delete a edge from the graph.
   *
   * @apiParam {string}  dataSource Key of the data-source
   * @apiParam {string}  id         ID of the edge
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 204 No Content
   */
  app.delete('/api/:dataSource/graph/edges/:id', api.respond(req => {
    throwIfReadOnly();
    return Data.deleteEdge(
      req.param('id'),
      req.param('dataSource'),
      Access.getUserCheck(req, 'graphItem.delete')
    ).return(undefined);
  }, 204));
};
