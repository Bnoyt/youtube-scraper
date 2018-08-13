/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 */
'use strict';

// external libs
const Promise = require('bluebird');

// services
const LKE = require('../../../../services');
const Access = LKE.getAccess();
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const GroupDAO = LKE.getGroupDAO();
const UserDAO = LKE.getUserDAO();
const AccessRightDAO = LKE.getAccessRightDAO();

// locals
const api = require('../../api');

/**
 * @apiDefine authenticated Any authenticated user can use this API.
 */

/**
 * @apiDefine __guest The guest user can use this API if guest mode is allowed.
 */

/**
 * @typedef {object} group Group
 * @property {number}  group.id        ID of the group
 * @property {string}  group.sourceKey Key of the data-source of the group
 * @property {string}  group.name      Name of the group
 * @property {boolean} group.builtin   Whether the group was created internally by Linkurious
 */

/**
 * @typedef {object} preferences Preferences of the user
 * @property {boolean} preferences.pinOnDrag            Whether to pin nodes automatically when they are moved manually
 * @property {string}  preferences.locale               Language and region identifier of the user (e.g. 'fr_BE' for 'French language in Belgium')
 * @property {boolean} preferences.uiWorkspaceSearch    Whether to enable search in the workspace
 * @property {boolean} preferences.uiExport             Whether to show the export tool in menus
 * @property {boolean} preferences.uiDesign             Whether to show the design panel at all
 * @property {boolean} preferences.uiLayout             Whether to show the layout button/menu at all
 * @property {boolean} preferences.uiEdgeSearch         Whether to show edge search tool in the 'find' bar
 * @property {boolean} preferences.uiTooltip            Whether to show node/edge tooltips in their context menu
 * @property {boolean} preferences.uiShortestPath       Whether to show the shortest-path tool in the 'find' bar
 * @property {boolean} preferences.uiCollapseNode       Whether to show the 'collapse' button in the toolbar
 * @property {boolean} preferences.uiScreenshot         Whether to show the screenshot tool in menus
 * @property {boolean} preferences.uiCaptionConfig      Whether to show the caption config tab in the design panel
 * @property {boolean} preferences.uiTooltipConfig      Whether to show the tooltip config tab in the design panel
 * @property {boolean} preferences.uiVisualizationPanel Whether to show the visualization panel (visualization name, selection, actions)
 * @property {boolean} preferences.uiNodeList           Whether to show the nodes list (bottom left)
 * @property {boolean} preferences.uiEdgeList           Whether to show the edges list (bottom left)
 * @property {boolean} preferences.uiSimpleLayout       Whether to show a layout button instead of the full layout menu
 */

