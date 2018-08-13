/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-12-31.
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../services');
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();
const Log = LKE.getLogger(__filename);

const TYPES = ['Graph', 'Index'];

class DAO {

  /**
   * Base class of a DAO instance.
   *
   * The Connector module will searched for in ./connector/<vendor>/<connectorName>Connector.js
   * The Driver module will searched for in ./<lowerCase(type)>/<vendor>/<driverName>Driver.js
   *
   * @param {string}                                 type             'Graph' or 'Index'
   * @param {string}                                 vendor           Name of the vendor for this DAO (e.g.: neo4j, elasticSearch)
   * @param {string[]}                               requiredOptions  List of required option properties
   * @param {string[]}                               availableOptions List of available option properties
   * @param {any}                                    options          DAO constructor options
   * @param {GraphDAO}                               [graphDao]       The connected Graph DAO (only if type is 'Index', optional to support old DAOs, see #634)
   * @param {string | string[]}                      [connectors]     Name of the connector of the DAO (optional to support old DAOs, see #634)
   * @param {Array<{version: string, name: string}>} [drivers]        Name of the driver to use from a given version (optional to support old DAOs, see #634)
   * @constructor
   */
  constructor(
    type,
    vendor,
    requiredOptions,
    availableOptions,
    options,
    graphDao,
    connectors,
    drivers
  ) {
    if (this === undefined) {
      throw Errors.technical('bug', 'DAO: constructor called without "new"');
    }

    // type (Graph or Index)
    if (!_.includes(TYPES, type)) {
      throw Errors.technical('bug', 'DAO: "type" must be one of ' + TYPES);
    }
    this._type = type;

    // vendor name (neo4j, elasticSearch, ...)
    if (!vendor) {
      throw Errors.technical('bug', type + ' DAO: "vendor" is required');
    }
    this._vendor = vendor;

    const daoName = this._name = type + ' DAO (' + vendor + ')';

    // check options
    if (!requiredOptions) {
      throw Errors.technical('bug', daoName + ': "requiredOptions" is required');
    }
    if (!Array.isArray(requiredOptions)) {
      throw Errors.technical('bug', daoName + ': "requiredOptions" must be an array');
    }
    if (!availableOptions) {
      throw Errors.technical('bug', daoName + ': "availableOptions" is required');
    }
    if (!Array.isArray(availableOptions)) {
      throw Errors.technical(
        'bug', `${daoName}: "availableOptions" must be an array`
      );
    }
    if (!options) {
      throw Errors.business('bug', daoName + ': "options" is required');
    }
    requiredOptions.forEach(key => {
      if (Utils.noValue(options[key])) {
        throw Errors.business('missing_field', daoName + ': "options.' + key + '" is required');
      }
    });
    const unknownOptions = _.difference(Object.keys(options), availableOptions);
    if (unknownOptions.length > 0) {
      throw Errors.business('invalid_parameter',
        daoName + ': unknown options: ' + unknownOptions.join(', ')
      );
    }
    this._options = options;

    if (Utils.hasValue(connectors) || Utils.hasValue(drivers)) {

      // Graph options are needed for connecting indices as well
      this._graphOptions = type === 'Graph' ? options : graphDao.options;
      this._indexOptions = type === 'Index' ? options : undefined;
      this._graphDao = graphDao;

      this._connectorNames = connectors;

      // Min size of `drivers` is 2 (at least 1 driver and the [latest] version supported)
      Utils.check.array('drivers', drivers, 2);

      this._drivers = drivers;
      // We sort them in descending order
      this._drivers.sort((a, b) => {
        return -Utils.compareSemVer(a.version, b.version);
      });
    }
  }

  /**
   * The options of this DAO.
   *
   * @type {object}
   */
  get options() {
    return this._options;
  }

  /**
   * The human readable name of this DAO (e.g. "Graph DAO (neo4j)").
   *
   * @type {string}
   */
  get name() {
    return this._name;
  }

  /**
   * The type of this DAO (e.g. "Graph" or "Index").
   *
   * @type {string}
   */
  get type() {
    return this._type;
  }

  /**
   * The vendor name of this DAO (e.g. "neo4j").
   *
   * @type {string}
   */
  get vendor() {
    return this._vendor;
  }

