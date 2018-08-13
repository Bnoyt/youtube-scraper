/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-11-04.
 */
'use strict';

// internal libs
const fs = require('fs');
const path = require('path');

// locals
const Utils = new (require('../lib/utils'))();

class ServiceManager {
  constructor() {
    // services enabled only in enterprise mode
    this._enterpriseOnly = {
      'access/AccessRightDAO': true,
      'business/VisualizationShareDAO': true,
      'business/WidgetDAO': true
    };

    this._services = {};
    this._currentlyCreating = [];
    this._releaseCache = undefined;
    this._initDone = false;

    this._mode = this.DEFAULT_MODE;
    this._resetConfig = false;
  }

  /**
   * Must be called before anything LKE related.
   *
   * @param {object}  options
   * @param {string}  [options.mode='production'] Runtime mode ('production','development','test')
   * @param {boolean} [options.resetConfig]       Whether to request a configuration reset
   */
  init(options) {
    if (this._initDone) {
      this._logger.warn('LKE: ignoring additional init');
      return;
    }

    if (Utils.hasValue(options.mode)) {
      Utils.check.values('mode', options.mode, this.MODES);
      this._mode = options.mode;
    }

    if (options.resetConfig === true) {
      this._resetConfig = true;
    }

    this._initDone = true;

    this._logger = this.getLogger(__filename);
  }

  /**
   * @type {{mode: string, resetConfig: boolean}}
   */
  get options() {
    return {
      mode: this._mode,
      resetConfig: this._resetConfig
    };
  }

  /**
   * @type {string}
   */
  get MODE_DEV() {
    return 'development';
  }

  /**
   * @type {string}
   */
  get MODE_TEST() {
    return 'test';
  }

  /**
   * @type {string}
   */
  get MODE_PROD() {
    return 'production';
  }

  /**
   * @type {string}
   */
  get DEFAULT_MODE() {
    return this.MODE_PROD;
  }

  /**
   * While parsing CLA, modes are parsed in this order (so the latter overrides the former).
   *
   * @type {string[]}
   */
  get MODES() {
    return [this.MODE_DEV, this.MODE_TEST, this.MODE_PROD];
  }

  /**
   * @returns {boolean} true if we are in 'development' mode
   */
  isDevMode() {
    return this.options.mode === this.MODE_DEV;
  }

  /**
   * @returns {boolean} true if we are in 'test' mode
   */
  isTestMode() {
    return this.options.mode === this.MODE_TEST;
  }

  /**
   * @returns {boolean} true if we are in 'production' mode
   */
  isProdMode() {
    return this.options.mode === this.MODE_PROD;
  }

  /**
   * @returns {boolean} true if we are in Linkurious Enterprise
   */
  isEnterprise() {
    return !!(this.getRelease().enterprise);
  }

  /**
   * Resolve a file path relative to Linkurious' system directory.
   *
   * @param {string} filePath
   * @returns {string} an absolute file path
   */
  systemFile(filePath) {
    return path.resolve(__dirname, '..', '..', filePath);
  }

  /**
   * Resolve a file path relative to Linkurious' data directory.
   *
   * @param {string} filePath a file path relative to the linkurious data root
   * @returns {string} an absolute file path
   */
  dataFile(filePath) {
    // if (path.isAbsolute(filePath)) {
    //   return filePath;
    // }
    if (this.isProdMode()) {
      return this.systemFile('../data/' + filePath);
    } else {
      return this.systemFile('data/' + filePath);
    }
  }

  /**
   * @returns {{tag_name: string, name: string, enterprise?: boolean}}
   */
  getRelease() {
    if (!this._releaseCache) {
      const releaseJSON = fs.readFileSync(this.systemFile('release.json')).toString();
      this._releaseCache = JSON.parse(releaseJSON);
      delete this._releaseCache.bodyFile;
    }
    return this._releaseCache;
  }

  /**
   * Get the current SemVer.
   *
   * @returns {string}
   */
  getVersion() {
    return this.getRelease()['tag_name'].substr(1);
  }

  /**
   * Get the version string (e.g.: "Enterprise v0.9.4 (Snappy Squid)").
   *
   * @returns {string}
   */
  getVersionString() {
    return (this.isEnterprise() ? 'Enterprise' : 'Starter') + ' ' +
      this.getRelease()['tag_name'] + ' (' + this.getRelease().name + ')';
  }

  /**
   * Create a new service instance for a given service key.
   *
   * @param {string} key Key of a service
   * @returns {any}
   * @private
   */
  _createService(key) {
    // track circular dependencies
    if (this._currentlyCreating.indexOf(key) >= 0) {
      this._currentlyCreating.push(key);
      throw new Error('Circular dependency detected while loading service (' +
        this._currentlyCreating.join(' -> ') + ').'
      );
    }
    this._currentlyCreating.push(key);

    // find service folder/file and create service instance
    const servicePath = path.resolve(__dirname, key);
    if (fs.existsSync(servicePath + '.js') || fs.existsSync(servicePath + '/index.js')) {
      if (key !== 'logger') {
        this._logger.debug('Creating service instance: "' + key + '"');
      }
      const service = require('./' + key);
      this._currentlyCreating.pop();
      return service;
    } else {
      const m = 'Service does not exist: "' + key + '"';
      if (key !== 'logger') {
        this._logger.error(m);
      } else {
        throw m;
      }
    }
  }

