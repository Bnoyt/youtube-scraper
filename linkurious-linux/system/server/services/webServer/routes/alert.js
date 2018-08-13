/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-05-11.
 */
'use strict';

// external libs
const Promise = require('bluebird');

// services
const LKE = require('../../index');
const AlertManager = LKE.getAlert();
const Utils = LKE.getUtils();
const Access = LKE.getAccess();
const Errors = LKE.getErrors();

// locals
const api = require('../api');

module.exports = function(app) {

  app.all('/api/:dataSource/alerts*', api.proxy(req => {
    if (!LKE.isEnterprise()) {
      return Errors.business(
        'not_implemented', 'Alerts are not available in Linkurious Starter edition.', true
      );
    }
    return Access.isAuthenticated(req);
  }));

  /**
   * @apiDefine ReturnGetAlertUser
   *
   * @apiSuccess (Success 200) {number} id        ID of the alert
   * @apiSuccess (Success 200) {string} title     Title of the alert
   * @apiSuccess (Success 200) {string} sourceKey Key of the data-source
   * @apiSuccess (Success 200) {object[]} columns Columns among the returned values of the query to save in a match as scalar values
   * @apiSuccess (Success 200) {string="number","string"} columns.type        Type of the column
   * @apiSuccess (Success 200) {string}                   columns.columnName  Name of the column in the query
   * @apiSuccess (Success 200) {string}                   columns.columnTitle Name of the column for the UI
   * @apiSuccess (Success 200) {string} createdAt Creation date in ISO-8601 format
   * @apiSuccess (Success 200) {string} updatedAt Last update date in ISO-8601 format
   * @apiSuccess (Success 200) {string} lastRun   Last time the query was executed in ISO-8601 format (`null` it was never executed)
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "id": 7,
   *     "title": "alert title",
   *     "sourceKey": "584f2569",
   *     "columns": [
   *       {"type": "number", "columnName": "n1.score", "columnTitle": "Score"}
   *     ],
   *     "createdAt": "2016-05-16T08:23:35.730Z",
   *     "updatedAt": "2016-05-16T08:23:35.730Z",
   *     "lastRun": "2016-05-16T08:23:35.730Z"
   *   }
   */

  /**
   * @apiDefine ReturnGetAlertsArrayUser
   *
   * @apiSuccess (Success 200) {object[]} alerts           Alerts
   * @apiSuccess (Success 200) {number}   alerts.id        ID of the alert
   * @apiSuccess (Success 200) {string}   alerts.title     Title of the alert
   * @apiSuccess (Success 200) {boolean}  alerts.enabled   Whether the query will run periodically or not
   * @apiSuccess (Success 200) {object[]} alerts.columns   Columns among the returned values of the query to save in a match as scalar values
   * @apiSuccess (Success 200) {string="number","string"} alerts.columns.type        Type of the column
   * @apiSuccess (Success 200) {string}                   alerts.columns.columnName  Name of the column in the query
   * @apiSuccess (Success 200) {string}                   alerts.columns.columnTitle Name of the column for the UI
   * @apiSuccess (Success 200) {string}   alerts.sourceKey Key of the data-source
   * @apiSuccess (Success 200) {string}   alerts.createdAt Creation date in ISO-8601 format
   * @apiSuccess (Success 200) {string}   alerts.updatedAt Last update date in ISO-8601 format
   * @apiSuccess (Success 200) {string}   alerts.lastRun   Last time the query was executed in ISO-8601 format (`null` it was never executed)
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   [
   *     {
   *       "id": 9,
   *       "title": "alert title 2",
   *       "enabled": true,
   *       "sourceKey": "584f2569",
   *       "columns": [
   *         {"type": "number", "columnName": "n1.score", "columnTitle": "Score"}
   *       ],
   *       "createdAt": "2016-05-16T08:23:35.730Z",
   *       "updatedAt": "2016-05-16T08:23:35.730Z",
   *       "lastRun": "2016-05-16T08:23:35.730Z"
   *     },
   *     {
   *       "id": 8,
   *       "title": "alert title 1",
   *       "enabled": true,
   *       "sourceKey": "584f2569",
   *       "columns": [
   *         {"type": "number", "columnName": "n1.score", "columnTitle": "Score"}
   *       ],
   *       "createdAt": "2016-04-16T08:23:35.730Z",
   *       "updatedAt": "2016-04-16T08:23:35.730Z",
   *       "lastRun": "2016-05-16T08:23:35.730Z"
   *     }
   *   ]
   */

  /**
   * @apiDefine ReturnGetMatch
   *
   * @apiSuccess (Success 200) {number}    id               ID of the match
   * @apiSuccess (Success 200) {string}    sourceKey        Key of the data-source
   * @apiSuccess (Success 200) {number}    alertId          ID of the alert
   * @apiSuccess (Success 200) {string}    hash             Hash of the match
   * @apiSuccess (Success 200) {string="unconfirmed","confirmed","dismissed"} status Status of the match
   * @apiSuccess (Success 200) {object}    user             Last user that changed the status (`null` if it was never changed)
   * @apiSuccess (Success 200) {number}    user.id          ID of the user
   * @apiSuccess (Success 200) {string}    user.username    Username of the user
   * @apiSuccess (Success 200) {string}    user.email       E-mail of the user
   * @apiSuccess (Success 200) {object[]}  viewers          Users that viewed the match (ordered by date in decreasing order)
   * @apiSuccess (Success 200) {number}    viewers.id       ID of the user
   * @apiSuccess (Success 200) {string}    viewers.username Username of the user
   * @apiSuccess (Success 200) {string}    viewers.email    E-mail of the user
   * @apiSuccess (Success 200) {string}    viewers.date     Date of the view in ISO-8601 format
   * @apiSuccess (Success 200) {type:id[]} nodes            IDs of the nodes of the match
   * @apiSuccess (Success 200) {type:id[]} edges            IDs of the edges of the match
   * @apiSuccess (Success 200) {string}    columns          Scalar value for a given column by index defined in the alert
   * @apiSuccess (Success 200) {string}    expirationDate   Date in ISO-8601 format after which the match is deleted
   * @apiSuccess (Success 200) {string}    createdAt        Creation date in ISO-8601 format
   * @apiSuccess (Success 200) {string}    updatedAt        Last update date in ISO-8601 format
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "id": 1,
   *     "sourceKey": "584f2569",
   *     "alertId": 2,
   *     "hash": "897f54ff366922a4077c78955c77bcdd",
   *     "status": "unconfirmed",
   *     "user": null,
   *     "viewers": [],
   *     "nodes": [5971, 5974],
   *     "edges": [523],
   *     "columns": [
   *       1999
   *     ],
   *     "expirationDate": "2016-05-26T08:23:35.730Z",
   *     "createdAt": "2016-05-16T08:23:35.730Z",
   *     "updatedAt": "2016-05-16T08:23:35.730Z"
   *   }
   */

  /**
   * @apiDefine ReturnGetMatchesArray
   *
   * @apiSuccess (Success 200) {object}    counts                   Match counts
   * @apiSuccess (Success 200) {number}    counts.unconfirmed       Count of unconfirmed matches
   * @apiSuccess (Success 200) {number}    counts.confirmed         Count of confirmed matches
   * @apiSuccess (Success 200) {number}    counts.dismissed         Count of dismissed matches
   * @apiSuccess (Success 200) {object[]}  matches                  Matches
   * @apiSuccess (Success 200) {number}    matches.id               ID of the match
   * @apiSuccess (Success 200) {string}    matches.sourceKey        Key of the data-source
   * @apiSuccess (Success 200) {number}    matches.alertId          ID of the alert
   * @apiSuccess (Success 200) {string}    matches.hash             Hash of the match
   * @apiSuccess (Success 200) {string="unconfirmed","confirmed",dismissed"} matches.status Status of the match
   * @apiSuccess (Success 200) {object}    matches.user             Last user that changed the status (`null` if it was never changed)
   * @apiSuccess (Success 200) {number}    matches.user.id          ID of the user
   * @apiSuccess (Success 200) {string}    matches.user.username    Username of the user
   * @apiSuccess (Success 200) {string}    matches.user.email       E-mail of the user
   * @apiSuccess (Success 200) {object[]}  matches.viewers          Users that viewed the match (ordered by date in decreasing order)
   * @apiSuccess (Success 200) {number}    matches.viewers.id       ID of the user
   * @apiSuccess (Success 200) {string}    matches.viewers.username Username of the user
   * @apiSuccess (Success 200) {string}    matches.viewers.email    E-mail of the user
   * @apiSuccess (Success 200) {string}    matches.viewers.date     Date of the view in ISO-8601 format
   * @apiSuccess (Success 200) {type:id[]} matches.nodes            IDs of the nodes of the match
   * @apiSuccess (Success 200) {type:id[]} matches.edges            IDs of the edges of the match
   * @apiSuccess (Success 200) {string}    matches.columns          Scalar value for a given column by index defined in the alert
   * @apiSuccess (Success 200) {string}    matches.expirationDate   Date in ISO-8601 format after which the match is deleted
   * @apiSuccess (Success 200) {string}    matches.createdAt        Creation date in ISO-8601 format
   * @apiSuccess (Success 200) {string}    matches.updatedAt        Last update date in ISO-8601 format
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "counts": {
   *       "unconfirmed": 1,
   *       "confirmed": 1,
   *       "dismissed": 0
   *     },
   *     "matches": [
   *       {
   *         "id": 1,
   *         "sourceKey": "584f2569",
   *         "alertId": 2,
   *         "hash": "897f54ff366922a4077c78955c77bcdd",
   *         "status": "confirmed",
   *         "user": {
   *           "id": 1,
   *           "username": "alice",
   *           "email": "alice@example.com"
   *         },
   *         "viewers": [
   *           {
   *             "id": 1,
   *             "username": "alice",
   *             "email": "alice@example.com",
   *             "date": "2016-05-16T08:13:35.030Z"
   *           }
   *         ],
   *         "nodes": [5971],
   *         "edges": [],
   *         "columns": [
   *           1999
   *         ],
   *         "expirationDate": "2016-05-26T08:23:35.730Z",
   *         "createdAt": "2016-05-16T08:23:35.730Z",
   *         "updatedAt": "2016-05-16T08:23:35.730Z"
   *       },
   *       {
   *         "id": 2,
   *         "sourceKey": "584f2569",
   *         "alertId": 2,
   *         "hash": "5f221db1e438f2d9b7cdd284364e379b",
   *         "status": "unconfirmed",
   *         "user": null,
   *         "viewers": [],
   *         "nodes": [5976],
   *         "edges": [],
   *         "columns": [
   *           1998
   *         ],
   *         "expirationDate": "2016-05-26T08:23:35.730Z",
   *         "createdAt": "2016-05-16T08:23:35.730Z",
   *         "updatedAt": "2016-05-16T08:23:35.730Z"
   *       }
   *     ]
   *   }
   */

  /**
   * @api {get} /api/:dataSource/alerts Get all the alerts (User)
   * @apiName GetAlertsForUsers
   * @apiGroup Alerts
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:alert.read
   *
   * @apiDescription Get all the alerts of a given data-source ordered by creation date.
   * The fields are filtered to be viewed by a simple user.
   *
   * @apiParam {string} dataSource Key of the data-source
   *
   * @apiUse ReturnGetAlertsArrayUser
   */
  app.get('/api/:dataSource/alerts', api.respond(req => {
    return AlertManager.getAlerts(
      req.param('dataSource'),
      false,
      Access.getUserCheck(req, 'alert.read')
    );
  }, 200));

  /**
   * @api {get} /api/:dataSource/alerts/:alertId Get an alert (User)
   * @apiName GetAlertForUsers
   * @apiGroup Alerts
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:alert.read
   *
   * @apiDescription Get the alert selected by id. The fields are filtered to be viewed by a simple
   * user.
   *
   * @apiParam {string} dataSource Key of the data-source
   * @apiParam {number} alertId    ID of the alert
   *
   * @apiUse ReturnGetAlertUser
   */
  app.get('/api/:dataSource/alerts/:alertId', api.respond(req => {
    return AlertManager.getAlert(
      req.param('dataSource'),
      Utils.tryParsePosInt(req.param('alertId'), 'alertId'),
      false,
      Access.getUserCheck(req, 'alert.read')
    );
  }, 200));

  /**
   * @api {get} /api/:dataSource/alerts/:alertId/matches Get all the matches of an alert
   * @apiName GetMatches
   * @apiGroup Alerts
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:alert.read
   *
   * @apiDescription Get all the matches of an alert.
   *
   * @apiParam {string} dataSource                           Key of the data-source
   * @apiParam {number} alertId                              ID the alert
   * @apiParam {string} [offset=0]                           Offset from the first result
   * @apiParam {string} [limit=20]                           Page size (maximum number of returned matches)
   * @apiParam {string="asc","desc"} [sort_direction="desc"] Direction used to sort
   * @apiParam {string="date","0","1","2","3","4"} [sort_by="date"] Sort by date or a given column
   * @apiParam {string="unconfirmed","confirmed","dismissed"} [status] Filter on match status
   *
   * @apiUse ReturnGetMatchesArray
   */
  app.get('/api/:dataSource/alerts/:alertId/matches', api.respond(req => {
    const alertId = Utils.tryParsePosInt(req.param('alertId'), 'alertId');
    const user = Access.getUserCheck(req, 'alert.read');

    return Promise.props({
      counts: AlertManager.getMatchCount(req.param('dataSource'), alertId, user),
      matches: AlertManager.getMatches(
        req.param('dataSource'),
        alertId,
        {
          sortDirection: req.param('sort_direction'),
          sortBy: req.param('sort_by'),
          offset: Utils.tryParsePosInt(req.param('offset'), 'offset', true),
          limit: Utils.tryParsePosInt(req.param('limit'), 'limit', true),
          status: req.param('status')
        },
        user
      )
    });
  }, 200));

  /**
   * @api {get} /api/:dataSource/alerts/:alertId/matches/:matchId Get a match
   * @apiName GetMatch
   * @apiGroup Alerts
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:alert.read
   *
   * @apiDescription Get the match selected by id.
   *
   * @apiParam {string} dataSource Key of the data-source
   * @apiParam {number} alertId    ID of the alert
   * @apiParam {number} matchId    ID of the match
   *
   * @apiUse ReturnGetMatch
   */
  app.get('/api/:dataSource/alerts/:alertId/matches/:matchId', api.respond(req => {
    return AlertManager.getMatch(
      Utils.tryParsePosInt(req.param('matchId'), 'matchId'),
      Access.getUserCheck(req, 'alert.read'),
      req.param('dataSource'),
      Utils.tryParsePosInt(req.param('alertId'), 'alertId', true)
    );
  }, 200));

  /**
   * @api {post} /api/:dataSource/alerts/:alertId/matches/:matchId/action Do an action on a match
   * @apiName DoMatchAction
   * @apiGroup Alerts
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:alert.doAction
   *
   * @apiDescription Do an action (open, dismiss, confirm, unconfirm) on a match.
   *
   * @apiParam {string} dataSource Key of the data-source
   * @apiParam {number} alertId    ID of the alert
   * @apiParam {number} matchId    ID of the match
   * @apiParam (body) {string="confirm","dismiss","unconfirm","open"} action The action to perform
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 204 No Content
   */
  app.post('/api/:dataSource/alerts/:alertId/matches/:matchId/action', api.respond(req => {
    return AlertManager.doMatchAction(
      req.param('dataSource'),
      Utils.tryParsePosInt(req.param('alertId'), 'alertId'),
      Utils.tryParsePosInt(req.param('matchId'), 'matchId'),
      req.param('action'),
      Access.getUserCheck(req, 'alert.doAction')
    );
  }, 204));

  /**
   * @api {get} /api/:dataSource/alerts/:alertId/matches/:matchId/actions Get all the actions of a match
   *
   * @apiName GetMatchActions
   * @apiGroup Alerts
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission apiright:alert.read
   *
   * @apiDescription Get all the actions of a match ordered by creation date.
   *
   * @apiParam {string} dataSource Key of the data-source
   * @apiParam {number} alertId    ID of the alert
   * @apiParam {number} matchId    ID of the match
   *
   * @apiSuccess (Success 200) {object[]} matchActions               Actions
   * @apiSuccess (Success 200) {number}   matchActions.id            ID of the action
   * @apiSuccess (Success 200) {number}   matchActions.matchId       ID of the match
   * @apiSuccess (Success 200) {object}   matchActions.user          User that did the action
   * @apiSuccess (Success 200) {number}   matchActions.user.id       ID of the user
   * @apiSuccess (Success 200) {string}   matchActions.user.username Username of the user
   * @apiSuccess (Success 200) {string}   matchActions.user.email    E-mail of the user
   * @apiSuccess (Success 200) {string="open","confirm","dismiss","unconfirm"} matchActions.action The action performed
   * @apiSuccess (Success 200) {string}   matchActions.createdAt     Creation date in ISO-8601 format
   * @apiSuccess (Success 200) {string}   matchActions.updatedAt     Last update date in ISO-8601 format
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   [
   *     {
   *       "id": 9,
   *       "matchId": 3,
   *       "user": {
   *         "id": 1,
   *         "username": "alice",
   *         "email": "alice@example.com"
   *       },
   *       "action": "dismiss",
   *       "createdAt": "2016-06-16T08:22:35.730Z",
   *       "updatedAt": "2016-06-16T08:22:35.730Z"
   *     },
   *     {
   *       "id": 8,
   *       "matchId": 4,
   *       "user": {
   *         "id": 2,
   *         "username": "bob",
   *         "email": "bob@example.com"
   *       },
   *       "action": "open",
   *       "createdAt": "2016-05-16T08:23:35.730Z",
   *       "updatedAt": "2016-05-16T08:23:35.730Z"
   *     }
   *   ]
   */
  app.get('/api/:dataSource/alerts/:alertId/matches/:matchId/actions', api.respond(req => {
    return AlertManager.getMatchActions(
      req.param('dataSource'),
      Utils.tryParsePosInt(req.param('alertId'), 'alertId'),
      Utils.tryParsePosInt(req.param('matchId'), 'matchId'),
      {
        offset: Utils.tryParsePosInt(req.param('offset'), 'offset', true),
        limit: Utils.tryParsePosInt(req.param('limit'), 'limit', true)
      },
      Access.getUserCheck(req, 'alert.read')
    );
  }, 200));
};
