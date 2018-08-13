/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-11-04.
 */
'use strict';

// services
const LKE = require('../../../../services');
const Access = LKE.getAccess();
const Application = LKE.getApplication();
const Utils = LKE.getUtils();

// locals
const api = require('../../api');

/**
 * @apiDefine ReturnApplication
 *
 * @apiSuccess {number}       id        ID of the application
 * @apiSuccess {string}       name      Name of the application
 * @apiSuccess {string}       apiKey    Generated key (32 hexadecimal characters)
 * @apiSuccess {boolean}      enabled   Whether the application is enabled
 * @apiSuccess {string[]}     rights    Enabled actions for the application
 * @apiSuccess {type:group[]} groups    Groups the application can act on behalf of
 * @apiSuccess {string[]}     createdAt Creation date in ISO-8601 format
 * @apiSuccess {string[]}     updatedAt Last update date in ISO-8601 format
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 200 OK
 *   {
 *     "id": 1,
 *     "enabled": true,
 *     "apiKey": "76554081e5b0a2d7852deec4990ebc58",
 *     "name": "test_app",
 *     "rights": [
 *       "visualization.create",
 *       "visualization.edit",
 *       "visualization.read",
 *       "visualization.delete"
 *     ],
 *     "groups": [
 *       {
 *         "id": 3,
 *         "name": "read and edit",
 *         "builtin": true,
 *         "sourceKey": "584f2569"
 *       }
 *     ],
 *     "createdAt": "2017-01-24T11:16:03.445Z",
 *     "updatedAt": "2017-01-24T11:16:03.445Z"
 *   }
 */

/**
 * @apiDefine ReturnApplications
 *
 * @apiSuccess {object[]}     applications           Applications
 * @apiSuccess {number}       applications.id        ID of the application
 * @apiSuccess {string}       applications.name      Name of the application
 * @apiSuccess {string}       applications.apiKey    Generated key (32 hexadecimal characters)
 * @apiSuccess {boolean}      applications.enabled   Whether the application is enabled
 * @apiSuccess {string[]}     applications.rights    Enabled actions for the application
 * @apiSuccess {type:group[]} applications.groups    Groups the application can act on behalf of
 * @apiSuccess {string[]}     applications.createdAt Creation date in ISO-8601 format
 * @apiSuccess {string[]}     applications.updatedAt Last update date in ISO-8601 format
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 200 OK
 *   [
 *     {
 *       "id": 1,
 *       "enabled": true,
 *       "apiKey": "e3fadcbd39ddb21fe8ecb206dadff36d",
 *       "name": "test_app",
 *       "rights": [
 *         "visualization.create",
 *         "visualization.edit",
 *         "visualization.read",
 *         "visualization.delete"
 *       ],
 *       "groups": [
 *         {
 *           "id": 3,
 *           "name": "read and edit",
 *           "builtin": true,
 *           "sourceKey": "584f2569"
 *         }
 *       ],
 *       "createdAt": "2017-01-24T11:14:51.337Z",
 *       "updatedAt": "2017-01-24T11:31:13.769Z"
 *     },
 *     {
 *       "id": 2,
 *       "enabled": true,
 *       "apiKey": "738c9f3b66aad7218c69843a78905ccd",
 *       "name": "test_app_2",
 *       "rights": [
 *         "visualization.read"
 *       ],
 *       "groups": [
 *         {
 *           "id": 2,
 *           "name": "read",
 *           "builtin": true,
 *           "sourceKey": "584f2569"
 *         }
 *       ],
 *       "createdAt": "2017-01-24T11:16:02.417Z",
 *       "updatedAt": "2017-01-24T11:16:02.417Z"
 *     }
 *   ]
 */

module.exports = function(app) {

  app.all('/api/admin/applications*', api.proxy(req => Access.hasAction(req, 'admin.app')));

  // ------------------------------------------------------------------------------------------
  //                                        Applications
  // ------------------------------------------------------------------------------------------

  /**
   * @api {get} /api/admin/applications Get all the applications
   * @apiName GetApplications
   * @apiGroup Applications
   * @apiPermission action:admin.app
   * @apiVersion 1.0.0
   *
   * @apiDescription Get all the API applications.
   *
   * @apiUse ReturnApplications
   */
  app.get('/api/admin/applications', api.respond(() => {
    return Application.getApplications();
  }));

  /**
   * @api {post} /api/admin/applications Create an application
   * @apiName CreateApplication
   * @apiGroup Applications
   * @apiPermission action:admin.app
   * @apiVersion 1.0.0
   *
   * @apiDescription Add a new API application.
   *
   * @apiParam {string}   name           Name of the application
   * @apiParam {boolean}  [enabled=true] Whether the application is enabled
   * @apiParam {number[]} groups         IDs of the groups the application can act on behalf of
   * @apiParam {string[]="visualization.read", "visualization.create", "visualization.edit", "visualization.delete", "visualization.list", "visualizationFolder.create", "visualizationFolder.edit", "visualizationFolder.delete", "visualizationShare.read", "visualizationShare.create", "visualizationShare.delete", "sandbox", "widget.read", "widget.create", "widget.edit", "widget.delete", "graphItem.read", "graphItem.create", "graphItem.edit", "graphItem.delete", "graphItem.search", "savedGraphQuery.read", "savedGraphQuery.create", "savedGraphQuery.edit", "savedGraphQuery.delete", "graph.rawRead", "graph.rawWrite", "graph.shortestPath", "alert.read", "alert.doAction", "schema"} rights Enabled actions for the application
   *
   * @apiUse ReturnApplication
   */
  app.post('/api/admin/applications', api.respond(req => {
    return Application.createApplication({
      name: req.body.name,
      enabled: req.body.enabled,
      groups: req.body.groups,
      rights: req.body.rights
    });
  }, 201));

  /**
   * @api {patch} /api/admin/applications/:id Update an application
   * @apiName UpdateApplication
   * @apiGroup Applications
   * @apiPermission action:admin.app
   * @apiVersion 1.0.0
   *
   * @apiDescription Update an API application.
   *
   * @apiParam {string}   [name]         Name of the application
   * @apiParam {boolean}  [enabled=true] Whether the application is enabled
   * @apiParam {number[]} [groups]       IDs of the groups the application can act on behalf of
   * @apiParam {string[]="visualization.read", "visualization.create", "visualization.edit", "visualization.delete", "visualization.list", "visualizationFolder.create", "visualizationFolder.edit", "visualizationFolder.delete", "visualizationShare.read", "visualizationShare.create", "visualizationShare.delete", "sandbox", "widget.read", "widget.create", "widget.edit", "widget.delete", "graphItem.read", "graphItem.create", "graphItem.edit", "graphItem.delete", "graphItem.search", "savedGraphQuery.read", "savedGraphQuery.create", "savedGraphQuery.edit", "savedGraphQuery.delete", "graph.rawRead", "graph.rawWrite", "graph.shortestPath", "alert.read", "alert.doAction", "schema"} [rights] Enabled actions for the application
   *
   * @apiUse ReturnApplication
   */
  app.patch('/api/admin/applications/:id', api.respond(req => {
    return Application.updateApplication({
      id: Utils.tryParsePosInt(req.params.id, 'id'),
      name: req.body.name,
      enabled: req.body.enabled,
      groups: req.body.groups,
      rights: req.body.rights
    });
  }, 200));
};
