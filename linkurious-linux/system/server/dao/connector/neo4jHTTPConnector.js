/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-10-09.
 */
'use strict';

// external libs
const _ = require('lodash');
const through = require('through');

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const Log = LKE.getLogger(__filename);

// our libs
const JsonStream = require('../../../lib/JsonStream');

// locals
const Neo4jConnector = require('./neo4jConnector');
const LkRequest = require('../../lib/LkRequest');
const CypherUtils = require('./../utils/cypherUtils');

const SLOW_QUERY_THRESHOLD = LKE.isTestMode() ? 50 : 1000;

class Neo4jHTTPConnector extends Neo4jConnector {

  /**
   * @param {any} graphOptions   GraphDAO options
   * @param {any} [indexOptions] IndexDAO options (only if the type of the DAO is 'Index')
   * @constructor
   */
  constructor(graphOptions, indexOptions) {
    super(graphOptions, indexOptions);

    this.$httpUrl = Utils.normalizeUrl(this.getGraphOption('url'));

    this.$request = new LkRequest({
      strictSSL: !this.getGraphOption('allowSelfSigned'),
      auth: this.getGraphOption('user') ? {
        user: this.getGraphOption('user'),
        password: this.getGraphOption('password')
      } : undefined,
      proxy: this.getGraphOption('proxy'),
      pool: {maxSockets: 5},
      json: true,
      gzip: true
    });
  }

  /**
   * Connect to the remote server.
   *
   * @returns {Bluebird<string>} resolved with the SemVer version of the remote server
   */
  $connect() {
    return this.$request.get(this.$httpUrl + '/db/data', {}, [200, 401]).then(response => {
      if (response.statusCode === 401) {
        return Errors.business(
          'invalid_parameter',
          'Please check the Neo4j username and password in the configuration.',
          true
        );
      }

      // check version
      this.version = response.body['neo4j_version'];
      if (Utils.noValue(this.version)) {
        return Errors.technical('critical', 'Cannot get Neo4j version.', true);
      }

      return this.version;
    });
  }

  /**
   * Encode a record from Neo4j in a valid response for Linkurious.
   *
   * @param {any} record
   * @private
   * @returns {{nodes: LkNode[], edges: LkEdge[], rows: any[]}}
   */
  _encodeHTTPResponseRecord(record) {
    // for every node and edge in the graph response we parse it and set it in a map (for nodes or edges)
    // we need the graph response because the row response doesn't contain all the info we need
    // (like the edge source and target or the labels)

    const nodesById = new Map();
    for (let i = 0; i < record.graph.nodes.length; i++) {
      const node = record.graph.nodes[i];
      if (node.deleted) {
        // node was deleted and a deleted node doesn't have labels and properties
        node.labels = [];
      }
      // node.id (as sent by Neo4j) is a string in HTTP responses
      nodesById.set(node.id, {
        id: node.id,
        categories: node.labels.sort(),
        data: node.properties
      });
    }
    const edgesById = new Map();
    for (let i = 0; i < record.graph.relationships.length; i++) {
      // edge.id (as sent by Neo4j) is a string in HTTP responses
      const edge = record.graph.relationships[i];
      edgesById.set(edge.id, {
        id: edge.id,
        source: edge.startNode,
        target: edge.endNode,
        type: edge.type,
        data: edge.properties
      });
    }

    return {
      nodes: Array.from(nodesById.values()),
      edges: Array.from(edgesById.values()),
      rows: record.row
    };
  }

  /**
   * @private
   */
  get _writeUrl() {
    return Utils.hasValue(this.getGraphOption('writeUrl'))
      ? Utils.normalizeUrl(this.getGraphOption('writeUrl'))
      : this.$httpUrl;
  }

  /**
   * Do an HTTP POST request toward Neo4j.
   *
   * Used to create a case insensitive Neo4j search index.
   *
   * @param {string}   url
   * @param {any}      parameters
   * @param {number[]} expectedStatusCode
   * @returns {Bluebird<IncomingMessage>}
   */
  $doHTTPPostRequest(url, parameters, expectedStatusCode) {
    return this.$request.post(url, {
      baseUrl: this.$httpUrl,
      body: parameters
    }, expectedStatusCode);
  }

  /**
   * Do an HTTP GET request toward Neo4j. Return the body of the response directly.
   *
   * Used to retrieve the simple schema before procedures were introduced.
   *
   * @param {string} url
   * @returns {Bluebird<any>}
   */
  $doHTTPGetRequest(url) {
    return this.$request.get(url, {
      baseUrl: this.$httpUrl
    }, [200]).get('body');
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
    const baseUrl = canWrite ? this._writeUrl : this.$httpUrl;

    const t0 = Date.now();
    return this.$request.post('/db/data/transaction/commit', {
      baseUrl: baseUrl,
      body: {
        statements: [{
          statement: query,
          parameters: parameters,
          resultDataContents: ['row', 'graph']
        }]
      }
    }, [200]).then(response => {
      if (Utils.hasValue(response.body.errors) && response.body.errors.length > 0) {
        const errorMessage = Utils.safeGet(response.body, 'errors.0.message');
        return Errors.technical(
          'critical',
          'Neo4j (HTTP) wasn\'t able to execute the query: ' + errorMessage,
          true
        );
      }

      // if no record is found, we don't return anything, including the keys
      if (
        Utils.noValue(response.body.results[0]) || Utils.noValue(response.body.results[0].data[0])
      ) {
        return {
          keys: [],
          results: []
        };
      }

      return {
        keys: response.body.results[0].columns,
        results: response.body.results[0].data.map(
          record => this._encodeHTTPResponseRecord(record))
      };
    }).finally(() => {
      if (ignoreSlow) { return; }
      Utils.logSlow(t0, SLOW_QUERY_THRESHOLD, 'Query (HTTP): ' + query, Log);
    });
  }

