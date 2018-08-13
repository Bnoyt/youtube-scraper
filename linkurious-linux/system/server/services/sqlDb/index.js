/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-10-08.
 *
 * File: index.js
 * Description : Sql database configuration
 */
'use strict';

// int libs
const path = require('path');

// ext libs
const fs = require('fs-extra');
const Promise = require('bluebird');
const _ = require('lodash');
const Sequelize = require('sequelize');

// our libs
const SequelizeUpdater = require('./../../../lib/SequelizeUpdater');

// service
const LKE = require('../index');
const Log = LKE.getLogger(__filename);
const Errors = LKE.getErrors();
const Config = LKE.getConfig();

class SqlDbService {

  /**
   * @param {object} dbConfig SQL configuration
   * @param {string} dbConfig.name
   * @param {string} dbConfig.username
   * @param {string} dbConfig.password
   * @param {object} dbConfig.options
   * @param {string} dbConfig.options.dialect ("sqlite", "mariadb", "mysql")
   */
  constructor(dbConfig) {

    /**
     * @type {SqlDbModels}
     */
    this.models = {};

    this.connected = false;
    /** @type {Sequelize} */
    this.sequelize = undefined;

    this.dbName = dbConfig.name;
    this.dbUsername = dbConfig.username;
    this.dbPassword = dbConfig.password;

    this.dbOptions = _.omitBy(dbConfig.options, optionValue => optionValue === null);
    // change to Log.info to log all SQL queries done by Sequelize
    this.dbOptions.logging = Log.debug;
  }

  /**
   * Adds all the containing .js files fo the directory to the Database model. It explores all the
   * subdirectories except fo the lib directory and skips index.js files.
   *
   * @param {string} directory containing the different models.
   */
  _addModelsToDb(directory) {
    fs.readdirSync(directory).filter(file => {
      return (file.indexOf('.') !== 0) && file !== 'lib';
    }).forEach(file => {
      const filePath = path.resolve(directory, file);

      if (fs.statSync(filePath).isDirectory()) {
        this._addModelsToDb(filePath);
      } else {
        Log.debug('SQL : adding model "' + file + '"');
        const model = this.sequelize.import(filePath);
        this.models[model.name] = model;
      }
    });
  }

  /**
   * Synchronise the database state
   *
   * @returns {Promise}
   */
  sync() {
    return this.sequelize.sync();
  }

  /**
   * Close the database connection
   */
  close() {
    if (!this.sequelize) { return; }

    this.sequelize.close();

    // currently sequelize.close() does nothing for sqlite, see https://github.com/sequelize/sequelize/issues/6798
    if (
      this.dbOptions.dialect === 'sqlite' &&
      this.sequelize.connectionManager.connections &&
      this.sequelize.connectionManager.connections.default
    ) {
      this.sequelize.connectionManager.connections.default.close();
    }
  }

  /**
   * Destroy all data in the database
   *
   * @returns {Bluebird<void>}
   */
  destroyAll() {
    return Promise.each(_.values(this.models), model => {
      return model.destroy({where: {}});
    }).then(() => this.sync());
  }

  /**
   * Authenticate, Add models and Sync
   *
   * @returns {Bluebird<void>}
   */
  connect() {
    // if the DB is already connected, resolve right away
    if (this.connected === true) {
      return Promise.resolve();
    }

    // else: authenticate, add models and sync state
    const isSqlite = this.dbOptions.dialect === 'sqlite';
    if (isSqlite) {
      // database file: build its absolute path and make sure it exists (creates the needed dirs)
      this.dbOptions.storage = LKE.dataFile(this.dbOptions.storage);
      fs.ensureFileSync(this.dbOptions.storage);
    }

    this.sequelize = new Sequelize(
      this.dbName,
      this.dbUsername,
      this.dbPassword,
      this.dbOptions
    );

    // 1) connect to DB
    return this.sequelize.authenticate().then(() => {
      LKE.getStateMachine().set('SqlDB', 'up');
    }).catch(error => {
      return Errors.technical('critical', 'SQL connection error: ' + error, true);
    }).then(() => {

      // 2) migrate the schema if necessary
      const schemaUpdater = new SequelizeUpdater(
        this.dbName, // same options as sqlDb.sequelize
        this.dbUsername,
        this.dbPassword,
        this.dbOptions,
        'lk_version'
      );
      return schemaUpdater.run(
        fs.readJsonSync(path.resolve(__dirname, 'databaseUpdates.json')),
        LKE.getVersion()
      );
    }).then(appliedUpdates => {
      if (appliedUpdates.length > 0) {
        Log.info(
          `Applied ${appliedUpdates.length} database update` +
          `${appliedUpdates.length > 1 ? 's' : ''} to version ${LKE.getVersion()}.`
        );
      }

      // 3) load models and associations
      this._addModelsToDb(path.resolve(__dirname, 'models'));
      _.forEach(this.models, model => {
        if ('associate' in model) {
          model.associate(this.models);
        }
      });
      // 4) sync models (create tables etc.)
      return this.sequelize.sync().then(() => {
        // 4.1) create initial values for each model
        return Promise.each(_.values(this.models), model => {
          if (!model.initialValues) { return; }
          return model.initialValues();
        });
      });
    }).then(() => {
      // 5) enable write-ahead-log for sqlite
      if (!isSqlite) { return; }
      // SQLITE: turn on Write-Ahead-Log optimization (https://www.sqlite.org/wal.html)
      const pragmaList = ['busy_timeout = 5000', 'journal_mode = WAL', 'synchronous = NORMAL'];
      return Promise.each(pragmaList, pragma => this.sequelize.query('PRAGMA ' + pragma));

    }).catch(err => {
      LKE.getStateMachine().set('SqlDB', 'sync_error');
      Log.error('SQL Sync error', err);
      return Errors.technical('critical', 'SQL synchronisation failure' + err, true);
    }).then(() => {
      // 6) set connected+synced state
      this.connected = true;
      LKE.getStateMachine().set('SqlDB', 'synced');
    }).catch(error => {
      LKE.getStateMachine().set('SqlDB', 'down');
      return Promise.reject(error);
    });
  }
}

module.exports = new SqlDbService(Config.get('db'));
