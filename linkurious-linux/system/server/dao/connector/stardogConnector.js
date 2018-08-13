/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-07-26.
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../../services');
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();

// locals
const SparqlConnector = require('./sparqlConnector');
const LkRequest = require('../../lib/LkRequest');
const SparqlUtils = require('../utils/sparqlUtils');

class StardogConnector extends SparqlConnector {

  /**
   * @param {any} graphOptions   GraphDAO options
   * @param {any} [indexOptions] IndexDAO options (only if the type of the DAO is 'Index')
   * @constructor
   */
  constructor(graphOptions, indexOptions) {
    super(graphOptions, indexOptions);

    this.$url = this.$url + '/' + encodeURIComponent(this.getGraphOption('repository'));

    this._prefixToURI = new Map();

    this._request = new LkRequest({
      baseUrl: this.$url,
      auth: this.getGraphOption('user') ? {
        user: this.getGraphOption('user'),
        password: this.getGraphOption('password')
      } : undefined,
      strictSSL: !this.getGraphOption('allowSelfSigned'),
      pool: {maxSockets: 5}
    });
  }

  /**
   * Detect the current store ID.
   *
   * A store ID is the name of the current database (if the graph server is multi-tenant)
   * otherwise the vendor name.
   *
   * @returns {Bluebird<string>}
   */
  $getStoreId() {
    return Promise.resolve(this.getGraphOption('repository'));
  }

  /**
   * Connect to the remote server.
   *
   * @returns {Bluebird<string>} resolved with the SemVer version of the remote server
   */
  $connect() {
    return this._request.get('/size',
      {timeout: this.CONNECT_TIMEOUT}, [200, 404, 401, 403]
    ).catch(e => {
      return Errors.technical(
        'critical',
        'Could not connect to the Stardog server (' + e.message + ').',
        true
      );

    }).then(existR => {
      // if the repository does not exist
      if (existR.statusCode === 404) {
        return Errors.technical('critical', 'The repository was not found.', true);
      } else if (existR.statusCode === 401) {
        return Errors.business('invalid_parameter', 'Credentials for Stardog are not valid.', true);
      } else if (existR.statusCode === 403) {
        return Errors.business(
          'invalid_parameter',
          'Configured Stardog user is not authorized to perform this action.',
          true
        );
      }
    }).then(() => {
      // retrieve the namespaces
      const getNamespaceURL = '/admin/databases/' +
        encodeURIComponent(this.getGraphOption('repository')) + '/options';

      // baseUrl by default is the repository Url. Here we need the Stardog Url
      return this._request.put(
        getNamespaceURL,
        {baseUrl: this.getGraphOption('url'), body: {'database.namespaces': ''}, json: true},
        [200]
      ).then(nsR => {
        const namespaceArray = nsR.body['database.namespaces'];

        this._prefixToURI.clear();
        _.forEach(namespaceArray, ns => {
          // format of `ns` is 'rdf=http://www.w3.org/1999/02/22-rdf-syntax-ns#'
          const s = Utils.splitOnce(ns, '=');
          this._prefixToURI.set(s[0], s[1]);
        });

        this._utils = new SparqlUtils(this._prefixToURI, this.$defaultNamespace);

        if (this._utils.isPrefixNotation(this.$categoryPredicate)) {
          // resolve the category predicate to a full URI
          this.$categoryPredicate = this._utils.shortNameToFullURI(this.$categoryPredicate);
        }

        // we set the category predicate after we resolved the full URI
        this._utils.categoryPredicate = this.$categoryPredicate;

        if (!this._utils.isURI(this.$categoryPredicate)) {
          return Errors.business(
            'invalid_parameter',
            '"' + this.$categoryPredicate +
            '" is not a valid category predicate (must be a URI wrapped in angle brackets).',
            true
          );
        }
      });
    }).then(() => {
      // baseUrl by default is the repository Url. Here we need the Stardog Url
      return this._request.get(
        '/admin/status', {baseUrl: this.getGraphOption('url'), json: true}, [200]
      ).then(versionR => {
        return versionR.body['dbms.version'].value;
      });
    });
  }

