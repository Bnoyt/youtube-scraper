/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-11-23.
 */
'use strict';

// int libs
const path = require('path');
const fs = require('fs-extra');

// ext libs
const MiniTemplate = require('../../../lib/MiniTemplate');
const basicAuth = require('basic-auth');

// services
const LKE = require('../index');
const Config = LKE.getConfig();
const Errors = LKE.getErrors();
const WidgetDAO = LKE.getWidgetDAO();

class WidgetRoute {

  /**
   * @param {object} staticFileOptions
   * @param {string} staticFileOptions.root Static files root.
   */
  constructor(staticFileOptions) {
    this.template = null;
    this.staticFileOptions = staticFileOptions;
  }

  /**
   * @param {string} widgetData The widget data
   * @returns {string}
   */
  getWidgetPage(widgetData) {
    if (!this.template || !LKE.isProdMode()) {
      this.template = WidgetRoute.makeTemplate(
        path.resolve(this.staticFileOptions.root, 'widget.html')
      );
    }
    return this.template.compile({tracker: '', data: widgetData});
  }

  /**
   *
   * @param {string} filePath path of the file to make a template with
   * @returns {MiniTemplate}
   */
  static makeTemplate(filePath) {
    const fileContent = fs.readFileSync(filePath, {encoding: 'utf8'});

    return new MiniTemplate(fileContent, {
      tracker: '<!-- TRACKER_PLACEHOLDER -->',
      data: '\'WIDGET_DATA\''
    });
  }

  /**
   * @param {express.Application} app
   */
  load(app) {

    // server widget template if enabled (default: true, only in Enterprise Edition)
    const widget = Config.get('access.widget', true) && LKE.isEnterprise();
    if (!widget) {
      return;
    }

    app.get('/widget/:key', (req, res) => {
      let responseBody = '';
      let status = 200;

      /** @type {{name: string, pass: string}} */
      const auth = basicAuth(req) || {};

      WidgetDAO.getByKey(req.param('key'), {password: auth.pass}).then(widgetData => {
        responseBody = this.getWidgetPage(JSON.stringify(widgetData));

      }).catch(Errors.LkError, e => {
        if (e.isAccess()) {
          // respond with the basic-auth challenge in case of access error
          status = 401;
          res.setHeader(
            'WWW-Authenticate',
            'Basic realm="Linkurious Widget (user field is ignored)"'
          );
          responseBody = '<h1>' + e.message + '</h1>';
        } else {
          // generic case of other errors
          status = 400;
          responseBody = '<h1>' + e.message + '</h1>';
        }
      }).catch(e => {
        // handler for non-linkurious errors
        status = 500;
        responseBody = '<h1>Internal server error</h1>' +
          '<pre>' + (e && e.stack ? e.stack : e) + '</pre>';
      }).finally(() => {
        res.status(status).send(responseBody);
      });
    });

    app.get('/widget', (req, res) => {
      res.sendFile('widget.html', this.staticFileOptions);
    });
  }
}

module.exports = WidgetRoute;
