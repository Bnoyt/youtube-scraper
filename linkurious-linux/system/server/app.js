/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-11-04.
 */
'use strict';

/**
 * The following exit codes means:
 *  2   Wrong configuration
 *  3   HTTP/HTTPS port is busy or restricted
 *  4   Manually restarted from API (look at `/api/admin/restart`)
 */

// external libs
const Promise = require('bluebird');

// services
const LKE = require('./services');

// locals
const Options = require('./options');

class WorkerSignal extends Error {}

// remove deprecation warnings for some modules (nodejs-depd)
process.env['NO_DEPRECATION'] = 'express-session';

/**
 * @returns {Bluebird<void>} resolved when Linkurious is up
 */
function startApp() {
  // parse command-line options
  const parsedOptions = Options.parse(LKE);
  LKE.init(parsedOptions);

  // configure bluebird
  Promise.config({
    // Enable all warnings except forgotten return statements
    warnings: {
      wForgottenReturn: false
    },
    // Enable long stack traces
    longStackTraces: !!(LKE.isDevMode() || LKE.isTestMode()),
    // Note: longStackTraces = true will result in a memory leak due to the use of promise loops in the scheduler service

    // Enable cancellation
    cancellation: true,
    // Enable monitoring
    monitoring: true
  });

  // these should never fail
  const Config = LKE.getConfig();
  const Errors = LKE.getErrors();
  const Log = LKE.getLogger(__filename);
  const Utils = LKE.getUtils();

  // services created in init phase
  let StateMachine, Data, Access;

  // init rejects when WorkerSignal if we are a Layout worker
  /**@type {function}*/
  const init = Promise.method(() => {

    // layout cluster init (stop after that if not master)
    const Layout = LKE.getLayout();
    if (!Layout.isMaster) {
      Layout.startWorker();
      throw new WorkerSignal();
    } else {
      // load configuration from file
      LKE.getConfig().load();

      // setup a default costumer ID if it's not setup already in the configuration
      if (Utils.noValue(Config.get('customerId'))) {
        Config.set('customerId', Utils.generateUniqueCustomerId());
      }

      Layout.startCluster();
    }

    Log.info('Starting Linkurious ' + LKE.getVersionString());

    StateMachine = LKE.getStateMachine();
    Data = LKE.getData();
    Access = LKE.getAccess();
  });

  return init().then(() => {
    return LKE.getFirstRun().check();
  }).then(() => {
    return LKE.getSqlDb().connect();
  }).then(() => {
    // register a SIGINT/SIGTERM handler
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);
  }).then(() => {
    return Access.ensureBuiltinGroups();
  }).then(() => {
    return Access.migrateLegacyGroups();
  }).then(() => {
    return Access.providersStartupCheck();
  }).then(() => {
    return LKE.getWebServer().start();

  }).then(() => {
    return Data.connectSources();

  }).then(() => {
    return Data.indexSources(true);

  }).then(() => {
    // start the Alert Manager
    return LKE.getAlert().start();

  }).catch(WorkerSignal, () => {
    Log.info('Layout worker ready.');

  }).catch(Errors.LkError, err => {
    if (StateMachine) {
      StateMachine.set('Linkurious', 'unknown_error');
    }
    if (err && err.isTechnical() && err.stack) {
      Log.error(err.stack);
    } else {
      Log.error(err.message);
    }

    if (err && err.key) {
      if (err.key === 'invalid_configuration') {
        process.exit(2);
      } else if (err.key === 'port_restricted' || err.key === 'port_busy') {
        process.exit(3);
      }
    }
  }).catch(err => {
    if (StateMachine) {
      StateMachine.set('Linkurious', 'unknown_error');
    }
    Log.error(err && err.stack ? err.stack : err.message);
  });
}

/**
 * Clean up open connections and terminate the process.
 */
function onSignal() {
  LKE.getSqlDb().close();
  LKE.getData(false).disconnectAll();
  process.exit(0);
}

// export the start promise to enable programmatic instantiation
module.exports = startApp();
