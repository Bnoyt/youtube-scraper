/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-01.
 */
'use strict';

// external libs
const Promise = require('bluebird');
const gremlin = require('gremlin');

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const Log = LKE.getLogger(__filename);

// locals
const Connector = require('./connector');

const GREMLIN_WRITE_STATEMENTS = [
  'addProperty', 'addE', 'addV', 'drop', 'remove', 'clear'
];
const GREMLIN_WRITE_RE = new RegExp('(' + GREMLIN_WRITE_STATEMENTS.join('|') + ')');

const GREMLIN_FORBIDDEN_STATEMENTS = [
  'close', 'openManagement', 'system\\s*\\.', 'graph\\s*\\.', 'g\\s*=', 'graph\\s*='
];

const GREMLIN_FORBIDDEN_RE = new RegExp('(' + GREMLIN_FORBIDDEN_STATEMENTS.join('|') + ')');

class GremlinConnector extends Connector {

  /**
   * @param {any}     graphOptions                               GraphDAO options
   * @param {any}     [indexOptions]                             IndexDAO options (only if the type of the DAO is 'Index')
   * @param {object}  gremlinOptions
   * @param {boolean} gremlinOptions.manageTransactions          Whether transactions are committed automatically
   * @param {string}  [gremlinOptions.httpPathGremlinServer='/'] HTTP path of them gremlin server
   *
   * @constructor
   */
  constructor(graphOptions, indexOptions, gremlinOptions) {
    super(graphOptions, indexOptions);

    this._manageTransactions = gremlinOptions.manageTransactions;
    this._httpPathGremlinServer = gremlinOptions.httpPathGremlinServer;
    this._aliases = {};
  }

  /**
   * Connect to the remote server.
   *
   * @returns {Bluebird<string>} resolved with the SemVer version of the remote server
   */
  $connect() {
    return this._connectGremlinServer().then(() => {
      return this.$initGremlinSession();
    }).then(() => {
      return this.$getVersion();
    });
  }

  /**
   * Add definitions in the gremlin session and/or perform additional checks.
   *
   * @returns {Bluebird<void>}
   */
  $initGremlinSession() {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Close the WebSocket connection.
   *
   * @private
   */
  _closeConnection() {
    // close the WebSocket
    try {
      this._client.ws.close();
    } catch(e) {
      // do nothing
    }

    // release the client
    this._client = undefined;
  }

  /**
   * Encode the credentials for SASL.
   *
   * @param {string} username
   * @param {string} password
   * @returns {string}
   * @private
   */
  _encodeSASLCredentials(username, password) {
    let str = '\0';
    str += username;
    str += '\0';
    str += password;
    return Buffer.from(str, 'ascii').toString('base64');
  }

  /**
   * Authenticate to the gremlin server, if necessary.
   *
   * @returns {Bluebird<void>}
   * @private
   */
  _authenticate() {
    if (Utils.hasValue(this.getGraphOption('user'))) {
      const args = {
        saslMechanism: 'PLAIN',
        sasl: this._encodeSASLCredentials(
          this.getGraphOption('user'),
          this.getGraphOption('password')
        )
      };

      // A request prior the authentication is needed to trigger a 407 status code
      return this.$getVersion().catch(err => {
        if (Utils.noValue(this._client)) {
          throw err;
        }

        return this._client.executeAsync(undefined, undefined,
          {args: args, processor: '', op: 'authentication'}).return();
      });
    }

    return Promise.resolve();
  }

  /**
   * Connect to the gremlin server.
   *
   * @returns {Bluebird<void>}
   * @private
   */
  _connectGremlinServer() {
    if (this._client && this._client.connected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const hp = Utils.extractHostPort(this.getGraphOption('url'));

      // connect to the gremlin server via WebSocket

      // promisifyAll doesn't work well with static typing
      this._client = /**@type {any}*/ (Promise.promisifyAll(gremlin.createClient(
        hp.port,
        hp.host,
        {
          path: this._httpPathGremlinServer,
          ssl: hp.scheme === 'wss',
          rejectUnauthorized: !this.getGraphOption('allowSelfSigned', false),
          session: true,
          language: 'gremlin-groovy',
          executeHandler: (messageStream, cb) => {
            messageStream.on('error', () => {
              // ignore the error because it's also caught by this._client.executeAsync
            });

            return require('gremlin/src/executehandler')(messageStream, cb);
          }
        }
      )));

      // WebSocket connection error
      this._client.ws.onerror = error => {
        // reset the client
        this._closeConnection();

        // fail properly
        reject(Errors.technical(
          'critical',
          `Cannot connect to the gremlin server (${this.getGraphOption('url')}): ${error.message}`
        ));
      };

      // WebSocket connection success
      this._client.once('connect', () => {
        this._authenticate().then(resolve, reject);
      });

      // other failures?
      this._client.on('error', error => {
        Log.error('Gremlin server communication error', error);
      });
    });
  }