  /**
   * Check if the remote server is alive.
   *
   * @returns {Bluebird<void>}
   */
  $checkUp() {
    return this._request.get('/size', undefined, [200]).return();
  }

  /**
   * Get the LkRequest object for direct access to the HTTP endpoint.
   *
   * @type {LkRequest}
   */
  get $request() {
    return this._request;
  }

  /**
   * Get the mapping from prefixes to namespaces.
   *
   * e.g.:
   * 'foaf' -> 'http://xmlns.com/foaf/0.1/'
   * 'rdf'  -> 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
   *
   * @type {Map<string, string>}
   */
  get $prefixToURI() {
    return this._prefixToURI;
  }

  /**
   * Check that a given statement belongs to the triple store.
   *
   * @param {string} subject
   * @param {string} predicate
   * @param {string} object
   * @returns {Bluebird<boolean>}
   */
  $checkStatement(subject, predicate, object) {
    // a predicate cannot be a blank node
    [subject, object] =
      this._utils.wrapBlankNodesInAngleBrackets([subject, object]);
    return this.$doSparqlQuery(
      `SELECT ?a WHERE { BIND(EXISTS{${subject} ${predicate} ${object}} as ?a)}`
    ).then(result => {
      return this._utils.revertLiteral(result[0][0]);
    });
  }

  /**
   * Return all the statements in the triple store that have subject in `subjects`.
   *
   * @param {string[]} subjects
   * @returns {Bluebird<string[][]>}
   */
  $getStatementsBySubjects(subjects) {
    subjects = this._utils.wrapBlankNodesInAngleBrackets(subjects);
    const joinedSubjects = subjects.join(' ');
    return this.$doSparqlQuery(
      'SELECT ?s ?p ?o WHERE { ?s ?p ?o . VALUES ?s { ' + joinedSubjects + ' } }'
    );
  }

  /**
   * Return all the statements in the triple store that have object in `objects`.
   *
   * @param {string[]} objects
   * @returns {Bluebird<string[][]>}
   */
  $getStatementsByObjects(objects) {
    objects = this._utils.wrapBlankNodesInAngleBrackets(objects);
    const joinedObjects = objects.join(' ');
    return this.$doSparqlQuery(
      'SELECT ?s ?p ?o WHERE { ?s ?p ?o . VALUES ?o { ' + joinedObjects + ' } }'
    );
  }

  /**
   * Delete all the statements in the triple store that:
   * - have `subject` as subject, or any if undefined
   * - have `predicate` as predicate, or any if undefined
   * - have `object` as object, or any if undefined
   *
   * Return true if at least a statement was deleted.
   *
   * @param {string} [subject]
   * @param {string} [predicate]
   * @param {string} [object]
   * @returns {Bluebird<boolean>}
   */
  $deleteStatements(subject, predicate, object) {
    return Promise.resolve().then(() => {
      let values = '';

      if (Utils.hasValue(subject)) {
        [subject] = this._utils.wrapBlankNodesInAngleBrackets([subject]);
        values += `VALUES ?s { ${subject} } . `;
      }

      if (Utils.hasValue(predicate)) {
        values += `VALUES ?p { ${predicate} } . `;
      }

      if (Utils.hasValue(object)) {
        [object] = this._utils.wrapBlankNodesInAngleBrackets([object]);
        values += `VALUES ?o { ${object} } . `;
      }

      return this.$doSparqlQuery(
        `SELECT ?s ?p ?o WHERE { ?s ?p ?o . ${values} }`, undefined, false).then(statements => {
        if (statements.length === 0) {
          return false;
        }

        return this.$doSparqlQuery(
          `DELETE {?s ?p ?o} WHERE { ?s ?p ?o . ${values} }`, undefined, true).return(true);
      });
    });
  }

  /**
   * Delete all the statements in the triple store.
   *
   * @returns {Bluebird<void>}
   */
  $deleteAllStatements() {
    return this._underTransaction(tid => {
      return this._request.post(
        '/' + tid + '/clear', undefined, [200]
      );
    });
  }

  /**
   * Add `statements` to the triple store.
   *
   * @param {string[][]} statements
   * @returns {Bluebird<void>}
   */
  $addStatements(statements) {
    const nTriples = _.map(statements, statement => statement.join(' ') + ' .').join('\n');
    return this._underTransaction(tid => {
      return this._request.post(
        '/' + tid + '/add',
        {
          body: nTriples
        }, [200]
      );
    }).return();
  }

