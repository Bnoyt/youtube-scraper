/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-10-09.
 */
'use strict';

// external libs
const neo4j = require('neo4j-driver').v1;
const Promise = require('bluebird');
const _ = require('lodash');

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const Log = LKE.getLogger(__filename);
const Config = LKE.getConfig();

// locals
const Neo4jHTTPConnector = require('./neo4jHTTPConnector');

const SLOW_QUERY_THRESHOLD = LKE.isTestMode() ? 50 : 1000;

class Neo4jBoltConnector extends Neo4jHTTPConnector {

  /**
   * @param {any} graphOptions   GraphDAO options
   * @param {any} [indexOptions] IndexDAO options (only if the type of the DAO is 'Index')
   * @constructor
   */
  constructor(graphOptions, indexOptions) {
    super(graphOptions, indexOptions);

    const url = Utils.normalizeUrl(this.getGraphOption('url'));
    const hostPort = Utils.extractHostPort(url);

    this._host = hostPort.host;
    if (hostPort.scheme === 'bolt') {
      this._boltUrl = url;
    } else {
      this.$httpUrl = url;
    }

    this._authToken = this.getGraphOption('user')
      ? neo4j.auth.basic(this.getGraphOption('user'), this.getGraphOption('password'))
      : undefined;

    this._maxTransactionRetryTime = Config.get('advanced.rawQueryTimeout');
  }

  /**
   * Disconnect from the remote server.
   */
  $disconnect() {
    this._closeConnection();
  }

  /**
   * Close the connection.
   *
   * @private
   */
  _closeConnection() {
    try {
      this._driver.close();
    } catch(e) {
      // do nothing
    }

    // release the client
    this._driver = undefined;
  }

  /**
   * Given a Neo4j configuration object returned by Neo4j, create a valid HTTP/S Url.
   *
   * @param {object} configuration Neo4j configuration
   * @returns {string}
   * @throws {LkError} if not possible
   * @private
   */
  _createHTTPUrl(configuration) {
    const isHTTPEnabled = Utils.hasValue(configuration['dbms.connector.http.enabled'])
      ? configuration['dbms.connector.http.enabled'] === 'true'
      : false;
    const isHTTPSEnabled = Utils.hasValue(configuration['dbms.connector.https.enabled'])
      ? configuration['dbms.connector.https.enabled'] === 'true'
      : false;

    // In some version of Neo4j it's "listen_address", in others just "address"
    const httpPortConfigurationValue = configuration['dbms.connector.http.listen_address'] ||
      configuration['dbms.connector.http.address'];

    const httpPort = Utils.hasValue(httpPortConfigurationValue)
      ? httpPortConfigurationValue.split(':')[1]
      : '7474'; // default Neo4j HTTP port

    const httpsPortConfigurationValue = configuration['dbms.connector.https.listen_address'] ||
      configuration['dbms.connector.https.address'];
    const httpsPort = Utils.hasValue(httpsPortConfigurationValue)
      ? httpsPortConfigurationValue.split(':')[1]
      : '7473'; // default Neo4j HTTPS port

    if (isHTTPEnabled || isHTTPSEnabled) {
      const protocol = isHTTPEnabled ? 'http' : 'https';
      const port = isHTTPEnabled ? httpPort : httpsPort;
      return protocol + '://' + this._host + ':' + port;
    }

    throw Errors.business(
      'invalid_parameter',
      'HTTP or HTTPS has to be enabled even when using the Bolt protocol.'
    );
  }

  /**
   * Given a Neo4j configuration object returned by Neo4j, create a valid Bolt Url.
   *
   * @param {object} configuration
   * @returns {string}
   * @throws {LkError} if not possible
   * @private
   */
  _createBoltUrl(configuration) {
    const isBoltEnabled = Utils.hasValue(configuration['dbms.connector.bolt.enabled'])
      ? configuration['dbms.connector.bolt.enabled'] === 'true'
      : false;

    const boltPortConfigurationValue = configuration['dbms.connector.bolt.listen_address'] ||
      configuration['dbms.connector.bolt.address'];
    const boltPort = Utils.hasValue(boltPortConfigurationValue)
      ? boltPortConfigurationValue.split(':')[1]
      : '7687'; // default Neo4j Bolt port

    if (isBoltEnabled) {
      return 'bolt://' + this._host + ':' + boltPort;
    }

    throw Errors.business(
      'invalid_parameter',
      'Bolt has to be enabled to use the Neo4j Bolt connector.'
    );
  }

