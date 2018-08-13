/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-10-15.
 */
'use strict';

// services
const LKE = require('../../index');
const Access = LKE.getAccess();
const Utils = LKE.getUtils();
const DataProxy = LKE.getData(true);

// locals
const api = require('../api');

module.exports = function(app) {

  app.all('/api/:dataSource/graph/schema*', api.proxy(req => {
    return Access.isAuthenticated(req);
  }));

  /**
   * @api {get} /api/:dataSource/graph/schema/simple Get simple schema before first indexation
   * @apiName GetSimpleSchema
   * @apiGroup Schema
   * @apiPermission authenticated
   * @apiPermission apiright:schema
   * @apiVersion 1.0.0
   *
   * @apiParam {string}  dataSource Key of a data-source
   *
   * @apiDescription List nodeCategories, edgeTypes, nodeProperties and edgeProperties before the
   *                 first indexation.
   *
   * @apiSuccess {string[]} nodeCategories list of node categories defined in the graph DB
   * @apiSuccess {string[]} edgeTypes      list of edge types defined in the graph DB
   * @apiSuccess {string[]} nodeProperties list of node properties defined in the graph DB
   * @apiSuccess {string[]} edgeProperties list of edge properties defined in the graph DB
   *
   * @apiSuccessExample {json} Success-Response:
   *     HTTP/1.1 200 OK
   *     {
   *       "nodeCategories": ["Movie", "Person"],
   *       "edgeTypes": ["ACTED_IN", "DIRECTED"],
   *       "nodeProperties": ["title", "name", "released"],
   *       "edgeProperties": ["role"]
   *    }
   */
  app.get('/api/:dataSource/graph/schema/simple', api.respond(req => {
    return DataProxy.getSimpleSchema(req.param('dataSource'));
  }));

  /**
   * @api {get} /api/:dataSource/graph/schema/nodeTypes Get node schema
   * @apiName GetSchemaNodeTypes
   * @apiGroup Schema
   * @apiPermission authenticated
   * @apiPermission __guest
   * @apiPermission apiright:schema
   * @apiVersion 1.0.0
   *
   * @apiDescription List node-types indexed by Linkurious
   *
   * @apiParam {string}  dataSource            Key of a data-source
   * @apiParam {boolean} [omit_inferred=false] Whether to omit inferred types (they have ugly names)
   * @apiParam {boolean} [include_type=false]  Whether to include property type info (from index)
   *
   * @apiSuccess {object[]} nodeTypes All known node types.
   * @apiSuccess {string}   nodeTypes.name Name of the node type (node category)
   * @apiSuccess {string}   nodeTypes.count Number of nodes with this type.
   * @apiSuccess {object[]} nodeTypes.properties Existing properties for the node type.
   * @apiSuccess {string}   nodeTypes.properties.key Key of the node-type property.
   * @apiSuccess {string}   nodeTypes.properties.count Number properties with this key for this node-type.
   * @apiSuccess {string=undefined,"string","boolean","long","integer","double","float","date"} nodeTypes.properties.type Type of the property (Only when `"include_type"` is true).
   *
   * @apiSuccessExample {json} Success-Response:
   *     HTTP/1.1 200 OK
   *     {
   *       "nodeTypes": [
   *            {
   *                 "name": "Movie",
   *                 "count": 38,
   *                 "properties": [
   *                     {"key": "released", "count": 38},
   *                     {"key": "tagline", "count": 37},
   *                     {"key": "title", "count": 38}
   *                ]
   *            }
   *        ]
   *    }
   *
   * @apiSuccessExample {json} Success-Response (with type):
   *     HTTP/1.1 200 OK
   *     {
   *       "nodeTypes": [
   *            {
   *                 "name": "Movie",
   *                 "count": 38,
   *                 "properties": [
   *                     {"key": "released", "count": 38, "type": "date"},
   *                     {"key": "tagline", "count": 37, "type": "string"},
   *                     {"key": "title", "count": 38, "type": "string"}
   *                ]
   *            }
   *        ]
   *    }
   */
  app.get('/api/:dataSource/graph/schema/nodeTypes', api.respond(req => {
    return DataProxy.getSchemaNodeTypes({
      sourceKey: req.param('dataSource'),
      includeType: Utils.parseBoolean(req.param('include_type')),
      omitInferred: Utils.parseBoolean(req.param('omit_inferred'))
    }, Access.getUserCheck(req, 'schema', true)).then(r => ({nodeTypes: r}));
  }));

  /**
   * @api {get} /api/:dataSource/graph/schema/nodeTypes/properties List node-type properties
   *
   * @apiName GetSchemaNodeProperties
   * @apiGroup Schema
   * @apiPermission authenticated
   * @apiPermission __guest
   * @apiPermission apiright:schema
   * @apiVersion 1.0.0
   *
   * @apiDescription List all node-type properties (aggregated from all nodeTypes)
   *
   * @apiParam {string} dataSource key of a data-source
   * @apiParam {boolean} [include_type=false] whether to include property type info (from index)
   * @apiParam {boolean} [omit_noindex=false] whether to omit no-index properties
   *
   * @apiSuccess {object[]} properties
   * @apiSuccess {string} properties.key Key of the property.
   * @apiSuccess {string} properties.count Number of properties with that key.
   * @apiSuccess {string=undefined,"string","boolean","long","integer","double","float","date"} properties.type Type of the property (Only when `"include_type"` is true).
   *
   * @apiSuccessExample {json} Success-Response:
   *      HTTP/1.1 200 OK
   *      {
   *        "properties": [
   *          {"key": "tagline", "count": 38},
   *          {"key": "released", "count": 39},
   *          {"key": "name", "count": 133}
   *        ]
   *      }
   *
   * @apiSuccessExample {json} Success-Response (with type):
   *      HTTP/1.1 200 OK
   *      {
   *        "properties": [
   *          {"key": "tagline", "count": 38, "type": "string"},
   *          {"key": "released", "count": 39, "type": "date"},
   *          {"key": "name", "count": 133, "type": "string"}
   *        ]
   *      }
   */
  app.get('/api/:dataSource/graph/schema/nodeTypes/properties', api.respond(req => {
    return DataProxy.getSchemaNodeProperties({
      sourceKey: req.param('dataSource'),
      includeType: Utils.parseBoolean(req.param('include_type')),
      omitNoIndex: Utils.parseBoolean(req.param('omit_noindex'))
    }, Access.getUserCheck(req, 'schema', true)).then(r => ({properties: r}));
  }));

  /**
   * @api {get} /api/:dataSource/graph/schema/edgeTypes List edge-types
   * @apiName GetSchemaEdgeTypes
   * @apiGroup Schema
   * @apiPermission authenticated
   * @apiPermission __guest
   * @apiPermission apiright:schema
   * @apiVersion 1.0.0
   *
   * @apiDescription List edge-types indexed by linkurious
   *
   * @apiParam {boolean} [include_type=false] Whether to include property type info (from index)
   * @apiParam {string} dataSource            Key of a data-source
   *
   * @apiSuccess {object[]} edgeTypes All known edge types.
   * @apiSuccess {string}   edgeTypes.name Name of the node type
   * @apiSuccess {string}   edgeTypes.count Number of edges with this type.
   * @apiSuccess {object[]} edgeTypes.properties Existing properties for the edge type.
   * @apiSuccess {string}   edgeTypes.properties.key Key of the edge-type property.
   * @apiSuccess {string}   edgeTypes.properties.count Number properties with this key for this edge-type.
   * @apiSuccess {string=undefined,"string","boolean","long","integer","double","float","date"} edgeTypes.properties.type Type of the property (Only when `"include_type"` is true).
   *
   * @apiSuccessExample {json} Success-Response:
   *     HTTP/1.1 200 OK
   *     {
   *       "edgeTypes": [
   *         {
   *           "count": 38,
   *           "name": "DIRECTED_BY"
   *           "properties": [
   *             {"key": "released", "count": 38},
   *             {"key": "tagline", "count": 37},
   *             {"key": "title", "count": 38}
   *           ]
   *         },
   *         {
   *           "count": 71,
   *           "name": "ACTED_IN"
   *           "properties": [
   *             {"key": "role", "count": 4},
   *             {"key": "salary", "count": 12}
   *           ]
   *         }
   *       ]
   *     }
   *
   * @apiSuccessExample {json} Success-Response (with type):
   *     HTTP/1.1 200 OK
   *     {
   *       "edgeTypes": [
   *         {
   *           "count": 38,
   *           "name": "DIRECTED_BY"
   *           "properties": [
   *             {"key": "released", "count": 38, "type": "date"},
   *             {"key": "tagline", "count": 37, "type": "string"},
   *             {"key": "title", "count": 38, "type": "string"}
   *           ]
   *         },
   *         {
   *           "count": 71,
   *           "name": "ACTED_IN"
   *           "properties": [
   *             {"key": "role", "count": 4, "type": "string"},
   *             {"key": "salary", "count": 12, "type": "integer"}
   *           ]
   *         }
   *       ]
   *     }
   */
  app.get('/api/:dataSource/graph/schema/edgeTypes', api.respond(req => {
    return DataProxy.getSchemaEdgeTypes({
      sourceKey: req.param('dataSource'),
      includeType: Utils.parseBoolean(req.param('include_type'))
    }, Access.getUserCheck(req, 'schema', true)).then(r => ({edgeTypes: r}));
  }));

  /**
   * @api {get} /api/:dataSource/graph/schema/edgeTypes/properties List edge-type properties
   *
   * @apiName GetSchemaEdgeProperties
   * @apiGroup Schema
   * @apiPermission authenticated
   * @apiPermission __guest
   * @apiPermission apiright:schema
   * @apiVersion 1.0.0
   *
   * @apiDescription List all edgeType properties (aggregated from all edgeTypes)
   *
   * @apiParam {string} dataSource           Key of a data-source
   * @apiParam {string} [include_type=false] Whether to include property type info (from index)
   * @apiParam {boolean} [omit_noindex=false] whether to omit no-index properties
   *
   * @apiSuccess {object[]} properties
   * @apiSuccess {string} properties.key Key of the property.
   * @apiSuccess {string} properties.count Number of properties with that key.
   * @apiSuccess {string=undefined,"string","boolean","long","integer","double","float","date"} properties.type Type of the property (Only when `"include_type"` is true).
   *
   * @apiSuccessExample {json} Success-Response:
   *      HTTP/1.1 200 OK
   *      {
   *        "properties": [
   *          {"key": "tagline", "count": 38},
   *          {"key": "born", "count": 128},
   *          {"key": "name", "count": 133}
   *        ]
   *      }
   *
   * @apiSuccessExample {json} Success-Response (with type):
   *      HTTP/1.1 200 OK
   *      {
   *        "properties": [
   *          {"key": "tagline", "count": 38, "type": "string"},
   *          {"key": "born", "count": 128, "type": "date"},
   *          {"key": "name", "count": 133, "type": "string"}
   *        ]
   *      }
   */
  app.get('/api/:dataSource/graph/schema/edgeTypes/properties', api.respond(req => {
    return DataProxy.getSchemaEdgeProperties({
      sourceKey: req.param('dataSource'),
      includeType: Utils.parseBoolean(req.param('include_type')),
      omitNoIndex: Utils.parseBoolean(req.param('omit_noindex'))
    }, Access.getUserCheck(req, 'schema', true)).then(r => ({properties: r}));
  }));
};