  /**
   * Execute `func` under a transaction.
   * `func` will be invoke with two arguments:
   *  - transactionURL
   *  - rollback function
   *
   * @param {boolean}                              canWrite
   * @param {function(string, any): Bluebird<any>} func
   * @returns {Bluebird<any>}
   */
  _underTransaction(canWrite, func) {
    const baseUrl = (canWrite ? this._writeUrl : this.$httpUrl);

    return this.$request.post('/db/data/transaction', {
      baseUrl: baseUrl,
      body: {
        statements: []
      }
    }, [201]).then(response => {
      const transactionURL = response.headers.location;

      if (!transactionURL) {
        return Errors.business('graph_request_timeout', 'Failed to start transaction.', true);
      }

      return func(transactionURL, () => {
        // rollback function
        return this.$request.delete('/db/data/transaction', {
          baseUrl: baseUrl
          // HTTP status code 405 occurs after the transaction timed out in Neo4j
        }, [200, 405]).catch(e => {
          Log.debug('Failed to delete transaction: ' + e.message);
        });
      });
    });
  }

  /**
   * Execute a cypher query against Neo4j for the only purpose to parse the list
   * of returned keys.
   *
   * @param {string}  query        The graph query
   * @param {object}  [parameters] The graph query parameters
   * @param {boolean} [canWrite]   Whether the query is allowed to alter the data
   * @returns {Bluebird<string[]>}
   * @private
   */
  _getQueryKeys(query, parameters, canWrite) {
    const baseUrl = (canWrite ? this._writeUrl : this.$httpUrl);

    // We need a cypher query that doesn't return any actual data only to get the columns
    const enforceLimitOutput = CypherUtils.enforceLimit(query, 0);
    const limitZeroQuery = enforceLimitOutput.query;
    const originalLimit = enforceLimitOutput.originalLimit;

    return this.$request.post('/db/data/transaction/commit', {
      baseUrl: baseUrl,
      body: {
        statements: [{
          statement: limitZeroQuery,
          parameters: parameters,
          resultDataContents: ['row']
        }]
      }
    }, [200]).then(response => {
      if (Utils.hasValue(response.body.errors) && response.body.errors.length > 0) {
        let errorMessage = Utils.safeGet(response.body, 'errors.0.message');

        errorMessage = errorMessage.replace(/\sLIMIT 0/gi, Utils.hasValue(originalLimit)
          ? ' LIMIT ' + originalLimit : '');

        return Errors.business(
          'bad_graph_request',
          'Neo4j wasn\'t able to execute the cypher query: ' + errorMessage, true
        );
      }

      return response.body.results[0].columns;
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
    const path = '/db/manage/server/jmx/domain/' + encodeURIComponent(domain) + '/' +
      encodeURIComponent(name);

    return this.$request.get(path, {
      baseUrl: this.$httpUrl
    }, [200]).then(response => {
      const items = _.fromPairs(
        Utils.safeGet(response.body, '0.attributes').map(i => [i.name, i.value])
      );

      if (Utils.noValue(key)) {
        return items;
      }

      if (Utils.noValue(items[key])) {
        return Errors.technical('critical', `Cannot get '${key}' (missing field)`, true);
      }

      return items[key];
    });
  }

  /**
   * Execute a cypher query on Neo4j and return a stream as a result.
   * The query is checked to be read-only if `canWrite` is false and to always return.
   * If `limit` is defined, the limit of the Cypher query is modified to not be higher
   * than `limit`.
   *
   * @param {string}  query        The graph query
   * @param {object}  [parameters] The graph query parameters
   * @param {boolean} [canWrite]   Whether the query is allowed to alter the data
   * @param {number}  [limit]      Maximum number of matched subgraphs
   * @returns {Bluebird<{keys: string[], results: Readable<{nodes: LkNode[], edges: LkEdge[], rows: any[]}>}>}
   */
  $safeCypherQueryStream(query, parameters, canWrite, limit) {
    CypherUtils.checkQuery(query, canWrite);

    if (Utils.hasValue(limit)) {
      query = CypherUtils.enforceLimit(query, limit).query;
    }

    return this._getQueryKeys(query, parameters, canWrite).then(keys => {
      return this._underTransaction(canWrite, (transactionUrl, rollback) => {

        // run the original query using the transaction URL (autocommit)
        const autoCommitUrl = transactionUrl + '/commit';

        // Stream request of the data
        return this.$request.getStream(autoCommitUrl, 'post', {
          body: {
            statements: [{
              statement: query,
              resultDataContents: ['row', 'graph']
            }]
          }
        }, [200]).then(readableStream => {
          readableStream.resume();

          // we register the abort function to both abort the HTTP request and to rollback
          // the transaction
          const abortRequestJs = readableStream.abort.bind(readableStream);
          readableStream.abort = () => {
            abortRequestJs();
            rollback();
          };

          const self = this;
          return {
            keys: keys,
            results: Utils.safePipe(
              readableStream,
              JsonStream.parse(['results', 0, 'data', '*']),
              through(
                function(record) {
                  this.queue(self._encodeHTTPResponseRecord(record));
                }
              )
            )
          };
        });
      });
    });
  }
}

module.exports = Neo4jHTTPConnector;
