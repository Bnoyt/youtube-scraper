/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-05-11.
 */
'use strict';

// services
const LKE = require('../../../index');
const AlertManager = LKE.getAlert();
const Utils = LKE.getUtils();
const Access = LKE.getAccess();
const Errors = LKE.getErrors();

// locals
const api = require('../../api');

module.exports = function(app) {

  app.all('/api/admin/:dataSource/alerts*', api.proxy(req => {
    if (!LKE.isEnterprise()) {
      return Errors.business(
        'not_implemented', 'Alerts are not available in Linkurious Starter edition.', true
      );
    }
    return Access.hasAction(req, 'admin.alerts', req.param('dataSource'));
  }));

  /**
   * @apiDefine ReturnCreateAlert
   *
   * @apiSuccess (Success 201) {number}   id                     ID of the alert
   * @apiSuccess (Success 201) {string}   title                  Title of the alert
   * @apiSuccess (Success 201) {string}   sourceKey              Key of the data-source
   * @apiSuccess (Success 201) {string}   query                  Graph query that will run periodically
   * @apiSuccess (Success 201) {string}   dialect                Dialect of the graph query
   * @apiSuccess (Success 201) {boolean}  enabled                Whether the query will run periodically or not
   * @apiSuccess (Success 201) {object[]} columns                Columns among the returned values of the query to save in a match as scalar values
   * @apiSuccess (Success 201) {string="number","string"} columns.type        Type of the column
   * @apiSuccess (Success 201) {string}                   columns.columnName  Name of the column in the query
   * @apiSuccess (Success 201) {string}                   columns.columnTitle Name of the column for the UI
   * @apiSuccess (Success 201) {string}   cron                   CRON expression representing the frequency with which the query runs
   * @apiSuccess (Success 201) {number}   matchTTL               Number of days after which the matches of this alert are going to be deleted
   * @apiSuccess (Success 201) {number}   maxMatches             Maximum number of matches after which matches with lower scores are discarded
   * @apiSuccess (Success 201) {number}   userId                 ID of the user that created the alert
   * @apiSuccess (Success 201) {string}   lastRun                Last time the query was executed in ISO-8601 format (`null` it was never executed)
   * @apiSuccess (Success 201) {object}   lastRunProblem         Object representing the problem in the last run (`null` if there wasn't a problem in the last run)
   * @apiSuccess (Success 201) {string}   lastRunProblem.error   Error that identifies the last run problem
   * @apiSuccess (Success 201) {boolean}  lastRunProblem.partial Whether the last run was at least partially executed
   * @apiSuccess (Success 201) {string}   createdAt              Creation date in ISO-8601 format
   * @apiSuccess (Success 201) {string}   updatedAt              Last update date in ISO-8601 format
   * @apiSuccess (Success 201) {string}   nextRun                Date when the alert will be executed next in ISO-8601 format (`null` if it isn't scheduled)
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 201 OK
   *   {
   *     "id": 8,
   *     "title": "alert_title",
   *     "sourceKey": "584f2569",
   *     "query": "MATCH (n1)-[r:DIRECTED]-(n2) RETURN n1, n1.score",
   *     "dialect": "cypher",
   *     "enabled": true,
   *     "columns": [
   *       {"type": "number", "columnName": "n1.score", "columnTitle": "Score"}
   *     ],
   *     "cron": "0 0 * * *",
   *     "matchTTL": 30,
   *     "maxMatches": 20,
   *     "userId": 1,
   *     "lastRun": null,
   *     "lastRunProblem": null,
   *     "updatedAt": "2016-05-16T08:23:35.730Z",
   *     "createdAt": "2016-05-16T08:23:35.730Z",
   *     "nextRun": "2016-08-15T00:00:00.000Z"
   *   }
   */

  /**
   * @apiDefine ReturnGetAlert
   *
   * @apiSuccess (Success 200) {number}   id                     ID of the alert
   * @apiSuccess (Success 200) {string}   title                  Title of the alert
   * @apiSuccess (Success 200) {string}   sourceKey              Key of the data-source
   * @apiSuccess (Success 200) {string}   query                  Graph query that will run periodically
   * @apiSuccess (Success 200) {string}   dialect                Dialect of the graph query
   * @apiSuccess (Success 200) {boolean}  enabled                Whether the query will run periodically or not
   * @apiSuccess (Success 200) {object[]} columns                Columns among the returned values of the query to save in a match as scalar values
   * @apiSuccess (Success 200) {string="number","string"} columns.type        Type of the column
   * @apiSuccess (Success 200) {string}                   columns.columnName  Name of the column in the query
   * @apiSuccess (Success 200) {string}                   columns.columnTitle Name of the column for the UI
   * @apiSuccess (Success 200) {string}   cron                   CRON expression representing the frequency with which the query runs
   * @apiSuccess (Success 200) {number}   matchTTL               Number of days after which the matches of this alert are going to be deleted
   * @apiSuccess (Success 200) {number}   maxMatches             Maximum number of matches after which matches with lower scores are discarded
   * @apiSuccess (Success 200) {number}   userId                 ID of the user that created the alert
   * @apiSuccess (Success 200) {string}   lastRun                Last time the query was executed in ISO-8601 format (`null` it was never executed)
   * @apiSuccess (Success 200) {object}   lastRunProblem         Object representing the problem in the last run (`null` if there wasn't a problem in the last run)
   * @apiSuccess (Success 200) {string}   lastRunProblem.error   Error that identifies the last run problem
   * @apiSuccess (Success 200) {boolean}  lastRunProblem.partial Whether the last run was at least partially executed
   * @apiSuccess (Success 200) {string}   createdAt              Creation date in ISO-8601 format
   * @apiSuccess (Success 200) {string}   updatedAt              Last update date in ISO-8601 format
   * @apiSuccess (Success 200) {string}   nextRun                Date when the alert will be executed next in ISO-8601 format (`null` if it isn't scheduled)
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "id": 8,
   *     "title": "alert_title",
   *     "sourceKey": "584f2569",
   *     "query": "MATCH (n1)-[r:DIRECTED]-(n2) RETURN n1, n1.score",
   *     "dialect": "cypher",
   *     "enabled": true,
   *     "columns": [
   *       {"type": "number", "columnName": "n1.score", "columnTitle": "Score"}
   *     ],
   *     "cron": "0 0 * * *",
   *     "matchTTL": 30,
   *     "maxMatches": 20,
   *     "userId": 1,
   *     "lastRun": null,
   *     "lastRunProblem": null,
   *     "updatedAt": "2016-05-16T08:23:35.730Z",
   *     "createdAt": "2016-05-16T08:23:35.730Z",
   *     "nextRun": "2016-08-15T00:00:00.000Z"
   *   }
   */

  /**
   * @apiDefine ReturnGetAlertsArray
   *
   * @apiSuccess (Success 200) {object[]} alerts                        Alerts
   * @apiSuccess (Success 200) {number}   alerts.id                     ID of the alert
   * @apiSuccess (Success 200) {string}   alerts.title                  Title of the alert
   * @apiSuccess (Success 200) {string}   alerts.sourceKey              Key of the data-source
   * @apiSuccess (Success 200) {string}   alerts.query                  Graph query that will run periodically
   * @apiSuccess (Success 200) {string}   alerts.dialect                Dialect of the graph query
   * @apiSuccess (Success 200) {boolean}  alerts.enabled                Whether the query will run periodically or not
   * @apiSuccess (Success 200) {object[]} alerts.columns                Columns among the returned values of the query to save in a match as scalar values
   * @apiSuccess (Success 200) {string="number","string"} alerts.columns.type        Type of the column
   * @apiSuccess (Success 200) {string}                   alerts.columns.columnName  Name of the column in the query
   * @apiSuccess (Success 200) {string}                   alerts.columns.columnTitle Name of the column for the UI
   * @apiSuccess (Success 200) {string}   alerts.cron                   CRON expression representing the frequency with which the query runs
   * @apiSuccess (Success 200) {number}   alerts.matchTTL               Number of days after which the matches of this alert are going to be deleted
   * @apiSuccess (Success 200) {number}   alerts.maxMatches             Maximum number of matches after which matches with lower scores are discarded
   * @apiSuccess (Success 200) {number}   alerts.userId                 ID of the user that created the alert
   * @apiSuccess (Success 200) {string}   alerts.lastRun                Last time the query was executed in ISO-8601 format (`null` it was never executed)
   * @apiSuccess (Success 200) {object}   alerts.lastRunProblem         Object representing the problem in the last run (`null` if there wasn't a problem in the last run)
   * @apiSuccess (Success 200) {string}   alerts.lastRunProblem.error   Error that identifies the last run problem
   * @apiSuccess (Success 200) {boolean}  alerts.lastRunProblem.partial Whether the last run was at least partially executed
   * @apiSuccess (Success 200) {string}   alerts.createdAt              Creation date in ISO-8601 format
   * @apiSuccess (Success 200) {string}   alerts.updatedAt              Last update date in ISO-8601 format
   * @apiSuccess (Success 200) {string}   alerts.nextRun                Date when the alert will be executed next in ISO-8601 format (`null` if it isn't scheduled)
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   [
   *     {
   *       "id": 9,
   *       "title": "alert title 2",
   *       "sourceKey": "584f2569",
   *       "query": "MATCH (n1)-[r:DIRECTED]-(n2) RETURN n2, n2.score",
   *       "dialect": "cypher",
   *       "enabled": true,
   *       "columns": [
   *         {"type": "number", "columnName": "n2.score", "columnTitle": "Score"}
   *       ],
   *       "cron": "0 * * * *",
   *       "matchTTL": 30,
   *       "maxMatches": 20,
   *       "userId": 1,
   *       "lastRun": null,
   *       "lastRunProblem": null,
   *       "updatedAt": "2016-05-16T08:23:35.730Z",
   *       "createdAt": "2016-05-16T08:23:35.730Z",
   *       "nextRun": "2016-08-15T00:00:00.000Z"
   *     },
   *     {
   *       "id": 8,
   *       "title": "alert title",
   *       "sourceKey": "584f2569",
   *       "query": "MATCH (n1)-[r:DIRECTED]-(n2) RETURN n1, n1.score",
   *       "dialect": "cypher",
   *       "enabled": true,
   *       "columns": [
   *         {"type": "number", "columnName": "n1.score", "columnTitle": "Score"}
   *       ],
   *       "cron": "0 0 * * *",
   *       "matchTTL": 30,
   *       "maxMatches": 20,
   *       "userId": 1,
   *       "lastRun": null,
   *       "lastRunProblem": null,
   *       "updatedAt": "2016-05-16T08:23:35.730Z",
   *       "createdAt": "2016-05-16T08:23:35.730Z",
   *       "nextRun": "2016-08-15T00:00:00.000Z"
   *     }
   *   ]
   */

  /**
   * @api {post} /api/admin/:dataSource/alerts Create an alert
   * @apiName CreateAlert
   * @apiGroup Alerts
   * @apiVersion 1.0.0
   * @apiPermission action:admin.alerts
   *
   * @apiDescription Create a new alert. If `matchTTL` is set to 0, unconfirmed matches
   * will disappear when they stop matching the alert query.
   *
   * @apiParam {string}   dataSource   Key of the data-source
   * @apiParam {string}   title        Title of the alert
   * @apiParam {string}   query        Graph query that will run periodically
   * @apiParam {string}   dialect      Dialect of the graph query
   * @apiParam {boolean}  enabled      Whether the query will run periodically or not
   * @apiParam {object[]} [columns]    Columns among the returned values of the query to save in a match as scalar values (**maximum 5**)
   * @apiParam {string="number","string"} columns.type        Type of the column
   * @apiParam {string}                   columns.columnName  Name of the column in the query
   * @apiParam {string}                   columns.columnTitle Name of the column for the UI
   * @apiParam {string}   cron         CRON expression representing the frequency with which the query runs
   * @apiParam {number}   [matchTTL]   Number of days after which the matches of this alert are going to be deleted
   * @apiParam {number}   [maxMatches] Maximum number of matches after which matches with lower scores are discarded
   *
   * @apiUse ReturnCreateAlert
   */
  app.post('/api/admin/:dataSource/alerts', api.respond(req => {
    let maxMatches, matchTTL;

    if (req.param('maxMatches')) {
      maxMatches = Utils.tryParsePosInt(req.param('maxMatches'), 'maxMatches');
    }

    if (req.param('matchTTL')) {
      matchTTL = Utils.tryParsePosInt(req.param('matchTTL'), 'matchTTL');
    }

    return AlertManager.createAlert({
      title: req.param('title'),
      sourceKey: req.param('dataSource'),
      query: req.param('query'),
      dialect: req.param('dialect'),
      enabled: Utils.parseBoolean(req.param('enabled')),
      columns: req.param('columns'),
      cron: req.param('cron'),
      matchTTL: matchTTL,
      maxMatches: maxMatches
    }, Access.getUserCheck(req));
  }, 201));

  /**
   * @api {get} /api/admin/:dataSource/alerts Get all the alerts
   * @apiName GetAlerts
   * @apiGroup Alerts
   * @apiVersion 1.0.0
   * @apiPermission action:admin.alerts
   *
   * @apiDescription Get all the alerts of a given data-source ordered by creation date.
   *
   * @apiParam {string} dataSource Key of the data-source
   *
   * @apiUse ReturnGetAlertsArray
   */
  app.get('/api/admin/:dataSource/alerts', api.respond(req => {
    return AlertManager.getAlerts(req.param('dataSource'), true, Access.getUserCheck(req));
  }, 200));

  /**
   * @api {patch} /api/admin/:dataSource/alerts/:alertId Update an alert
   * @apiName UpdateAlert
   * @apiGroup Alerts
   * @apiVersion 1.0.0
   * @apiPermission action:admin.alerts
   *
   * @apiDescription Update the alert selected by id.
   * Updating an alert will results in all the previous detected matches deleted.
   *
   * @apiParam {string}   dataSource   Key of the data-source
   * @apiParam {number}   alertId      ID of the alert
   * @apiParam {string}   [title]      New title of the alert
   * @apiParam {string}   [query]      New graph query that will run periodically
   * @apiParam {string}   [dialect]    Dialect of the graph query
   * @apiParam {boolean}  [enabled]    Whether the query will run periodically or not
   * @apiParam {object[]} [columns]    Columns among the returned values of the query to save in a match as scalar values
   * @apiParam {string="number","string"} columns.type        Type of the column
   * @apiParam {string}                   columns.columnName  Name of the column in the query
   * @apiParam {string}                   columns.columnTitle Name of the column for the UI
   * @apiParam {string}   [cron]       CRON expression representing the frequency with which the query runs
   * @apiParam {number}   [matchTTL]   Number of days after which the matches of this alert are going to be deleted
   * @apiParam {number}   [maxMatches] Maximum number of matches after which matches with lower scores are discarded
   *
   * @apiUse ReturnGetAlert
   */
  app.patch('/api/admin/:dataSource/alerts/:alertId', api.respond(req => {
    return AlertManager.updateAlert(
      Utils.tryParsePosInt(req.param('alertId'), 'alertId'),
      req.body,
      Access.getUserCheck(req)
    );
  }, 200));

  /**
   * @api {get} /api/admin/:dataSource/alert/:alertId Get an alert
   * @apiName GetAlert
   * @apiGroup Alerts
   * @apiVersion 1.0.0
   * @apiPermission action:admin.alerts
   *
   * @apiDescription Get the alert selected by id.
   *
   * @apiParam {string} dataSource Key of the data-source
   * @apiParam {number} alertId    ID of the alert
   *
   * @apiUse ReturnGetAlert
   */
  app.get('/api/admin/:dataSource/alerts/:alertId', api.respond(req => {
    return AlertManager.getAlert(req.param('dataSource'),
      Utils.tryParsePosInt(req.param('alertId'), 'alertId'),
      true,
      Access.getUserCheck(req));
  }, 200));

  /**
   * @api {delete} /api/admin/:dataSource/alerts/:alertId Delete an alert
   * @apiName DeleteAlert
   * @apiGroup Alerts
   * @apiVersion 1.0.0
   * @apiPermission action:admin.alerts
   *
   * @apiDescription Delete the alert selected by id and all its matches.
   *
   * @apiParam {string} dataSource Key of the data-source
   * @apiParam {number} alertId    ID of the alert
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 204 No Content
   */
  app.delete('/api/admin/:dataSource/alerts/:alertId', api.respond(req => {
    return AlertManager.deleteAlert(
      Utils.tryParsePosInt(req.param('alertId'), 'alertId'),
      Access.getUserCheck(req)
    );
  }, 204));
};
