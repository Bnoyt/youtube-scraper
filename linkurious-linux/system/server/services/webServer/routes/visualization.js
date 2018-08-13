/**
 * LINKURIOUS CONFIDENTIAL
 * __________________
 *
 *  [2012] - [2014] Linkurious SAS
 *  All Rights Reserved.
 *
 */
'use strict';

// ext libs
const Promise = require('bluebird');

// services
const LKE = require('../../index');
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const Access = LKE.getAccess();
const VisualizationDAO = LKE.getVisualizationDAO();
const VisualizationShareDAO = LKE.getVisualizationShareDAO();
const WidgetDAO = LKE.getWidgetDAO();

// locals
const api = require('../api');

module.exports = function(app) {

  app.all('/api/:dataSource/visualizations*', api.proxy(req => {
    return Access.isAuthenticated(req);
  }));

  app.all('/api/:dataSource/sandbox*', api.proxy(req => {
    return Access.isAuthenticated(req);
  }));

  /**
   * @api {get} /api/:dataSource/visualizations/shared Get visualizations shared with current user
   * @apiName sharedVisualizations
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:visualization.list
   *
   * @apiDescription Get all visualizations shared with the current user
   *
   * @apiParam {string} dataSource key of a data-source
   *
   * @apiSuccess {string} title           Title of the visualization
   * @apiSuccess {number} visualizationId ID of the visualization
   * @apiSuccess {number} ownerId         ID of the user that owns the visualization
   * @apiSuccess {string} sourceKey       Key of the dataSource the visualization is related to
   */
  app.get('/api/:dataSource/visualizations/shared', api.respond(req => {
    if (!VisualizationShareDAO) { return Promise.resolve(); }
    return VisualizationShareDAO.getSharedWithMe(
      req.param('dataSource'),
      Access.getUserCheck(req, 'visualization.list')
    );
  }));

  /**
   * @api {post} /api/:dataSource/visualizations/folder Create a visualization folder
   * @apiName createVisualizationFolder
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:visualizationFolder.create
   *
   * @apiDescription Create a folder for visualizations
   *
   * @apiParam {String} title  Folder title
   * @apiParam {Number} parent Parent folder id
   * @apiParam {string} dataSource key of a data-source
   *
   */
  app.post('/api/:dataSource/visualizations/folder', api.respond(req => {
    return VisualizationDAO.createFolder(
      req.param('title'),
      req.param('parent', null),
      req.param('dataSource'),
      Access.getUserCheck(req, 'visualizationFolder.create')
    ).then(r => ({folder: r}));
  }, 201));

  /**
   * @api {patch} /api/:dataSource/visualizations/folder/:id Update a visualization folder
   * @apiName updateVisualizationFolder
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:visualizationFolder.edit
   *
   * @apiDescription Update a property of a folder
   *
   * @apiParam {string} key Property key to edit
   * @apiParam {string} value Property new value of the edited property
   * @apiParam {string} dataSource key of a data-source (for API homogeneity, not actually used)
   *
   */
  app.patch('/api/:dataSource/visualizations/folder/:id', api.respond(req => {
    return VisualizationDAO.updateFolder(
      req.param('id'),
      req.param('key'),
      req.param('value', null),
      Access.getUserCheck(req, 'visualizationFolder.edit')
    ).then(r => ({folder: r}));
  }));

  /**
   * @api {delete} /api/:dataSource/visualizations/folder/:id Delete a visualization folder
   * @apiName deleteVisualizationFolder
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:visualizationFolder.delete
   *
   * @apiDescription Remove the specified folder and its children (visualizations and sub-folders)
   *
   * @apiParam {number} visualization ID
   * @apiParam {string} dataSource key of a data-source (for API homogeneity, not actually used)
   *
   */
  app.delete('/api/:dataSource/visualizations/folder/:id', api.respond(req => {
    return VisualizationDAO.removeFolder(
      req.param('id'),
      Access.getUserCheck(req, 'visualizationFolder.delete')
    );
  }, 204));

  /**
   * @api {get} /api/:dataSource/visualizations/tree Get the visualization tree
   * @apiName getVisualizationTree
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:visualization.list
   * @apiDescription Return visualizations ordered with folders hierarchy.
   *
   * @apiParam {string} dataSource key of a data-source
   *
   * @apiSuccess {Object} response
   * @apiSuccess {Object[]} response.tree
   * @apiSuccess {string} response.tree.type `"visu"` or `"folder"`
   * @apiSuccess {number} response.tree.id visualization or folder ID
   * @apiSuccess {string} response.tree.title visualization or folder title
   * @apiSuccess {object[]} [response.tree.children] children visualizations and folders
   *                                                 (mandatory when `type` is `"folder"`)
   * @apiSuccess {number} [response.tree.shareCount] number of users a visualization is shared with
   *                                                 (mandatory `type` is `"visu"`)
   * @apiSuccess {string} [response.tree.widgetKey] key of the widget created for this visualization
   *                                                (possible if `type` is `"visu"`)
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "tree": [
   *      {
   *        "id": 1,
   *        "type": "folder",
   *        "title": "Toto",
   *        "children": [
   *          {
   *            "id": 2,
   *            "type": "folder",
   *            "title": "Titi",
   *            "children": [
   *              {
   *                "id": 3,
   *                "type": "visu",
   *                "title": "vis. three",
   *                "shareCount": 0,
   *                "widgetKey": "aef3ce"
   *              }
   *            ]
   *          },
   *          {
   *            "id": 1,
   *            "type": "vis. one",
   *            "title": "a",
   *            "shareCount": 0
   *          },
   *          {
   *            "id": 2,
   *            "type": "visu",
   *            "title": "vis. two",
   *            "shareCount": 0
   *          }
   *        ]
   *      },
   *      {
   *        "id": 4,
   *        "type": "visu",
   *        "title": "vis. four",
   *        "shareCount": 0
   *      }
   *    ]
   *   }
   */
  app.get('/api/:dataSource/visualizations/tree', api.respond(req => {
    return VisualizationDAO.getTree(
      req.param('dataSource'),
      Access.getUserCheck(req, 'visualization.list')
    ).then(r => ({tree: r}));
  }));

  /**
   * @api {get} /api/:dataSource/visualizations/count Get visualizations count
   * @apiName GetVisualizationCount
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiDescription Get the number of visualizations for this data-source.
   *
   * @apiParam {string} dataSource key of a data-source
   *
   * @apiSuccess {number} count
   */
  app.get('/api/:dataSource/visualizations/count', api.respond(req => {
    const wrappedUser = Access.getCurrentWrappedUser(req);
    wrappedUser.canSeeDataSource(req.param('dataSource'));

    return VisualizationDAO.getVisualizationCount(
      req.param('dataSource')
    ).then(count => ({count: count}));
  }));

  /**
   * @api {get} /api/:dataSource/visualizations/:id Get a visualization
   * @apiName GetVisualization
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:visualization.read
   *
   * @apiDescription Return a visualization selected by ID.
   *
   * @apiParam {string}  dataSource        Key of the data-source
   * @apiParam {number}  id                ID of the isualization
   * @apiParam {boolean} [populated=false] Whether nodes and edges are populated of data, categories, version, type, source and target
   * @apiParam {boolean} [with_digest=false]  Whether to include the adjacency digest in the returned nodes
   * @apiParam {boolean} [with_degree=false]  Whether to include the degree in the returned nodes
   *
   * @apiSuccess {object}                  visualization                           The visualization
   * @apiSuccess {number}                  visualization.id                        ID of the visualization
   * @apiSuccess {string}                  visualization.title                     Title of the visualization
   * @apiSuccess {number}                  visualization.folder                    Parent visualizationFolder ID (-1 for root folder)
   * @apiSuccess {object[]}                visualization.nodes                     Nodes in this visualization
   * @apiSuccess {string}                  visualization.nodes.id                  ID of the node (native or alternative ID)
   * @apiSuccess {number}                  visualization.nodes.nodelink            The node position (in "nodelink" mode)
   * @apiSuccess {number}                  visualization.nodes.nodelink.x          X coordinate of the node
   * @apiSuccess {number}                  visualization.nodes.nodelink.y          Y coordinate of the node
   * @apiSuccess {number}                  visualization.nodes.geo                 The node position (in "geo" mode)
   * @apiSuccess {number}                  [visualization.nodes.geo.latitude]      Latitude of the node (decimal format)
   * @apiSuccess {number}                  [visualization.nodes.geo.longitude]     Longitude of the node (decimal format)
   * @apiSuccess {number}                  visualization.nodes.geo.latitudeDiff    Latitude diff (if the node has been dragged)
   * @apiSuccess {number}                  visualization.nodes.geo.longitudeDiff   Longitude diff (if the node has been dragged)
   * @apiSuccess {boolean}                 visualization.nodes.selected            Whether the node is selected
   * @apiSuccess {object}                  [visualization.nodes.data]              Properties of the node
   * @apiSuccess {string[]}                [visualization.nodes.categories]        Categories of the node
   * @apiSuccess {object}                  [visualization.nodes.statistics]        Statistics of the node
   * @apiSuccess {type:LkDigestItem[]}     [visualization.nodes.statistics.digest] Statistics of the neighborhood of the node
   * @apiSuccess {number}                  [visualization.nodes.statistics.degree] Number of neighbors of the node readable by the current user
   * @apiSuccess {number}                  [visualization.nodes.version]           Version of the node
   * @apiSuccess {object[]}                visualization.edges                     Edges in this visualization
   * @apiSuccess {string}                  visualization.edges.id                  ID of the edge (native or alternative ID)
   * @apiSuccess {boolean}                 visualization.edges.selected            Whether the edge is selected
   * @apiSuccess {string}                  [visualization.edges.type]              Type of the edge
   * @apiSuccess {object}                  [visualization.edges.data]              Properties of the edge
   * @apiSuccess {string}                  [visualization.edges.source]            Source of the edge
   * @apiSuccess {string}                  [visualization.edges.target]            Target of the edge
   * @apiSuccess {number}                  [visualization.edges.version]           Version of the edge
   * @apiSuccess {object}                  visualization.design                    Design
   * @apiSuccess {object}                  visualization.design.styles             Style mappings
   * @apiSuccess {object}                  visualization.design.palette            Color and icon palette
   * @apiSuccess {string="nodelink","geo"} visualization.mode                      The current interaction mode
   * @apiSuccess {object}                  visualization.layout                    The last used layout
   * @apiSuccess {string}                  visualization.layout.algorithm          Layout algorithm name (`"force"`, `"hierarchical"`)
   * @apiSuccess {string}                  visualization.layout.mode               Layout algorithm mode (depends on the algorithm)
   * @apiSuccess {string}                  [visualization.layout.incremental]      Whether the layout is incremental (only for `"force"` algorithm)
   * @apiSuccess {object}                  visualization.geo                       Geographical info
   * @apiSuccess {string}                  [visualization.geo.latitudeProperty]    Property name containing the latitude
   * @apiSuccess {string}                  [visualization.geo.latitudeProperty]    Property name containing the longitude
   * @apiSuccess {string[]}                visualization.geo.layers                Names of enabled leaflet tile layers
   * @apiSuccess {string}                  createdAt                               Creation date in ISO-8601 format
   * @apiSuccess {string}                  updatedAt                               Last update date in ISO-8601 format
   * @apiSuccess {object}                  visualization.alternativeIds            Used to reference nodes or edges by a property instead of their database ID
   * @apiSuccess {string}                  [visualization.alternativeIds.node]     Node property to use as identifier instead of database ID
   * @apiSuccess {string}                  [visualization.alternativeIds.edge]     Edge property to use as identifier instead of database ID
   * @apiSuccess {object[]}                visualization.filters                   Filters
   * @apiSuccess {string="node.data.categories","node.data.properties.propertyName","edge.data.type","edge.data.properties.propertyName","geo-coordinates"} visualization.filters.key Key of the filter
   * @apiSuccess {string[]}                [visualization.filters.values]          Values of the filter (no values for `"geo-coordinates"`)
   * @apiSuccess {string}                  visualization.sourceKey                 Key of the data-source
   * @apiSuccess {object}                  visualization.user                      Owner of the visualization
   * @apiSuccess {number}                  visualization.userId                    ID of the owner of the visualization
   * @apiSuccess {string}                  visualization.widgetKey                 Key of the widget (`null` if the no widget exists)
   * @apiSuccess {boolean}                 visualization.sandbox                   Whether the visualization is the sandbox
   * @apiSuccess {string}                  visualization.right                     Right on the visualization of the current user
   * @apiSuccess {object}                  visualization.nodeFields                        Captions and fields options
   * @apiSuccess {object}                  visualization.nodeFields.captions               Caption descriptions indexed by node category
   * @apiSuccess {object}                  visualization.nodeFields.captions.nodeCategory             `nodeCategory` is a placeholder for the actual node category
   * @apiSuccess {boolean}                 visualization.nodeFields.captions.nodeCategory.active      Whether to use this caption
   * @apiSuccess {boolean}                 visualization.nodeFields.captions.nodeCategory.displayName Whether to include the node category in the caption
   * @apiSuccess {string[]}                visualization.nodeFields.captions.nodeCategory.properties  List of properties to include in the caption
   * @apiSuccess {object[]}                visualization.nodeFields.fields                 Fields listed in context menu
   * @apiSuccess {string}                  visualization.nodeFields.fields.name            Name of the field
   * @apiSuccess {boolean}                 visualization.nodeFields.fields.active          Whether the field is visible in the context menu
   * @apiSuccess {object}                  visualization.edgeFields                        Captions and fields options
   * @apiSuccess {object}                  visualization.edgeFields.captions               Caption descriptions indexed by edge type
   * @apiSuccess {object}                  visualization.edgeFields.captions.edgeType             `edgeType` is a placeholder for the actual edge type
   * @apiSuccess {boolean}                 visualization.edgeFields.captions.edgeType.active      Whether to use this caption
   * @apiSuccess {boolean}                 visualization.edgeFields.captions.edgeType.displayName Whether to include the edge type in the caption
   * @apiSuccess {string[]}                visualization.edgeFields.captions.edgeType.properties  List of properties to include in the caption
   * @apiSuccess {object[]}                visualization.edgeFields.fields                 Fields listed in context menu
   * @apiSuccess {string}                  visualization.edgeFields.fields.name            Name of the field
   * @apiSuccess {boolean}                 visualization.edgeFields.fields.active          Whether the field is visible in the context menu
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "visualization": {
   *       "id": 2,
   *       "version": 2,
   *       "title": "Viz name",
   *       "folder": -1,
   *       "nodes": [
   *         {
   *           "id": 1,
   *           "nodelink": {
   *             "x": 10.124,
   *             "y": 12.505
   *           },
   *           "geo": {
   *             "latitudeDiff": 0,
   *             "longitudeDiff": 0
   *           },
   *           "selected": true,
   *           "data": {
   *             "firstName": "David"
   *           },
   *           "categories": [
   *             "Person"
   *           ],
   *           "statistics": {
   *             "digest": [
   *               {
   *                 "edgeType": "worksAt",
   *                 "nodeCategories": [
   *                   "Company"
   *                 ],
   *                 "nodes": 1,
   *                 "edges": 1
   *               }
   *             ]
   *           },
   *           "version": 1
   *         },
   *         {
   *           "id": 2,
   *           "nodelink": {
   *             "x": -6.552,
   *             "y": -8.094
   *           },
   *           "geo": {
   *             "latitudeDiff": 0,
   *             "longitudeDiff": 0
   *           },
   *           "data": {
   *             "name": "Linkurious"
   *           },
   *           "categories": [
   *             "Company"
   *           ],
   *           "statistics": {
   *             "digest": [
   *               {
   *                 "edgeType": "worksAt",
   *                 "nodeCategories": [
   *                   "Person"
   *                 ],
   *                 "nodes": 1,
   *                 "edges": 1
   *               }
   *             ]
   *           },
   *           "version": 1
   *         }
   *       ],
   *       "edges": [
   *         {
   *           "id": 0,
   *           "type": "worksAt",
   *           "data": {},
   *           "source": 1,
   *           "target": 2,
   *           "version": 1
   *         }
   *       ],
   *       "nodeFields": {
   *         "fields": [
   *           {
   *             "name": "firstName",
   *             "active": true
   *           },
   *           {
   *             "name": "name",
   *             "active": true
   *           }
   *         ],
   *         "captions": {
   *           "Person": {
   *             "active": true,
   *             "displayName": true,
   *             "properties": []
   *           },
   *           "Company": {
   *             "active": true,
   *             "displayName": true,
   *             "properties": []
   *           },
   *           "No category": {
   *             "active": true,
   *             "displayName": true,
   *             "properties": []
   *           }
   *         }
   *       },
   *       "edgeFields": {
   *         "fields": [],
   *         "captions": {
   *           "worksAt": {
   *             "name": "worksAt",
   *             "active": true,
   *             "displayName": true,
   *             "properties": []
   *           }
   *         }
   *       },
   *       "design": {
   *         // ...
   *       },
   *       "filters": [
   *         {
   *           "key": "node.data.properties.firstName",
   *           "values": ["David"]
   *         }
   *       ],
   *       "sourceKey": "860555c4",
   *       "user": {
   *         "id": 1,
   *         "username": "Unique user",
   *         "email": "user@linkurio.us",
   *         "source": "local",
   *         "preferences": {
   *           "pinOnDrag": false,
   *           "locale": "en-US"
   *         }
   *       },
   *       "userId": 1,
   *       "sandbox": false,
   *       "createdAt": "2017-06-01T12:30:40.397Z",
   *       "updatedAt": "2017-06-01T12:30:55.389Z",
   *       "alternativeIds": {},
   *       "mode": "nodelink",
   *       "layout": {
   *         "incremental": false,
   *         "algorithm": "force",
   *         "mode": "fast"
   *       },
   *       "geo": {
   *         "layers": []
   *       },
   *       "right": "owner",
   *       "widgetKey": null
   *     }
   *   }
   */
  app.get('/api/:dataSource/visualizations/:id', api.respond(req => {
    return VisualizationDAO.getById(
      req.param('id'),
      Utils.parseBoolean(req.query.populated),
      Access.getUserCheck(req, 'visualization.read'),
      {
        withDigest: Utils.parseBoolean(req.param('with_digest')),
        withDegree: Utils.parseBoolean(req.param('with_degree'))
      }
    ).then(r => ({visualization: r}));
  }));

  /**
   * @api {post} /api/:dataSource/visualizations Create a visualization
   * @apiName CreateVisualization
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiDescription Create a new visualization.
   * @apiPermission authenticated
   * @apiPermission apiright:visualization.create
   *
   * @apiParam {string} dataSource                Key of the data-source containing the nodes and edges.
   * @apiParam {string} title                     Title of the new visualization.
   * @apiParam {number} [folder=-1]               ID of the folder to save the visualization in. (`-1` for root)
   * @apiParam {object[]} nodes                   Nodes in this visualization.
   * @apiParam {string} nodes.id                  Identifier of the node (native ID or alternative ID, see `alternativeIds`).
   * @apiParam {boolean} [nodes.selected]         Whether the node is selected.
   * @apiParam {object} nodes.nodelink            The node position information (in "nodelink" mode).
   * @apiParam {number} nodes.nodelink.x          X coordinate of the node.
   * @apiParam {number} nodes.nodelink.y          Y coordinate of the node.
   * @apiParam {boolean} [nodes.nodelink.fixed]   Whether the node position has been locked.
   * @apiParam {object} [nodes.geo]               The node position information (in "geo" mode).
   * @apiParam {number} [nodes.geo.latitude]      Latitude of the node (decimal format).
   * @apiParam {number} [nodes.geo.longitude]     Longitude of the node (decimal format).
   * @apiParam {number} [nodes.geo.latitudeDiff]  Latitude diff (if the node has been dragged).
   * @apiParam {number} [nodes.geo.longitudeDiff] Longitude diff (if the node has been dragged).
   * @apiParam {object[]} edges                   Edges in this visualization.
   * @apiParam {string} edges.id                  Identifier of the edge (native ID or alternative ID, see `alternativeIds`).
   * @apiParam {boolean} [edges.selected]         Whether the edge is selected
   * @apiParam {object} [alternativeIds]          If nodes and/or edges should be referenced by a property instead of their database ID.
   * @apiParam {string} [alternativeIds.node]     Node property to use as identifier instead of database ID.
   * @apiParam {string} [alternativeIds.edge]     Edge property to use as identifier instead of database ID.
   * @apiParam {object} [layout]                  The last layout used.
   * @apiParam {string="force","hierarchical"} [layout.algorithm] Layout algorithm.
   * @apiParam {string} [layout.mode]             Layout algorithm mode (depends on algorithm).
   * @apiParam {boolean} [layout.incremental]     Whether the layout is incremental (only for `"force"` algorithm).
   * @apiParam {string="nodelink","geo"} [mode="nodelink"] The current interaction mode.
   * @apiParam {object} [geo]                     Geographical info.
   * @apiParam {string} [geo.latitudeProperty]    Node property containing the latitude info.
   * @apiParam {string} [geo.longitudeProperty]   Node property containing the longitude info.
   * @apiParam {string[]} [geo.layers]            Names of used leaflet tile layers.
   * @apiParam {object} [design]                  Design.
   * @apiParam {object} design.styles             Color, size and icon mapping.
   * @apiParam {object} design.palette            Color and icon palette.
   * @apiParam {object[]} [filters]               Filters.
   * @apiParam {object} nodeFields                Captions and fields options
   * @apiParam {object} nodeFields.captions                 Caption descriptions indexed by node-category.
   * @apiParam {boolean} nodeFields.captions.*.active       Whether to use this caption.
   * @apiParam {boolean} nodeFields.captions.*.displayName  Whether to include the node-category in the caption.
   * @apiParam {string[]} nodeFields.captions.*.properties  List of properties to include in the caption.
   * @apiParam {object[]} nodeFields.fields                 Fields listed in context menu.
   * @apiParam {string} nodeFields.fields.name              Name of the field.
   * @apiParam {boolean} nodeFields.fields.active           Whether the field is visible in the context menu.
   * @apiParam {object} edgeFields                          Captions and fields options
   * @apiParam {object} edgeFields.captions                 Caption descriptions indexed by edge-type.
   * @apiParam {boolean} edgeFields.captions.*.active       Whether to use this caption.
   * @apiParam {boolean} edgeFields.captions.*.displayName  Whether to include the edge-type in the caption.
   * @apiParam {string[]} edgeFields.captions.*.properties  List of properties to include in the caption.
   * @apiParam {object[]} edgeFields.fields                 Fields listed in context menu.
   * @apiParam {string} edgeFields.fields.name              Name of the field.
   * @apiParam {boolean} edgeFields.fields.active           Whether the field is visible in the context menu.
   *
   * @apiSuccess {object}   visualization                         The visualization object.
   * @apiSuccess {string}   visualization.title                   Title of the visualization
   * @apiSuccess {number}   visualization.folder                  Parent visualizationFolder ID (`null` for root folder)
   * @apiSuccess {object[]} visualization.nodes                   Nodes in this visualization.
   * @apiSuccess {string}   visualization.nodes.id                Identifier of the node (native ID or alternative ID, see `alternativeIds`).
   * @apiSuccess {boolean}  visualization.nodes.selected          Whether the node is selected.
   * @apiSuccess {number}   visualization.nodes.nodelink          The node position information (in "nodelink" mode).
   * @apiSuccess {number}   visualization.nodes.nodelink.x        X coordinate of the node.
   * @apiSuccess {number}   visualization.nodes.nodelink.y        Y coordinate of the node.
   * @apiSuccess {boolean}  visualization.nodes.nodelink.fixed    Whether the node position has been locked.
   * @apiSuccess {number}   visualization.nodes.geo               The node position information (in "geo" mode).
   * @apiSuccess {number}   visualization.nodes.geo.latitude      Latitude of the node (decimal format).
   * @apiSuccess {number}   visualization.nodes.geo.longitude     Longitude of the node (decimal format).
   * @apiSuccess {number}   visualization.nodes.geo.latitudeDiff  Latitude diff (if the node has been dragged).
   * @apiSuccess {number}   visualization.nodes.geo.longitudeDiff Longitude diff (if the node has been dragged).
   * @apiSuccess {object[]} visualization.edges                   Edges in this visualization.
   * @apiSuccess {string}   visualization.edges.id                Identifier of the edge (native ID or alternative ID, see `alternativeIds`).
   * @apiSuccess {boolean}  visualization.edges.selected          Whether the edge is selected
   * @apiSuccess {object}   visualization.alternativeIds          Used to reference nodes or edges by a property instead of their database ID.
   * @apiSuccess {string}   visualization.alternativeIds.node     Node property to use as identifier instead of database ID.
   * @apiSuccess {string}   visualization.alternativeIds.edge     Edge property to use as identifier instead of database ID.
   * @apiSuccess {object}   visualization.layout                  The last used layout.
   * @apiSuccess {string}   visualization.layout.algorithm        Layout algorithm name ("force", "hierarchical").
   * @apiSuccess {string}   visualization.layout.mode             Layout algorithm mode (depends on algorithm).
   * @apiSuccess {string}   visualization.layout.incremental      Whether the layout is incremental (only for `"force"` algorithm).
   * @apiSuccess {object}   visualization.geo                     Geographical info.
   * @apiSuccess {string}   visualization.geo.latitudeProperty    Node property containing the latitude.
   * @apiSuccess {string}   visualization.geo.latitudeProperty    Node property containing the longitude.
   * @apiSuccess {string[]} visualization.geo.layers              Names of enabled leaflet tile layers.
   * @apiSuccess {string="nodelink","geo"} visualization.mode     The current interaction mode.
   * @apiSuccess {object}   visualization.design                  Design.
   * @apiSuccess {object}   visualization.design.styles           Style mappings.
   * @apiSuccess {object}   visualization.design.palette          Color and icon palette.
   * @apiSuccess {object[]} visualization.filters                 Filters.
   * @apiSuccess {object}   visualization.nodeFields              Captions and fields options
   * @apiSuccess {object}   visualization.nodeFields.captions     Caption descriptions indexed by node-category.
   * @apiSuccess {boolean}  visualization.nodeFields.captions.*.active      Whether to use this caption.
   * @apiSuccess {boolean}  visualization.nodeFields.captions.*.displayName Whether to include the node-category in the caption.
   * @apiSuccess {string[]} visualization.nodeFields.captions.*.properties  List of properties to include in the caption.
   * @apiSuccess {object[]} visualization.nodeFields.fields       Fields listed in context menu.
   * @apiSuccess {string}   visualization.nodeFields.fields.name   Name of the field.
   * @apiSuccess {boolean}  visualization.nodeFields.fields.active Whether the field is visible in the context menu.
   * @apiSuccess {object}   visualization.edgeFields              Captions and fields options
   * @apiSuccess {object}   visualization.edgeFields.captions     Caption descriptions indexed by edge-type.
   * @apiSuccess {boolean}  visualization.edgeFields.captions.*.active      Whether to use this caption.
   * @apiSuccess {boolean}  visualization.edgeFields.captions.*.displayName Whether to include the edge-type in the caption.
   * @apiSuccess {string[]} visualization.edgeFields.captions.*.properties  List of properties to include in the caption.
   * @apiSuccess {object[]} visualization.edgeFields.fields       Fields listed in context menu.
   * @apiSuccess {string}   visualization.edgeFields.fields.name   Name of the field.
   * @apiSuccess {boolean}  visualization.edgeFields.fields.active Whether the field is visible in the context menu.
   */
  app.post('/api/:dataSource/visualizations', api.respond(req => {
    return VisualizationDAO.createVisualization({
      title: req.param('title'),
      folder: req.param('folder', null),
      nodes: req.param('nodes', []),
      edges: req.param('edges', []),
      nodeFields: req.param('nodeFields'),
      edgeFields: req.param('edgeFields'),
      design: req.param('design', null),
      filters: req.param('filters', []),
      sourceKey: req.param('dataSource'),
      alternativeIds: req.param('alternativeIds', {}),
      mode: req.param('mode', 'nodelink'),
      layout: req.param('layout'),
      geo: req.param('geo')
    }, Access.getUserCheck(req, 'visualization.create')).then(
      r => ({visualization: r})
    );
  }, 201));

  /**
   * @api {post} /api/:dataSource/visualizations/:id/duplicate Duplicate a visualization
   * @apiName DuplicateVisualization
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:visualization.create
   * @apiDescription Duplicates a visualization.
   *
   * @apiParam {String} dataSource key of a data-source
   * @apiParam {number} id The id of the visualization to duplicate
   * @apiParam {string} [title] Name of the created visualization (defaults to "Copy of [source title]").
   * @apiParam {number} [folder] ID of the folder to duplicate the visualization to (defaults to the source visualization's folder).
   */
  app.post('/api/:dataSource/visualizations/:id/duplicate', api.respond(req => {
    return VisualizationDAO.duplicateVisualization(
      {
        id: Utils.tryParsePosInt(req.param('id'), 'id'),
        folderId: Utils.tryParseNumber(req.param('folder'), 'folder', true),
        title: req.param('title')
      },
      Access.getUserCheck(req, 'visualization.create')
    );
  }, 201));

  /**
   * @api {patch} /api/:dataSource/visualizations/:id Update a visualization
   * @apiName UpdateVisualization
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:visualization.edit
   * @apiDescription Update visualization selected by id.
   *
   * @apiParam {string} dataSource key of a data-source (ignored in this API)
   * @apiParam {Number} id Visualization ID.
   * @apiParam {object} visualization The visualization object. Only passed fields will be updated.
   * @apiParam {boolean} [force_lock=false] Take the edit-lock by force
   *                                        (in case the current user doesn't own it)
   * @apiParam {boolean} [do_layout=false] Do a server-side layout of the visualization graph.
   */
  app.patch('/api/:dataSource/visualizations/:id', api.respond(req => {
    return VisualizationDAO.updateVisualization(
      Utils.tryParsePosInt(req.param('id'), 'id'),
      req.param('visualization'),
      {
        forceLock: Utils.parseBoolean(req.param('force_lock')),
        doLayout: Utils.parseBoolean(req.param('do_layout'))
      },
      Access.getUserCheck(req, 'visualization.edit')
    ).return(undefined);
  }, 204));

  /**
   * @api {delete} /api/:dataSource/visualizations/:id Delete a visualization
   * @apiName DeleteVisualization
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:visualization.delete
   * @apiDescription Delete the visualization selected by id.
   *
   * @apiParam {string}  dataSource Key of the data-source
   * @apiParam {number}  id         ID of the visualization
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 204 No Content
   */
  app.delete('/api/:dataSource/visualizations/:id', api.respond(req => {
    return VisualizationDAO.removeById(
      req.param('id'),
      Access.getUserCheck(req, 'visualization.delete')
    );
  }, 204));

  /**
   * @api {put} /api/:dataSource/visualizations/:id/share/:userId Share a visualization
   * @apiName setVisualizationShare
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:visualizationShare.create
   * @apiDescription Set the share right of a user on a visualization
   *
   * @apiParam {string} dataSource key of a data-source
   * @apiParam {number} userId id of a user User to grant access to
   * @apiParam {string="read","write"} right Granted access level
   * @apiParam {number} id a visualization id Visualization to grant access to
   *
   * @apiSuccess {number} visualizationId ID of the shared visualization.
   * @apiSuccess {number} userId ID of the user the visualization has been shared with.
   * @apiSuccess {string} right Name of the right (`"none"`, `"read"`, `"write"` or `"owner"`)
   * @apiSuccess {string} createdAt Date the visualization has been shared.
   * @apiSuccess {string} updatedAt Date at which the share has been updated.
   */
  app.put('/api/:dataSource/visualizations/:id/share/:userId', api.respond(req => {
    if (!VisualizationShareDAO) { return Promise.resolve(); }
    return VisualizationShareDAO.shareWithUser(
      req.param('id'),
      req.param('userId'),
      req.param('right'),
      Access.getUserCheck(req, 'visualizationShare.create')
    );
  }));

  /**
   * @api {get} /api/:dataSource/visualizations/:id/shares Get visualization share rights
   * @apiName visualizationShares
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:visualizationShare.read
   * @apiDescription Get all share rights on a visualization
   *
   * @apiParam {string} dataSource key of a data-source
   * @apiParam {number} id a visualization id
   *
   * @apiSuccess {Object}   res                        result object
   * @apiSuccess {Object}   res.owner                  Owner of the shares
   * @apiSuccess {number}   res.owner.id               Owner's user id
   * @apiSuccess {boolean}  res.owner.source           Owner's source ('local', 'ldap', 'azure', etc.)
   * @apiSuccess {string}   res.owner.username         Owner's username
   * @apiSuccess {string}   res.owner.email            Owner's email
   * @apiSuccess {Object[]} res.shares                 Description of all shares defined by owner
   * @apiSuccess {number}   res.shares.userId          ID of the target user of this share
   * @apiSuccess {string}   res.shares.username        Username of the target user of this share
   * @apiSuccess {string}   res.shares.email           Email of the target user of this share
   * @apiSuccess {number}   res.shares.visualizationId ID of the shared visualization
   * @apiSuccess {string}   res.shares.right           type of right granted to target user
   *                                                   (`"read"`, `"write"` or `"owner"`)
   */
  app.get('/api/:dataSource/visualizations/:id/shares', api.respond(req => {
    if (!VisualizationShareDAO) { return Promise.resolve(); }
    Access.getUserCheck(req, 'visualizationShare.read');
    return VisualizationShareDAO.getShares(req.param('id'));
  }));

  /**
   * @api {delete} /api/:dataSource/visualizations/:id/share/:userId Un-share a visualization
   * @apiName deleteVisualizationShare
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:visualizationShare.delete
   * @apiDescription Remove a share right of a user on a visualization
   *
   * @apiParam {string} dataSource key of a data-source
   * @apiParam {number} userId id of a user
   */
  app.delete('/api/:dataSource/visualizations/:id/share/:userId', api.respond(req => {
    if (!VisualizationShareDAO) { return Promise.resolve(); }
    return VisualizationShareDAO.unshare(
      req.param('id'),
      req.param('userId'),
      Access.getUserCheck(req, 'visualizationShare.delete')
    );
  }, 204));

  // sandbox routes

  /**
   * @api {get} /api/:dataSource/sandbox Get the visualization sandbox
   * @apiName getSandbox
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission __guest
   * @apiPermission apiright:sandbox
   *
   * @apiDescription Return the visualization sandbox of the current user for a given data-source
   *
   * @apiExample {curl} Populate examples:
   *   # Visualization by ID
   *   curl -i "http://localhost:3000/api/e4b5d8/sandbox?populate=visualizationId&item_id=123"
   *
   *   # Node by ID
   *   curl -i "http://localhost:3000/api/e4b5d8/sandbox?populate=nodeId&item_id=123"
   *
   *   # Edge by ID
   *   curl -i "http://localhost:3000/api/e4b5d8/sandbox?populate=edgeId&item_id=456"
   *
   *   # Node by ID + neighbors
   *   curl -i "http://localhost:3000/api/e4b5d8/sandbox?populate=expandNodeId&item_id=123"
   *
   *   # Nodes by search query
   *   curl -i "http://localhost:3000/api/e4b5d8/sandbox?populate=searchNodes&search_query=paris&search_fuzziness=0.8"
   *
   *   # Edges by search query
   *   curl -i "http://localhost:3000/api/e4b5d8/sandbox?populate=searchEdges&search_query=has_city"
   *
   *   # Nodes and/or edges by pattern query
   *   curl -i "http://localhost:3000/api/e4b5d8/sandbox?populate=pattern&pattern_dialect=cypher&pattern_query=MATCH+(n1)-%5Be%5D-(n2)+WHERE+ID(n1)%3D10+RETURN+e"
   *
   * @apiParam {string} dataSource key of a data-source
   * @apiParam {string="visualizationId","expandNodeId","nodeId","edgeId","searchNodes","searchEdges","pattern","matchId"} [populate] Describes how the sandbox should be populated.
   * @apiParam {string} [item_id] ID of the node, edge or visualization to load (when `populate` is one of  `["visualizationId", "nodeId", "edgeId", "expandNodeId"]`).
   * @apiParam {number} [match_id] ID of alert match to load (when `populate` is `"matchId"`).
   * @apiParam {string} [search_query] Search query to search for nodes or edges (when `populate` is one of  `["searchNodes", "searchEdges"]`).
   * @apiParam {number{0-1}} [search_fuzziness=0.9] Search query fuzziness (when `populate` is one of  `["searchNodes", "searchEdges"]`).
   * @apiParam {string} [pattern_query] Pattern query to match nodes and/or edges (when `populate` is `"pattern"`).
   * @apiParam {boolean} [do_layout] Whether to do a server-side layout of the graph.
   * @apiParam {string="cypher","gremlin"} [pattern_dialect] Pattern dialect (when `populate` is `"pattern"`).
   * @apiParam {boolean} [with_digest=false] Whether to include the adjacency digest in the returned nodes
   * @apiParam {boolean} [with_degree=false] Whether to include the degree in the returned nodes
   */
  app.get('/api/:dataSource/sandbox', api.respond(r => {
    return VisualizationDAO.getSandBox({
      sourceKey: r.param('dataSource'),
      populate: r.param('populate'),
      itemId: r.param('item_id'),
      matchId: Utils.tryParsePosInt(r.param('match_id'), 'match_id', true),
      searchQuery: r.param('search_query'),
      searchFuzziness: Utils.tryParseNumber(r.param('search_fuzziness'), 'search_fuzziness', true),
      patternQuery: r.param('pattern_query'),
      patternDialect: r.param('pattern_dialect'),
      doLayout: Utils.parseBoolean(r.param('do_layout')),
      withDigest: Utils.parseBoolean(r.param('with_digest')),
      withDegree: Utils.parseBoolean(r.param('with_degree'))
    }, Access.getUserCheck(r, 'sandbox', true)
    ).then(
      r => ({visualization: r})
    );
  }));

  /**
   * @api {patch} /api/:dataSource/sandbox Update the visualization sandbox
   * @apiName updateSandbox
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:sandbox
   *
   * @apiDescription Update the sandbox of the current user for a given data-source.
   *
   * @apiParam {string} dataSource key of a data-source (ignored in this API)
   * @apiParam {object} visualization The sandbox visualization object.
   * @apiParam {object} [visualization.design]
   * @apiParam {object} [visualization.nodeFields]
   * @apiParam {object} [visualization.edgeFields]
   */
  app.patch('/api/:dataSource/sandbox', api.respond(req => {
    return VisualizationDAO.updateSandBox(
      req.param('dataSource'),
      req.param('visualization'),
      Access.getUserCheck(req, 'sandbox')
    ).then(
      r => ({visualization: r})
    );
  }, 204));

  // widget routes

  app.all('/api/widget*', api.proxy(() => {
    if (LKE.isEnterprise()) {
      return Promise.resolve();
    }

    // this is a 'business' API not found, it will not log internally
    return Errors.business('api_not_found', null, true);
  }));

  /**
   * @api {post} /api/widget Create a widget
   * @apiName createVisualizationWidget
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:widget.create
   *
   * @apiDescription Create a widget for a visualization.
   *
   * @apiParam {number} visualization_id The visualization id
   * @apiParam {object} [options] The configuration of the user interface elements.
   * @apiParam {boolean} [options.search=false] Whether the search bar is shown.
   * @apiParam {boolean} [options.share=false] The the share button is shown.
   * @apiParam {boolean} [options.layout=false] Whether the layout button is shown.
   * @apiParam {boolean} [options.fullscreen=false] Whether the full-screen button is shown.
   * @apiParam {boolean} [options.zoom=false] Whether to zoom-in and zoom-out controllers are shown.
   * @apiParam {boolean} [options.legend=false] Whether the graph legend is shown.
   * @apiParam {boolean} [options.geo=false] Whether the geo-mode toggle button is visible. Ignored if the nodes don't have geo coordinates.
   * @apiParam {string} [options.password] Optional password to protect the widget
   *
   * @apiSuccess {string} key The key of the created widget
   */
  app.post('/api/widget', api.respond(req => {
    const options = req.param('options', {});
    return WidgetDAO.createWidget(
      Utils.tryParsePosInt(req.param('visualization_id'), 'visualization_id'),
      options,
      false,
      Access.getUserCheck(req, 'widget.create')
    );
  }));

  /**
   * @api {put} /api/widget Update a widget
   * @apiName updateVisualizationWidget
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:widget.edit
   *
   * @apiDescription Update a widget for a visualization.
   *
   * @apiParam {number} visualization_id The visualization id
   * @apiParam {object} [options] The configuration of the user interface elements.
   * @apiParam {boolean} [options.search=false] Whether the search bar is shown.
   * @apiParam {boolean} [options.share=false] The the share button is shown.
   * @apiParam {boolean} [options.layout=false] Whether the layout button is shown.
   * @apiParam {boolean} [options.fullscreen=false] Whether the full-screen button is shown.
   * @apiParam {boolean} [options.zoom=false] Whether to zoom-in and zoom-out controllers are shown.
   * @apiParam {boolean} [options.legend=false] Whether the graph legend is shown.
   * @apiParam {boolean} [options.geo=false] Whether the geo-mode toggle button is visible. Ignored if the nodes don't have geo coordinates.
   * @apiParam {string} [options.password] Optional password to protect the widget
   *
   * @apiSuccess {string} key The key of the updated widget
   */
  app.put('/api/widget', api.respond(req => {
    return WidgetDAO.createWidget(
      Utils.tryParsePosInt(req.param('visualization_id'), 'visualization_id'),
      req.param('options', {}),
      true,
      Access.getUserCheck(req, 'widget.edit')
    );
  }));

  /**
   * @api {delete} /api/widget/:key Delete a widget
   * @apiName deleteVisualizationWidget
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:widget.delete
   *
   * @apiDescription Delete a widget for a visualization.
   *
   * @apiParam {string} key the key of the widget to delete
   */
  app.delete('/api/widget/:key', api.respond(req => {
    return WidgetDAO.deleteByKey(
      req.param('key'),
      Access.getUserCheck(req, 'widget.delete')
    );
  }, 204));

  /**
   * @api {get} /api/widget/:key Get a widget
   * @apiName getWidgetByKey
   * @apiGroup Visualizations
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:widget.read
   *
   * @apiDescription Get a visualization widget's data by key
   *
   * @apiParam {string} key the key of a widget
   *
   * @apiSuccess {string} title the title of the visualization used to generate this widget
   * @apiSuccess {string} key the key of this widget
   * @apiSuccess {number} userId the owner ID of the visualization used to generate this widget
   * @apiSuccess {number} visualizationId the ID of the visualization used to generate this widget
   * @apiSuccess {boolean} password Whether password protection is enabled
   * @apiSuccess {Object} content the content of the widget, as sent while generating this widget
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *
   *   {
   *     "title": "Foo Bar",
   *     "key": "key",
   *     "userId": 12,
   *     "password": false,
   *     "visualizationId": 3,
   *     "content": {
   *        "key": "value"
   *     }
   *   }
   */
  app.get('/api/widget/:key', api.respond(req => {
    Access.getUserCheck(req, 'widget.read');
    return WidgetDAO.getByKey(req.param('key'));
  }));
};