  /**
   * Connect to the remote server using Bolt.
   *
   * @returns {Bluebird<string>} resolved with the SemVer version of the remote server
   */
  _connect() {
    this._driver = neo4j.driver(this._boltUrl, this._authToken,
      {maxTransactionRetryTime: this._maxTransactionRetryTime});

    return new Promise((resolve, reject) => {
      this._driver.onCompleted = resolve;

      this._driver.onError = error => {
        this._closeConnection();

        if (error.code === 'Neo.ClientError.Security.Unauthorized') {
          // fail for wrong credentials
          reject(Errors.business(
            'invalid_parameter',
            'Please check the Neo4j username and password in the configuration.'
          ));
        } else {
          // fail for every other error
          reject(Errors.technical(
            'critical',
            `Cannot connect to the Neo4j server (${this.getGraphOption('url')}): ` +
            `${error.code}, ${error.message}`
          ));
        }
      };
    }).then(() => {
      return this.$queryJmx(
        'org.neo4j', 'instance=kernel#0,name=Kernel', 'KernelVersion'
      ).then(kernelVersion => {
        // kernelVersion is in the following format:
        // "neo4j-kernel, version: 3.3.0,5b700972242a5ec3e0140261120f2845fb3520ad"
        const match = kernelVersion.match(/\d+\.\d+.\d+/);
        if (Utils.noValue(match)) {
          return Errors.technical('critical',
            'Cannot get Neo4j version. KernelVersion is: ' + kernelVersion, true);
        }

        return match[0];
      });
    });
  }

  /**
   * Connect to the remote server.
   *
   * @returns {Bluebird<string>} resolved with the SemVer version of the remote server
   */
  $connect() {
    // In this connector we have to connect via both Bolt and HTTP/S
    // We can start from any of them, we retrieve the configuration and test the other
    const firstBolt = Utils.hasValue(this._boltUrl);

    return Promise.resolve().then(() => {
      if (firstBolt) {
        // we connect over Bolt
        return this._connect();
      } else {
        // we connect over HTTP/S
        return super.$connect();
      }
    }).then(() => {
      if (firstBolt) {
        // we get the configuration over Bolt
        return this.$queryJmx('org.neo4j', 'instance=kernel#0,name=Configuration');
      } else {
        // we get the configuration over HTTP/S
        return super.$queryJmx('org.neo4j', 'instance=kernel#0,name=Configuration');
      }
    }).then(configuration => {
      // after we got the configuration, we try to create the other protocol url and connect with it
      if (firstBolt) {
        this.$httpUrl = this._createHTTPUrl(configuration);
        // we connect over HTTP/S
        return super.$connect();
      } else {
        this._boltUrl = this._createBoltUrl(configuration);
        // we connect over Bolt
        return this._connect();
      }
    });
  }

  /**
   * Encode a property value from Neo4j.
   *
   * @param {any} rawProperty
   * @private
   * @returns {any}
   */
  _encodeProperty(rawProperty) {
    if (Utils.hasValue(rawProperty.inSafeRange)) { // it's an Integer
      // if it's a safe range integer we convert it to a number, otherwise to a string
      return rawProperty.inSafeRange() ? rawProperty.toInt() : rawProperty.toString();
    } else if (Array.isArray(rawProperty)) {
      return _.map(rawProperty, this._encodeProperty.bind(this));
    }

    // it's a literal value
    return rawProperty;
  }

  /**
   * Encode a path response from Neo4j in a valid alternation of LkNodes and LkEdges.
   * This format was chosen to match the behaviour of the HTTP connector where we cannot find out,
   * a priori, if the response is an actual Path or just an alternation of LkNodes and LkEdges.
   *
   * @param {any} rawField
   * @private
   * @returns {any}
   */
  _encodePath(rawField) {
    const result = [];

    for (let i = 0; i < rawField.segments.length; i++) {
      result.push(this._encodeNode(rawField.segments[i].start));
      result.push(this._encodeEdge(rawField.segments[i].relationship));
    }

    result.push(this._encodeNode(rawField.segments[rawField.segments.length - 1].end));

    return result;
  }

  /**
   * Encode a node response from Neo4j in a valid LkNode.
   *
   * @param {any} rawField
   * @private
   * @returns {any}
   */
  _encodeNode(rawField) {
    return {
      id: rawField.identity.toString(),
      categories: rawField.labels.sort(), // node categories are always sorted in an LkNode
      data: _.mapValues(rawField.properties, this._encodeProperty.bind(this))
    };
  }

  /**
   * Encode an edge response from Neo4j in a valid LkEdge.
   *
   * @param {any} rawField
   * @private
   * @returns {any}
   */
  _encodeEdge(rawField) {
    return {
      id: rawField.identity.toString(),
      source: rawField.start.toString(),
      target: rawField.end.toString(),
      type: rawField.type,
      data: _.mapValues(rawField.properties, this._encodeProperty.bind(this))
    };
  }