  /**
   * Check if the remote server is alive.
   *
   * @returns {Bluebird<void>}
   */
  $checkUp() {
    return this.$doGremlinQuery('true').then(r => {
      if (r && r.length === 1 && r[0] === true) {
        return;
      }

      return Errors.technical('graph_unreachable', 'Cannot connect to the gremlin server.', true);
    }).catch(error => {
      // if the checkup failed, reset the client
      this._closeConnection();

      return Promise.reject(error);
    });
  }

  /**
   * Detect the current store ID.
   *
   * A store ID is an identifier of the database as specific as possible.
   * It should contains the address (url and port) of the database and, if the service
   * is multi-tenant, the name of the database.
   *
   * @returns {Bluebird<string>}
   */
  $getStoreId() {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Data that the connector will pass to the driver.
   *
   * @returns {Bluebird<any>}
   */
  $getConnectorData() {
    return Promise.resolve({});
  }

  /**
   * Get the SemVer of the remote server.
   *
   * @returns {Bluebird<string>} resolved with the SemVer version of the remote server
   */
  $getVersion() {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   *
   * @param {string}  query
   * @param {boolean} [canWrite=true]                 Whether the query can modify the data
   * @param {boolean} [allowForbiddenStatements=true] Whether the query can use forbidden statements
   *
   * @private
   */
  _checkQuery(query, canWrite, allowForbiddenStatements) {
    const queryStatements = Utils.stripLiterals(query);
    let match;

    if (allowForbiddenStatements === false) {
      if ((match = GREMLIN_FORBIDDEN_RE.exec(queryStatements)) !== null) {
        throw Errors.access(
          'invalid_parameter', `"${match[1]}" is forbidden in Gremlin API.`
        );
      }
    }

    if (canWrite === false) {
      if ((match = GREMLIN_WRITE_RE.exec(queryStatements)) !== null) {
        throw Errors.access('write_forbidden',
          `The query cannot use statement "${match[1]}", or any of ${GREMLIN_WRITE_STATEMENTS}`
        );
      }
    }
  }

  /**
   * @param {object} aliases
   */
  $setAliases(aliases) {
    this._aliases = aliases;
  }

  /**
   * Execute a sparql query on the triple store.
   *
   * @param {string}  query
   * @param {number}  [timeout]                       Milliseconds to wait before it fails
   * @param {boolean} [canWrite=true]                 Whether the query can modify the data
   * @param {boolean} [allowForbiddenStatements=true] Whether the query can use forbidden statements
   * @returns {Bluebird<any>}
   */
  $doGremlinQuery(query, timeout, canWrite, allowForbiddenStatements) {
    if (!this._client) {
      return Errors.technical('graph_unreachable', 'Cannot connect to the gremlin server.', true);
    }

    // TODO #919 Improve Gremlin read-only raw query check
    this._checkQuery(query, canWrite, allowForbiddenStatements);

    return this._client.executeAsync(query, {}, {args: {
      scriptEvaluationTimeout: timeout,
      manageTransaction: this._manageTransactions,
      aliases: this._aliases
    }}).catch(error => {

      let message = (error.message ? error.message : error);
      const isTechnical = message.includes('Operation timed out');
      message += '\nQuery was: ' + query;

      if (isTechnical) {
        return Errors.technical('critical', 'Gremlin server error: ' + message, true);
      } else {
        return Errors.business('bad_graph_request', 'Gremlin server error: ' + message, true);
      }
    });
  }
}

module.exports = GremlinConnector;