  /**
   * Get a service singleton for a given service key.
   *
   * @param {string} key Key of the service
   * @returns {any}
   * @private
   */
  _get(key) {
    if (!this._initDone) {
      throw new Error('LKE.init must be called before any LKE.get calls (key: ' + key + ').');
    }

    // if the service is enterprise-only and we are not in enterprise, return null
    if (this._enterpriseOnly[key] && !this.isEnterprise()) {
      return null;
    }

    // resolve the service
    let s = this._services[key];

    // if the service was not yet initialized, initialize the service
    if (Utils.noValue(s)) {
      s = this._services[key] = this._createService(key);
    }

    return s;
  }

  /**
   * @returns {AccessService}
   */
  getAccess() {
    return this._get('access');
  }

  /**
   * @returns {AccessRightDAO}
   */
  getAccessRightDAO() {
    return this._get('access/AccessRightDAO');
  }

  /**
   * @returns {GroupDAO}
   */
  getGroupDAO() {
    return this._get('access/GroupDAO');
  }

  /**
   * @returns {UserDAO}
   */
  getUserDAO() {
    return this._get('access/UserDAO');
  }

  /**
   * @returns {AlertService}
   */
  getAlert() {
    return this._get('alert');
  }

  /**
   * @returns {AnalyticsService}
   */
  getAnalytics() {
    return this._get('analytics');
  }

  /**
   * @returns {ApplicationService}
   */
  getApplication() {
    return this._get('application');
  }

  /**
   * @returns {AuditTrailService}
   */
  getAuditTrail() {
    return this._get('auditTrail');
  }

  /**
   * @returns {GraphQueryDAO}
   */
  getGraphQueryDAO() {
    return this._get('business/GraphQueryDAO');
  }

  /**
   * @returns {GraphSchemaDAO}
   */
  getGraphSchemaDAO() {
    return this._get('business/GraphSchemaDAO');
  }

  /**
   * @returns {VisualizationDAO}
   */
  getVisualizationDAO() {
    return this._get('business/VisualizationDAO');
  }

  /**
   * @returns {VisualizationShareDAO}
   */
  getVisualizationShareDAO() {
    return this._get('business/VisualizationShareDAO');
  }

  /**
   * @returns {WidgetDAO}
   */
  getWidgetDAO() {
    return this._get('business/WidgetDAO');
  }

  /**
   * @returns {ConfigurationService}
   */
  getConfig() {
    return this._get('configuration');
  }

  /**
   * @param {boolean} [proxy] Whether the data service is accessible via the access right proxy
   * @returns {DataService}
   */
  getData(proxy) {
    if (proxy) {
      return this._get('data/proxy');
    } else {
      return this._get('data');
    }
  }

  /**
   * @returns {ErrorService}
   */
  getErrors() {
    return this._get('errors');
  }

  /**
   * @returns {FirstRunService}
   */
  getFirstRun() {
    return this._get('firstRun');
  }

  /**
   * @returns {LayoutService}
   */
  getLayout() {
    return this._get('layout');
  }

  /**
   * @param {string} targetFilePath Caller `__filename`
   * @param {string} [subPackage]   An additional package to append to the chain generated by `targetFile`
   * @returns {CustomLogger}
   */
  getLogger(targetFilePath, subPackage) {
    return this._get('logger').createCustomLogger(targetFilePath, subPackage);
  }

  /**
   * @returns {SchedulerService}
   */
  getScheduler() {
    return this._get('scheduler');
  }

  /**
   * @returns {SqlDbService}
   */
  getSqlDb() {
    return this._get('sqlDb');
  }

  /**
   * @returns {StateMachineService}
   */
  getStateMachine() {
    return this._get('stateMachine');
  }

  /**
   * @returns {UtilsService}
   */
  getUtils() {
    return this._get('utils');
  }

  /**
   * @returns {WebServerService}
   */
  getWebServer() {
    return this._get('webServer');
  }

  /**
   * Generate the url of Linkurious from the configuration file.
   *
   * @param {string} [path]
   * @returns {string}
   */
  getBaseURL(path) {
    const Config = this.getConfig();

    // build the url based on the configuration
    const urlProtocol = Config.get('server.useHttps') ? 'https' : 'http';

    let url = urlProtocol + '://' + Config.get('server.domain', '127.0.0.1');

    const urlPort = '' + (
      Config.get('server.useHttps')
        ? Config.get('server.publicPortHttps', Config.get('server.listenPortHttps'))
        : Config.get('server.publicPortHttp', Config.get('server.listenPort'))
    );

    // only add the port if it is not the default port for the protocol
    if (urlProtocol === 'http' ? urlPort !== '80' : urlPort !== '443') {
      url += ':' + urlPort;
    }

    if (path !== null && path !== undefined) {
      if (path.startsWith('/')) {
        url += path;
      } else {
        url += '/' + path;
      }
    }

    return url;
  }
}

module.exports = new ServiceManager();
