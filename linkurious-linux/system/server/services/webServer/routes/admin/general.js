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
const LKE = require('../../../index');
const Utils = LKE.getUtils();
const Access = LKE.getAccess();
const Analytics = LKE.getAnalytics();
const Log = LKE.getLogger(__filename);

// locals
const api = require('../../api');

module.exports = function(app) {
  /**
   * @api {get} /api/admin/report Create a report
   * @apiName CreateReport
   * @apiGroup Linkurious
   * @apiVersion 1.0.0
   * @apiPermission action:admin.report
   *
   * @apiDescription Collect all the analytics and log files in a compressed tarball and return it.
   *
   * @apiParam {boolean} [with_configuration=false] Whether to include the configuration within the tarball
   *
   * @apiSuccessExample {tar.gz} Success-Response:
   *   HTTP/1.1 200 OK
   */
  app.get('/api/admin/report', api.respond((req, res) => {
    // admin.report on any data-source
    return Access.hasAction(req, 'admin.report').then(() => {
      return Analytics.createReport(Utils.parseBoolean(req.param('with_configuration')));
    }).then(path => {
      res.type('application/gzip');
      res.setHeader('Content-Disposition', `attachment; filename=${Analytics.reportFileName}`);
      res.sendFile(path);
    }).return(null);
  }, 200, true, true));

  /**
   * @api {post} /api/admin/restart Restart Linkurious
   * @apiName RestartLinkurious
   * @apiGroup Linkurious
   * @apiVersion 1.0.0
   * @apiPermission action:admin.config
   *
   * @apiDescription Restart Linkurious.
   *
   * @apiSuccess {string} url The url of Linkurious to connect to after the restart
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "url": "http://localhost:3000"
   *   }
   */
  app.post('/api/admin/restart', api.respond(req => {
    return Access.hasAction(req, 'admin.config').then(() => {
      // 2 seconds to respond and die
      Promise.delay(2000).then(() => {
        Log.info(`Linkurious restarted from the API by user #${req.user.id}`);

        // exit status code 4 will trigger a restart in the Linkurious manager
        process.exit(4);
      });

      return Promise.resolve({
        url: LKE.getBaseURL()
      });
    });
  }));
};