  /**
   * Encode a raw field response from Neo4j in a valid response for Linkurious
   * (an LkNode an LkEdge, literal values or an array of these).
   *
   * Add every node and edge to `nodesById` and `edgesById`.
   * Return the content of the node/edge to be consistent with the HTTP response.
   *
   * @param {any}                 rawField
   * @param {Map<string, LkNode>} nodesById
   * @param {Map<string, LkEdge>} edgesById
   * @private
   * @returns {any}
   */
  _encodeBoltResponseField(rawField, nodesById, edgesById) {
    // for every field (a Node, an Edge or a literal value)
    // we convert it to our internal format (LkNode, LkEdge or literal value)
    // Ids, represented in Neo4j as 64bit unsigned int, are represented here as strings
    if (Utils.noValue(rawField)) {
      return rawField;
    } else if (Utils.hasValue(rawField.labels) && Utils.hasValue(rawField.identity)) { // it's a Node
      const node = this._encodeNode(rawField);
      nodesById.set(node.id, node);
      return node.data;
    } else if (Utils.hasValue(rawField.type) && Utils.hasValue(rawField.identity)) { // it's an Edge
      const edge = this._encodeEdge(rawField);
      edgesById.set(edge.id, edge);
      return edge.data;
    } else if (Utils.hasValue(rawField.segments)) { // it's a Path
      const path = this._encodePath(rawField);
      path.forEach(item => {
        if (Utils.hasValue(item.categories)) { // it's a Node
          nodesById.set(item.id, item);
        } else {
          edgesById.set(item.id, item);
        }
      });
      return path.map(item => item.data);
    } else if (Utils.hasValue(rawField.inSafeRange)) { // it's an Integer
      // if it's a safe range integer we convert it to a number, otherwise to a string
      return rawField.inSafeRange() ? rawField.toInt() : rawField.toString();
    } else if (Array.isArray(rawField)) {
      return _.map(rawField, innerRawField => {
        return this._encodeBoltResponseField(innerRawField, nodesById, edgesById);
      });
    } else if (Utils.isObject(rawField)) {
      return _.mapValues(rawField, innerRawField => {
        return this._encodeBoltResponseField(innerRawField, nodesById, edgesById);
      });
    }

    // it's a literal value
    return rawField;
  }

  /**
   * Encode a record from Neo4j in a valid response for Linkurious.
   *
   * @param {any} record
   * @private
   * @returns {{nodes: LkNode[], edges: LkEdge[], rows: any[]}}
   */
  _encodeBoltResponseRecord(record) {
    const nodesById = new Map();
    const edgesById = new Map();
    const rows = record._fields.map(
      field => this._encodeBoltResponseField.call(this, field, nodesById, edgesById)
    );

    return {
      nodes: Array.from(nodesById.values()),
      edges: Array.from(edgesById.values()),
      rows: rows
    };
  }

  /**
   * Execute a cypher query on Neo4j.
   *
   * Note that this function is not meant for user queries.
   * We don't enforce a limit or check if the query contains write statements.
   * Use $safeCypherQueryStream instead.
   *
   * @param {string}  query        The graph query
   * @param {object}  [parameters] The graph query parameters
   * @param {boolean} [canWrite]   Whether the query is allowed to alter the data
   * @param {boolean} [ignoreSlow] Don't log slow requests
   * @returns {Bluebird<{keys: string[], results: Array<{nodes: LkNode[], edges: LkEdge[], rows: any[]}>}>}
   */
  $doCypherQuery(query, parameters, canWrite, ignoreSlow) {
    return this._doCypherQuery(query, parameters, canWrite, ignoreSlow).then(result => {
      // if no record is found, we don't return anything, including the keys
      if (Utils.noValue(result.records[0])) {
        return {
          keys: [],
          results: []
        };
      }

      return {
        keys: result.records[0].keys,
        results: result.records.map(
          record => this._encodeBoltResponseRecord.call(this, record))
      };
    });
  }