module.exports = function(app) {

  app.all('/api/admin/users*', api.proxy(req => {
    // the user needs the action admin.users on any data-source
    return Access.canManageUsers(req);
  }));

  app.all('/api/admin/groups*', api.proxy(req => {
    return Access.canManageUsers(req);
  }));

  app.all('/api/admin/:dataSource/groups*', api.proxy(req => {
    // the user needs the action admin.users on `dataSource`
    return Access.canManageUsers(req, req.param('dataSource'));
  }));

  // ------------------------------------------------------------------------------------------
  //                                           Users
  // ------------------------------------------------------------------------------------------

  /** @apiDefine ReturnUser
   *
   * @apiSuccess {number}           id           ID of the user
   * @apiSuccess {string}           username     Username of the user
   * @apiSuccess {string}           email        E-mail of the user
   * @apiSuccess {string}           source       Source of the user (`"local"`, `"ldap"`, `"oauth2"`, etc.)
   * @apiSuccess {type:group[]}     groups       Groups the user belongs to
   * @apiSuccess {type:preferences} preferences  Preferences of the user
   * @apiSuccess {object}           actions      Arrays of authorized actions indexed by data-source key.
   *                                             The special key `"*"` lists actions authorized on all the data-sources
   * @apiSuccess {object}           accessRights Arrays of authorized node categories and edge types indexed by data-source key, by type and by right.
   *                                             The special key `"*"` lists access rights authorized on all the data-sources
   * @apiSuccess {string}           createdAt    Creation date in ISO-8601 format
   * @apiSuccess {string}           updatedAt    Last update date in ISO-8601 format
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "id": 1,
   *     "username": "Unique user",
   *     "email": "user@linkurio.us",
   *     "source": "local",
   *     "groups": [
   *       {
   *         "id": 1,
   *         "name": "admin",
   *         "builtin": true,
   *         "sourceKey": "*"
   *       }
   *     ],
   *     "preferences": {
   *       "pinOnDrag": false,
   *       "locale": "en-US"
   *     },
   *     "actions": {
   *       "*": [
   *         "admin.users",
   *         "admin.alerts",
   *         "admin.connect",
   *         "admin.index",
   *         "admin.app",
   *         "admin.report",
   *         "admin.users.delete",
   *         "admin.config",
   *         "rawReadQuery",
   *         "rawWriteQuery"
   *       ]
   *     },
   *     "accessRights": {
   *       "*": {
   *         "nodes": {
   *           "edit": [],
   *           "write": ["*"]
   *         },
   *         "edges": {
   *           "edit": [],
   *           "write": ["*"]
   *         },
   *         "alerts": {
   *           "read": ["*"]
   *         }
   *       }
   *     },
   *     "createdAt": "2016-05-16T08:23:35.730Z",
   *     "updatedAt": "2016-05-16T08:23:45.730Z"
   *   }
   */

  /** @apiDefine ReturnUserOnCreate
   *
   * @apiSuccess(Success 201) {number}           id           ID of the user
   * @apiSuccess(Success 201) {string}           username     Username of the user
   * @apiSuccess(Success 201) {string}           email        E-mail of the user
   * @apiSuccess(Success 201) {string}           source       Source of the user (`"local"`, `"ldap"`, `"oauth2"`, etc.)
   * @apiSuccess(Success 201) {type:group[]}     groups       Groups the user belongs to
   * @apiSuccess(Success 201) {type:preferences} preferences  Preferences of the user
   * @apiSuccess(Success 201) {object}           actions      Arrays of authorized actions indexed by data-source key.
   *                                                          The special key `"*"` lists actions authorized on all the data-sources
   * @apiSuccess(Success 201) {object}           accessRights Arrays of authorized node categories and edge types indexed by data-source key, by type and by right.
   *                                                          The special key `"*"` lists access rights authorized on all the data-sources
   * @apiSuccess(Success 201) {string}           createdAt    Creation date in ISO-8601 format
   * @apiSuccess(Success 201) {string}           updatedAt    Last update date in ISO-8601 format
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 201 Created
   *   {
   *     "id": 2,
   *     "username": "newUser",
   *     "email": "new@linkurio.us",
   *     "source": "local",
   *     "groups": [
   *       {
   *         "id": 2,
   *         "name": "source manager",
   *         "builtin": true,
   *         "sourceKey": "584f2569"
   *       }
   *     ],
   *     "preferences": {
   *       "pinOnDrag": false,
   *       "locale": "en-US"
   *     },
   *     "actions": {
   *       "*": [],
   *       "584f2569": [
   *         "admin.users",
   *         "admin.alerts",
   *         "admin.connect",
   *         "admin.index",
   *         "rawReadQuery",
   *         "rawWriteQuery"
   *       ]
   *     },
   *     "accessRights": {
   *       "*": {
   *         "nodes": {
   *           "edit": [],
   *           "write": []
   *         },
   *         "edges": {
   *           "edit": [],
   *           "write": []
   *         },
   *         "alerts": {
   *           "read": []
   *         }
   *       },
   *       "584f2569": {
   *         "nodes": {
   *           "edit": [],
   *           "write": ["*"]
   *         },
   *         "edges": {
   *           "edit": [],
   *           "write": ["*"]
   *         },
   *         "alerts": {
   *           "read": ["*"]
   *         }
   *       }
   *     },
   *     "createdAt": "2016-05-16T08:23:35.730Z",
   *     "updatedAt": "2016-05-16T08:23:35.730Z"
   *   }
   */

  /**
   * @api {get} /api/admin/users/:id Get a user
   * @apiName GetUser
   * @apiGroup Users
   * @apiVersion 1.0.0
   * @apiPermission action:admin.users
   *
   * @apiDescription Get a user by id.
   *
   * @apiParam {number} id ID of the user
   *
   * @apiUse ReturnUser
   */
  app.get('/api/admin/users/:id', api.respond(req => {
    return UserDAO.getUser(
      Utils.tryParsePosInt(req.param('id'), 'id')
    );
  }));

  /**
   * @api {post} /api/admin/users Create a user
   * @apiName CreateUser
   * @apiGroup Users
   * @apiPermission action:admin.users
   * @apiVersion 1.0.0
   *
   * @apiDescription Add a new user.
   *
   * @apiParam {string}   username Username of the user
   * @apiParam {string}   email    E-mail of the user
   * @apiParam {string}   password Password of the user
   * @apiParam {number[]} [groups] IDs of the groups the user belong to
   *
   * @apiUse ReturnUserOnCreate
   */
  app.post('/api/admin/users', api.respond(req => {
    return UserDAO.createUser(
      req.param('username'),
      req.param('email'),
      req.param('password'),
      req.param('groups'),
      'local',
      Access.getUserCheck(req)
    );
  }, 201));

  /**
   * @api {patch} /api/admin/users/:id Update a user
   * @apiName UpdateUser
   * @apiGroup Users
   * @apiPermission action:admin.users
   * @apiVersion 1.0.0
   *
   * @apiDescription Update a user.
   *
   * @apiParam {number}           id              ID of the user
   * @apiParam {string}           [username]      New username of the user
   * @apiParam {string}           [email]         New e-mail of the user
   * @apiParam {string}           [password]      New password of the user
   * @apiParam {type:preferences} [preferences]   New preferences of the user
   * @apiParam {number[]}         [addedGroups]   IDs of the groups to add to the user
   * @apiParam {number[]}         [removedGroups] IDs of the groups to remove from the user
   *
   * @apiUse ReturnUser
   */
  app.patch('/api/admin/users/:id', api.respond(req => {
    return UserDAO.updateUser(
      Utils.tryParsePosInt(req.param('id'), 'id'),
      {
        username: req.param('username'),
        password: req.param('password'),
        email: req.param('email'),
        preferences: req.param('preferences'),
        addedGroups: req.param('addedGroups'),
        removedGroups: req.param('removedGroups')
      },
      Access.getUserCheck(req)
    );
  }));

  /**
   * @api {delete} /api/admin/users/:id Delete a user
   * @apiName DeleteUser
   * @apiGroup Users
   * @apiPermission action:admin.users.delete
   * @apiVersion 1.0.0
   *
   * @apiDescription Delete a user.
   *
   * @apiParam {number} id ID of the user
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 204 No Content
   */
  app.delete('/api/admin/users/:id', api.respond(req => {
    return Access.hasAction(req, 'admin.users.delete').then(() => {
      return UserDAO.deleteUser(
        Utils.tryParsePosInt(req.param('id'), 'id'),
        Access.getUserCheck(req)
      );
    });
  }, 204));

  // ------------------------------------------------------------------------------------------
  //                                           Groups
  // ------------------------------------------------------------------------------------------

  /**
   * @apiDefine ReturnGroup
   *
   * @apiSuccess {number}   id           ID of the group
   * @apiSuccess {string}   name         Name of the group
   * @apiSuccess {boolean}  builtin      Whether the group was created internally by Linkurious
   * @apiSuccess {string}   sourceKey    Key of the data-source
   * @apiSuccess {number}   userCount    Number of users in the group
   * @apiSuccess {string}   createdAt    Creation date in ISO-8601 format
   * @apiSuccess {string}   updatedAt    Last update date in ISO-8601 format
   * @apiSuccess {object[]} accessRights List of access rights
   * @apiSuccess {string="read","write","edit","do","none"}          accessRights.type       Type of the right
   * @apiSuccess {string="nodeCategory","edgeType","alert","action"} accessRights.targetType Type of the target
   * @apiSuccess {string}                                            accessRights.targetName Name of the target (node category, edge label, alert id or action name)
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "id": 30,
   *     "name": "customGroup",
   *     "builtin": false,
   *     "sourceKey": "584f2569",
   *     "userCount": 2,
   *     "createdAt": "2016-05-16T08:23:35.730Z",
   *     "updatedAt": "2016-05-16T08:23:35.730Z",
   *     "accessRights": [
   *       {
   *         "type": "edit",
   *         "targetType": "nodeCategory",
   *         "targetName": "Movie"
   *       },
   *       {
   *         "type": "read",
   *         "targetType": "nodeCategory",
   *         "targetName": "Person"
   *       },
   *       {
   *         "type": "read",
   *         "targetType": "edgeType",
   *         "targetName": "ACTED_IN"
   *       },
   *       {
   *         "type": "do",
   *         "targetType": "actions",
   *         "targetName": "admin.connect"
   *       }
   *     ]
   *   }
   */

  /**
   * @apiDefine ReturnGroupOnCreate
   *
   * @apiSuccess(Success 201) {number}   id           ID of the group
   * @apiSuccess(Success 201) {string}   name         Name of the group
   * @apiSuccess(Success 201) {boolean}  builtin      Whether the group was created internally by Linkurious
   * @apiSuccess(Success 201) {string}   sourceKey    Key of the data-source
   * @apiSuccess(Success 201) {number}   userCount    Number of users in the group
   * @apiSuccess(Success 201) {string}   createdAt    Creation date in ISO-8601 format
   * @apiSuccess(Success 201) {string}   updatedAt    Last update date in ISO-8601 format
   * @apiSuccess(Success 201) {object[]} accessRights List of access rights
   * @apiSuccess(Success 201) {string="read","write","edit","do","none"}          accessRights.type       Type of the right
   * @apiSuccess(Success 201) {string="nodeCategory","edgeType","alert","action"} accessRights.targetType Type of the target
   * @apiSuccess(Success 201) {string}                                            accessRights.targetName Name of the target (node category, edge label, alert id or action name)
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 201 Created
   *   {
   *     "id": 31,
   *     "name": "newGroup",
   *     "builtin": false,
   *     "sourceKey": "584f2569",
   *     "userCount": 0,
   *     "createdAt": "2016-05-16T08:23:35.730Z",
   *     "updatedAt": "2016-05-16T08:23:35.730Z",
   *     "accessRights": [
   *       {
   *         "type": "none",
   *         "targetType": "nodeCategory",
   *         "targetName": "Movie"
   *       },
   *       {
   *         "type": "none",
   *         "targetType": "nodeCategory",
   *         "targetName": "Person"
   *       },
   *       {
   *         "type": "none",
   *         "targetType": "edgeType",
   *         "targetName": "ACTED_IN"
   *       }
   *     ]
   *   }
   */

  /**
   * @api {get} /api/admin/:dataSource/groups/:id Get a group
   * @apiName GetGroup
   * @apiGroup Users
   * @apiPermission action:admin.users
   * @apiVersion 1.0.0
   *
   * @apiDescription Get a group.
   *
   * @apiParam {string} dataSource Key of the data-source
   * @apiParam {number} id         ID of the group
   *
   * @apiUse ReturnGroup
   */
  app.get('/api/admin/:dataSource/groups/:id', api.respond(req => {
    return GroupDAO.getGroup(
      Utils.tryParsePosInt(req.param('id'), 'id'),
      req.param('dataSource')
    );
  }));

  /**
   * @api {get} /api/admin/:dataSource/groups Get all groups
   * @apiName GetGroups
   * @apiGroup Users
   * @apiPermission action:admin.users
   * @apiVersion 1.0.0
   *
   * @apiDescription Get all the groups within a data-source.
   *
   * @apiParam {string}    dataSource           Key of the data-source
   * @apiParam {boolean}   [with_access_rights] Whether to include the access rights
   *
   * @apiSuccess {object[]} groups           List of groups
   * @apiSuccess {number}   groups.id        ID of the group
   * @apiSuccess {string}   groups.name      Name of the group
   * @apiSuccess {boolean}  groups.builtin   Whether the group was created internally by Linkurious
   * @apiSuccess {string}   groups.sourceKey Key of the data-source
   * @apiSuccess {number}   groups.userCount Number of users in the group
   * @apiSuccess {string}   groups.createdAt Creation date in ISO-8601 format
   * @apiSuccess {string}   groups.updatedAt Last update date in ISO-8601 format
   * @apiSuccess {object[]} [groups.accessRights] List of access rights
   * @apiSuccess {string="read","write","edit","do","none"}          groups.accessRights.type       Type of the right
   * @apiSuccess {string="nodeCategory","edgeType","alert","action"} groups.accessRights.targetType Type of the target
   * @apiSuccess {string}                                            groups.accessRights.targetName Name of the target (node category, edge label, alert id or action name)
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   [
   *     {
   *       "id": 1,
   *       "name": "admin",
   *       "builtin": true,
   *       "sourceKey": "*",
   *       "userCount": 1,
   *       "createdAt": "2016-05-16T08:23:35.730Z",
   *       "updatedAt": "2016-05-16T08:23:35.730Z"
   *     },
   *     {
   *       "id": 2,
   *       "name": "read",
   *       "builtin": true,
   *       "sourceKey": "584f2569",
   *       "userCount": 1,
   *       "createdAt": "2016-05-16T08:23:35.730Z",
   *       "updatedAt": "2016-05-16T08:23:35.730Z"
   *     },
   *     {
   *       "id": 3,
   *       "name": "read and edit",
   *       "builtin": true,
   *       "sourceKey": "584f2569",
   *       "userCount": 0,
   *       "createdAt": "2016-05-16T08:23:35.730Z",
   *       "updatedAt": "2016-05-16T08:23:35.730Z"
   *     },
   *     {
   *       "id": 4,
   *       "name": "read, edit and delete",
   *       "builtin": true,
   *       "sourceKey": "584f2569",
   *       "userCount": 0,
   *       "createdAt": "2016-05-16T08:23:35.730Z",
   *       "updatedAt": "2016-05-16T08:23:35.730Z"
   *     },
   *     {
   *       "id": 5,
   *       "name": "source manager",
   *       "builtin": true,
   *       "sourceKey": "584f2569",
   *       "userCount": 0,
   *       "createdAt": "2016-05-16T08:23:35.730Z",
   *       "updatedAt": "2016-05-16T08:23:35.730Z"
   *     },
   *     {
   *       "id": 6,
   *       "name": "custom group",
   *       "builtin": false,
   *       "sourceKey": "584f2569",
   *       "userCount": 0,
   *       "createdAt": "2016-05-16T08:23:35.730Z",
   *       "updatedAt": "2016-05-16T08:23:35.730Z"
   *     }
   *   ]
   */
  app.get('/api/admin/:dataSource/groups', api.respond(req => {
    return GroupDAO.getGroups(
      req.param('dataSource'),
      Utils.parseBoolean(req.param('with_access_rights'))
    );
  }));

  /**
   * @api {post} /api/admin/:dataSource/groups Create a group
   * @apiName CreateGroup
   * @apiGroup Users
   * @apiPermission action:admin.users
   * @apiVersion 1.0.0
   *
   * @apiDescription Add a new group.
   *
   * @apiParam {string} dataSource Key of the data-source
   * @apiParam {string} name       Name of the group
   *
   * @apiUse ReturnGroupOnCreate
   */
  app.post('/api/admin/:dataSource/groups', api.respond(req => {
    return GroupDAO.createGroup(
      req.param('name'),
      req.param('dataSource')
    );
  }, 201));

  /**
   * @api {patch} /api/admin/:dataSource/groups/:id Rename a group
   * @apiName RenameGroup
   * @apiGroup Users
   * @apiPermission action:admin.users
   * @apiVersion 1.0.0
   *
   * @apiDescription Rename a group.
   *
   * @apiParam {string} dataSource Key of the data-source
   * @apiParam {number} id         ID of the group
   * @apiParam {string} name       Name of the group
   *
   * @apiUse ReturnGroup
   */
  app.patch('/api/admin/:dataSource/groups/:id', api.respond(req => {
    return GroupDAO.renameGroup(
      Utils.tryParsePosInt(req.param('id'), 'id'),
      req.param('dataSource'),
      req.param('name')
    );
  }));

  /**
   * @api {delete} /api/admin/:dataSource/groups/:id Delete a group
   * @apiName DeleteGroup
   * @apiGroup Users
   * @apiPermission action:admin.users
   * @apiVersion 1.0.0
   *
   * @apiDescription Delete a group.
   *
   * @apiParam {string} dataSource Key of the data-source
   * @apiParam {number} id         ID of the group
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 204 No Content
   */
  app.delete('/api/admin/:dataSource/groups/:id', api.respond(req => {
    return GroupDAO.deleteGroup(
      Utils.tryParsePosInt(req.param('id'), 'id'),
      req.param('dataSource')
    );
  }, 204));

  // ------------------------------------------------------------------------------------------
  //                                      Access Rights
  // ------------------------------------------------------------------------------------------

  /**
   * @api {get} /api/admin/groups/rights_info Get all access rights options
   * @apiName GetAccessRightsInfo
   * @apiGroup Users
   * @apiPermission action:admin.users
   * @apiVersion 1.0.0
   *
   * @apiDescription Get all the possible access rights options: `types`, `targetTypes` and
   * `actions`.
   *
   * @apiSuccess {string[]} types               All the possible right types
   * @apiSuccess {string[]} targetTypes         All the possible target types
   * @apiSuccess {object[]} actions             All the possible actions
   * @apiSuccess {string}   actions.key         Key of the action
   * @apiSuccess {string}   actions.description Description of the action
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "types": ["read", "edit", "write", "do", "none"],
   *     "targetTypes": ["nodeCategory", "edgeType", "action", "alert"],
   *     "actions": ["admin.connect", "admin.index", "admin.users", "admin.alerts", "rawReadQuery", "rawWriteQuery"]
   *   }
   */
  app.get('/api/admin/groups/rights_info', api.respond(() => {
    if (!LKE.isEnterprise()) {
      return Errors.business('not_implemented', undefined, true);
    }

    return Promise.resolve({
      types: AccessRightDAO.listRightTypes(),
      targetTypes: AccessRightDAO.listTargetTypes(),
      actions: AccessRightDAO.listActions()
    });
  }));

  /**
   * @api {put} /api/admin/:dataSource/groups/:id/access_rights Set access rights
   * @apiName PutAccessRights
   * @apiGroup Users
   * @apiPermission action:admin.users
   * @apiVersion 1.0.0
   *
   * @apiDescription Set access rights on a group. Use `"[no_category]"` as `targetName` to set the
   * access right for nodes with no categories.
   *
   * @apiParam {string}   dataSource              Key of of the data-source
   * @apiParam {number}   groupId                 ID of the group
   * @apiParam {object[]} accessRights            List of access rights
   * @apiParam {string="read","write","edit","do","none"}          accessRights.type       Type of the right
   * @apiParam {string="nodeCategory","edgeType","alert","action"} accessRights.targetType Type of the target
   * @apiParam {string}                                            accessRights.targetName Name of the target (node category, edge label, alert id or action name)
   * @apiParam {boolean}  [validateAgainstSchema] Whether the access rights will be checked to be of node categories or edge types in the schema
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 204 No Content
   */
  app.put('/api/admin/:dataSource/groups/:groupId/access_rights', api.respond(req => {
    return GroupDAO.setRightsOnGroup(
      Utils.tryParsePosInt(req.param('groupId'), 'groupId'),
      req.param('dataSource'),
      req.param('accessRights'),
      req.param('validateAgainstSchema')
    );
  }, 204));

  /**
   * @api {delete} /api/admin/:dataSource/groups/:id/access_rights Delete access right
   * @apiName DeleteAccessRight
   * @apiGroup Users
   * @apiPermission action:admin.users
   * @apiVersion 1.0.0
   *
   * @apiDescription Delete an access right from a group.
   *
   * @apiParam {string} dataSource Key of of the data-source
   * @apiParam {number} groupId    ID of the group
   * @apiParam {string="nodeCategory","edgeType","alert","action"} targetType Type of the target
   * @apiParam {string}                                            targetName Name of the target (node category, edge label, alert id or action name)
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 204 No Content
   */
  app.delete('/api/admin/:dataSource/groups/:groupId/access_rights', api.respond(req => {
    return GroupDAO.deleteRightOnGroup(
      Utils.tryParsePosInt(req.param('groupId'), 'groupId'),
      req.param('dataSource'),
      req.param('targetType'),
      req.param('targetName')
    );
  }, 204));
};