  /**
   * @type {Connector}
   */
  get connector() {
    if (this._connector) {
      return this._connector;
    }

    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * @type {Driver}
   */
  get driver() {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * @param {string} path
   * @param {string} vendor
   * @returns {any}
   * @private
   */
  static _tryToRequire(path, vendor) {
    try {
      return require(path);
    } catch(e) {
      if (Utils.hasValue(e.message) && e.message.startsWith('Cannot find module')) {
        throw Errors.technical(
          'bug', 'Module not found for vendor "' + vendor + '" (' + path + ')'
        );
      } else {
        throw e;
      }
    }
  }

  /**
   * Create a DAO instance.
   * The DAO module will searched for in ./<lowerCase(type)>/<vendor>/<vendor>DAO.js
   *
   * @param {string}   type       'Graph' or 'Index' (will be set to lowercase to resolve the folder)
   * @param {string}   vendor     Vendor name
   * @param {any}      options    DAO constructor options
   * @param {GraphDAO} [graphDao] The connected Graph DAO (only if type is 'Index')
   * @returns {DAO}
   */
  static createInstance(type, vendor, options, graphDao) {
    if (!type) {
      throw Errors.technical('bug', 'DAO "type" is required');
    }
    if (!vendor) {
      throw Errors.technical('bug', 'DAO "vendor" is required');
    }

    const path = './' + type.toLowerCase() + '/' + vendor + '/' + vendor + 'DAO';
    const DAOClass = DAO._tryToRequire(path, vendor);

    if (options && options.vendor) {
      // remove 'vendor' key from options
      options = _.omit(options, 'vendor');
    }

    return new DAOClass(options, graphDao);
  }

  /**
   * Connect for the first time to the DAO using the first connector that works.
   *
   * @param {string[]} [connectors] Connectors still to try
   * @returns {Bluebird<string>} resolved with the SemVer version of the remote server
   * @private
   */
  _firstConnect(connectors) {
    if (Utils.noValue(connectors)) {
      // we initialize the connector name list
      connectors = Array.isArray(this._connectorNames)
        ? Utils.clone(this._connectorNames)
        : [this._connectorNames];
    }

    if (connectors.length === 0) {
      // we reach here only if no connectors were defined for the DAO
      throw Errors.technical('bug', this._type + ' DAO: at least 1 "connector" is required');
    }

    return Promise.resolve().then(() => {
      // Create the connector
      const _connectorName = connectors.shift();
      const _connectorPath = './connector/' + _connectorName + 'Connector';
      const _connector = new (DAO._tryToRequire(
        _connectorPath, this._vendor
      ))(this._graphOptions, this._indexOptions);

      return Promise.props({
        connector: _connector,
        connectorName: _connectorName,
        version: _connector.$connect()
      });
    }).then(firstConnectR => {
      this._connector = firstConnectR.connector;

      Log.info(`${this.name} will be using connector: "${firstConnectR.connectorName}Connector".`);
      return firstConnectR.version;
    }).catch(error => {
      // if we still have connectors to try we silently ignore the error
      if (connectors.length > 0) {
        return this._firstConnect(connectors);
      }

      // else we fail with the error of the last connector
      throw error;
    });
  }

  /**
   * Connect to the remote server.
   *
   * Based on the version of the vendor and on the `drivers` array, pick the right driver:
   *  - If the actual version is higher than the latest supported version,
   *    use the latest driver and show a warning
   *  - If the actual version is lower than the earliest supported version,
   *    use the earliest driver and show a warning
   *  - Otherwise, pick the newest driver compatible with the actual version
   *
   * Entries of the `drivers` array should be read as:
   * This driver with this `name` is compatible since this `version` of the vendor
   *
   * @returns {Bluebird<string>} resolved with the SemVer version of the remote server
   */
  connect() {
    return Promise.resolve().then(() => {
      // If we already connected in the past, a connector is defined and we can connect directly
      // otherwise, we invoke "_firstConnect" that tries all the possible connectors one by one
      if (Utils.hasValue(this._connector)) {
        return this.connector.$connect();
      } else {
        return this._firstConnect();
      }
    }).then(actualVersion => {
      let currentDriverName;

      for (let i = 0; i < this._drivers.length; i++) {
        if (actualVersion >= this._drivers[i].version) {
          currentDriverName = this._drivers[i].name;
          break;
        }
      }

      if (currentDriverName === '[latest]') {
        currentDriverName = this._drivers[1].name;
        const latestVersion = this._drivers[0].version;
        if (actualVersion > latestVersion) {
          Log.warn('Version ' + actualVersion + ' of ' + this.vendor +
            ' was never officially tested with Linkurious.' +
            ' Latest supported version is ' + latestVersion + '.');
        }
      } else if (Utils.noValue(currentDriverName)) {
        const earliest = this._drivers[this._drivers.length - 1];
        currentDriverName = earliest.name;
        Log.warn('Version ' + actualVersion + ' of ' + this.vendor +
          ' was never officially tested with Linkurious.' +
          ' Earliest supported version is ' + earliest.version + '.');
      }

      return this.connector.$getConnectorData().then(connectorData => {
        const driverPath = './' + this.type.toLowerCase() + '/' +
          this.vendor + '/' + currentDriverName + 'Driver';

        Log.info(
          `${this.name} [v${actualVersion}] will be using driver: "${currentDriverName}Driver".`
        );

        if (this.type === 'Graph') {
          this.$driver = new (DAO._tryToRequire(driverPath, this.vendor))(this.connector,
            this._graphOptions, connectorData);
        } else {
          // we also pass the index options
          this.$driver = new (DAO._tryToRequire(driverPath, this.vendor))(this.connector,
            this._graphDao, this._indexOptions, connectorData);
        }

        return this.$driver.$onAfterConnect().return(actualVersion);
      });
    });
  }

  /**
   * Disconnect from the remote server.
   *
   * It will never throw.
   */
  disconnect() {
    try {
      if (this._connector) {
        this._connector.$disconnect();
      }
    } catch(e) {
      /* ignore any error */
    }
  }

  /**
   * Check if the remote server is alive.
   *
   * @returns {Bluebird<void>}
   */
  checkUp() { return this.connector.$checkUp(); }

  /**
   * Detect the current store ID.
   *
   * A store ID is the name of the current database (if the graph server is multi-tenant)
   * otherwise the vendor name.
   *
   * @returns {Bluebird<string>}
   */
  getStoreId() { return this.connector.$getStoreId(); }

  /**
   * Return a DAO option by key (or a default value if undefined or null).
   *
   * @param {string} key            Option key
   * @param {any}    [defaultValue] Default value
   * @returns {any} the option value (or the default value if not set)
   */
  getOption(key, defaultValue) {
    const value = this.options[key];
    return Utils.hasValue(value) ? value : defaultValue;
  }

  /**
   * Called at the end of the indexation phase for additional initializations.
   *
   * @returns {Bluebird<void>}
   */
  onAfterIndexation() {
    if (!this.$driver) {
      return Promise.resolve();
    }

    return this.driver.$onAfterIndexation();
  }
}

module.exports = DAO;