  /**
   * Execute a sparql query on the triple store using the '/update' or the '/query' endpoint.
   *
   * @param {string}  query
   * @param {number}  [timeout]  Milliseconds to wait before it fails
   * @param {string}  endpoint   '/update' or '/query'
   * @returns {Bluebird<string[][]>}
   * @private
   */
  _doSparqlQuery(query, timeout, endpoint) {
    return this._request.post(endpoint,
      {
        form: {query: query},
        json: true,
        headers: {'Accept': 'application/sparql-results+json'},
        timeout: timeout
      }
    ).then(response => {
      if (response.statusCode !== 200) {
        const stardogErrorMessage = response.body && response.body.message ||
          JSON.stringify(response.body);
        const isBadGraphRequest = stardogErrorMessage.includes('expecting one of');

        const errorMessage = '_doSparqlQuery wasn\'t able to execute ' +
          'the query on Stardog: ' + response.statusCode + ' ' + stardogErrorMessage;

        if (isBadGraphRequest) {
          return Errors.business('bad_graph_request', errorMessage, true);
        } else {
          return Errors.technical('critical', errorMessage, true);
        }
      }

      if (Utils.noValue(response.body) || Utils.noValue(response.body.head) ||
        Utils.noValue(response.body.head.vars) || Utils.noValue(response.body.results) ||
        Utils.noValue(response.body.results.bindings)) {
        // this is not an error, but un update query that doesn't return anything
        return [];
      }

      const head = response.body.head.vars;
      const results = response.body.results.bindings;

      return _.map(results, rawStatement => {
        const statement = [];
        for (let i = 0; i < head.length; i++) {
          // we process each entry s.t. we comply with the output format defined in sparqlConnector
          const rawEntry = rawStatement[head[i]];

          if (Utils.noValue(rawEntry)) {
            // no entry for this column/row
            statement.push(undefined);
            continue;
          }

          if (rawEntry.type === 'uri') {
            statement.push('<' + rawEntry.value + '>');
          } else if (rawEntry.type === 'bnode') {
            statement.push('_:' + rawEntry.value);
          } else { // rawEntry.type === 'literal'
            let literalValue = JSON.stringify(rawEntry.value);
            if (Utils.hasValue(rawEntry.datatype)) {
              literalValue += '^^<' + rawEntry.datatype + '>';
            }
            statement.push(literalValue);
          }
        }

        return statement;
      });
    });
  }

  /**
   * Execute a sparql query on the triple store.
   *
   * @param {string}  query
   * @param {number}  [timeout]  Milliseconds to wait before it fails
   * @param {boolean} [canWrite] Whether the query can modify the data
   * @returns {Bluebird<string[][]>}
   */
  $doSparqlQuery(query, timeout, canWrite) {
    // Stardog handle write permissions for us
    // but it doesn't like that we send read query to the update endpoint
    // so we first try a simple query
    return this._doSparqlQuery(query, timeout, '/query').catch(err => {
      if (canWrite && err.message && err.message.includes('update query')) {
        return this._doSparqlQuery(query, timeout, '/update');
      }

      throw err;
    });
  }

  /**
   * Execute `func` under a transaction:
   * - commit the transaction if `func` resolves
   * - rollback the transaction if `func` rejects
   *
   * This function resolves with the same value resolved by `func`.
   * `func` will be invoked with 1 parameter, the transaction ID.
   *
   * @param {function(string): Bluebird<any>} func
   * @returns {Bluebird<any>}
   */
  _underTransaction(func) {
    return this._request.post(
      '/transaction/begin', undefined, [200]
    ).then(response => {

      const tid = response.body;

      return func(tid).then(value => {
        return this._request.post(
          '/transaction/commit/' + tid, undefined, [200]
        ).return(value);
      }).catch(e => {
        return this._request.post(
          '/transaction/rollback/' + tid, undefined, [200]
        ).catch(() => {}).then(() => {
          throw e;
        });
      });
    });
  }
}

module.exports = StardogConnector;