  /**
   * Execute a cypher query on Neo4j.
   *
   * @param {string}  query
   * @param {object}  [parameters]
   * @param {boolean} [canWrite]
   * @param {boolean} [ignoreSlow] Don't log slow requests
   * @returns {Bluebird<{records: any[], summary: object}>}
   * @private
   */
  _doCypherQuery(query, parameters, canWrite, ignoreSlow) {
    if (!this._driver) {
      return Errors.technical('graph_unreachable', 'Cannot connect to the Neo4j server.', true);
    }

    const session = this._driver.session();
    // we select the right endpoint for Causal Clustering
    // (write transactions will only be forwarded to a Core Neo4j instance)
    const getTransaction = canWrite
      ? session.writeTransaction.bind(session)
      : session.readTransaction.bind(session);

    const t0 = Date.now();
    return Promise.resolve().then(() => { // We wrap in a Bluebird promise
      return getTransaction(transaction => transaction.run(query, parameters));
    }).then(results => {
      session.close();
      return results;
    }).catch(error => {
      //const isBadGraphRequest = Utils.hasValue(error.code) && error.code.includes('SyntaxError');
      const errorMessage = 'Neo4j (Bolt) wasn\'t able to execute the query: ' + error.message;
      return Errors.technical('critical', errorMessage, true);
    }).finally(() => {
      if (ignoreSlow) { return; }
      Utils.logSlow(t0, SLOW_QUERY_THRESHOLD, 'Query (Bolt): ' + query, Log);
    });
  }

  /**
   * Query JMX management data of Neo4j by domain, name and key.
   *
   * @param {string} domain
   * @param {string} name
   * @param {string} [key]
   * @returns {Bluebird<any>}
   */
  $queryJmx(domain, name, key) {
    return this.$doCypherQuery(
      `CALL dbms.queryJmx("${domain}:${name}")`
    ).then(response => {
      if (Utils.hasValue(key)) {
        return Utils.safeGet(response, `results.0.rows.2.${key}.value`);
      } else {
        return _.mapValues(Utils.safeGet(response, 'results.0.rows.2'), 'value');
      }
    });
  }

  // TODO #995 Implement stream backpressure in the Neo4j Bolt DAO
  // We currently use the HTTP/S connector to stream

  // /**
  //  * Execute a cypher query on Neo4j and return a stream as a result.
  //  * The query is checked to be read-only if `canWrite` is false and to always return.
  //  * If `limit` is defined, the limit of the Cypher query is modified to not be higher
  //  * than `limit`.
  //  *
  //  * @param {string}  query        The graph query
  //  * @param {object}  [parameters] The graph query parameters
  //  * @param {boolean} [canWrite]   Whether the query is allowed to alter the data
  //  * @param {number}  [limit]      Maximum number of matched subgraphs
  //  * @returns {Bluebird<{keys: string[], results: Readable<any[]>}>}
  //  */
  // $safeCypherQueryStream(query, parameters, canWrite, limit) {
  //   if (!this._driver) {
  //     return Errors.technical('graph_unreachable', 'Cannot connect to the Neo4j server.', true);
  //   }
  //
  //   CypherUtils.checkQuery(query, canWrite);
  //
  //   if (Utils.hasValue(limit)) {
  //     query = CypherUtils.enforceLimit(query, limit).query;
  //   }
  //
  //   // we select the right endpoint for Causal Clustering
  //   // (write transactions will only be forwarded to a Core Neo4j instance)
  //   const session = this._driver.session(canWrite ? 'WRITE' : 'READ');
  //
  //   return new Promise((resolve, reject) => {
  //     let resultStream;
  //
  //     session.run(query, parameters)
  //       .subscribe({
  //         onNext: record => {
  //           // we got a record
  //           if (Utils.noValue(resultStream)) {
  //             // the first record, so we create a stream
  //             resultStream = new Readable({
  //               objectMode: true,
  //               highWaterMark: 10000,
  //               read() {}
  //             });
  //
  //             // we register the abort function to close the session
  //             resultStream.abort = () => {
  //               session.close();
  //               // _TODO_ copy behaviour from request.js
  //             };
  //
  //             // we resolve with it and with the keys
  //             resolve({
  //               keys: record.keys,
  //               results: /**@type {Readable<any[]>}*/ (resultStream)
  //             });
  //           }
  //
  //           // we push the actual row (encoded already for Linkurious)
  //           resultStream.push(_.map((/**@type {any}*/ (record))._fields,
  //             field => this._encodeBoltResponseField.call(this, field)));
  //         },
  //         onCompleted: () => {
  //           // no more records
  //           session.close(() => {
  //             if (Utils.noValue(resultStream)) {
  //               // we got 0 records in total, so we resolve with an empty readable stream
  //               resultStream = new Readable({objectMode: true, read() {}});
  //
  //               // _TODO_ find a way to populate keys even onCompleted
  //               resolve({
  //                 keys: [],
  //                 results: /**@type {Readable<any[]>}*/ (resultStream)
  //               });
  //             } else {
  //
  //               // we close the stream
  //               resultStream.push(null);
  //             }
  //
  //           });
  //         },
  //         onError: error => {
  //           if (Utils.noValue(resultStream)) {
  //             reject(error);
  //           } else {
  //             // _TODO_ forward error to resultStream
  //           }
  //         }
  //       });
  //   });
  // }
}

module.exports = Neo4jBoltConnector;
