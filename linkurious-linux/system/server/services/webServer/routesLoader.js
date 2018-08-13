/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-10-15.
 *
 * File: index.js
 * Description : File to automatically load all route files in the route directory except the
 *               particular vendor directory
 */
'use strict';

// int libs
const fs = require('fs-extra');
const path = require('path');

// ext libs
const Promise = require('bluebird');
const serveStatic = require('serve-static');

// services
const LKE = require('../index');
const Config = LKE.getConfig();
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();
const Log = LKE.getLogger(__filename);

module.exports = function routesLoaded(app) {
  const api = require('./api');

  // force HTTPS
  const forceHttps = Config.get('server.forceHttps');
  const httpsPort = Config.get('server.publicPortHttps', Config.get('server.listenPortHttps'));
  app.all('*', api.proxy((req, res) => {

    const isHttps = Utils.isRequestHTTPS(req);
    if (!isHttps && forceHttps) {
      if (req.method === 'GET') {
        // redirect to https version
        const targetUrl = `https://${req.get('host').split(':')[0]}:${httpsPort}${req.originalUrl}`;
        res.redirect(302, targetUrl);
        return null;
      } else {
        // fail
        return Errors.business('https_required', null, true);
      }
    }
    return Promise.resolve();

  }, true));

  // client CUSTOM static files
  const customFilesPath = LKE.dataFile('server/customFiles');
  const defaultCustomFilesPath = path.resolve(__dirname, 'customFiles');
  const previousCustomCSS = LKE.systemFile('server.old/public/assets/css/override.css');
  if (!fs.existsSync(customFilesPath)) {
    // custom files dir does not exist in "data/" yet : create it from default files
    Log.debug('Creating "customFiles" from default files');
    fs.copySync(defaultCustomFilesPath, customFilesPath);

    if (fs.existsSync(previousCustomCSS)) {
      Log.debug('Copying override.css from "server.old" to "data"');
      // a previous custom CSS file exists: move it to the custom files dir
      fs.copySync(
        previousCustomCSS,
        path.resolve(customFilesPath, 'assets', 'css', 'override.css')
      );
    }
  }
  app.use(serveStatic(customFilesPath, {fallthrough: true}));

  // client static files
  const clientRoot = LKE.systemFile(Config.get('server.clientFolder'));
  app.use(serveStatic(clientRoot, {fallthrough: true}));

  // API routes
  function requireRoutesFiles(directory) {
    fs.readdirSync(directory).filter(file => {
      return (file.indexOf('.') !== 0) && (file !== 'index.js') && file !== 'vendor';
    }).forEach(file => {
      const filePath = path.join(directory, file);

      if (fs.statSync(filePath).isDirectory()) {
        requireRoutesFiles(filePath);
      } else {
        require(filePath)(app);
      }
    });
  }
  requireRoutesFiles(path.resolve(__dirname, 'routes'));

  // fail correctly on bad API calls
  app.all('/api/*', api.respond(() => {
    throw Errors.business('api_not_found');
  }));

  const options = {
    maxAge: 1000 * 60 * 60 * 24 * 7, // one week (in milliseconds)
    root: clientRoot
  };

  const WidgetRoute = require('./WidgetRoute');
  new WidgetRoute(options).load(app);

  // server index for all unknown locations
  app.get('/*', (req, res) => {
    res.sendFile('index.html', options);
  });
};
