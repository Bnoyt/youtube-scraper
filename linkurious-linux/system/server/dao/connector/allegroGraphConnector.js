/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-07-26.
*/
'use strict';

// internal libs
const crypto = require('crypto');

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

class AllegroGraphConnector extends SparqlConnector {

  /**
   * @param {any} graphOptions   GraphDAO options
   * @param {any} [indexOptions] IndexDAO options (only if the type of the DAO is 'Index')
   * @constructor
   */
  constructor(graphOptions, indexOptions) {
    super(graphOptions, indexOptions);

    this.$url = this.$url + '/repositories/' +
      encodeURIComponent(this.getGraphOption('repository'));

    this._prefixToURI = new Map();

    this._request = new LkRequest({
      baseUrl: this.$url,
      auth: this.getGraphOption('user') ? {
        user: this.getGraphOption('user'),
        password: this.getGraphOption('password')
      } : undefined,
      strictSSL: !this.getGraphOption('allowSelfSigned'),
      json: true,
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
    // Too late for allegroGraph, the Store ID is not human readable.
    let storeIdComponents = [this.$url, this.$defaultNamespace, this.$categoryPredicate];
    let prefixURIPairs = [];

    this.$prefixToURI.forEach((uri, prefix) => {
      prefixURIPairs.push([prefix, uri]);
    });

    prefixURIPairs = _.sortBy(prefixURIPairs, o => o[0]);

    storeIdComponents = storeIdComponents.concat(prefixURIPairs);

    const storeId = crypto.createHash('md5').update(JSON.stringify(storeIdComponents))
      .digest('hex')
      .slice(0, 8);

    return Promise.resolve(storeId);
  }

  /**
   * Connect to the remote server.
   *
   * @returns {Bluebird<string>} resolved with the SemVer version of the remote server
   */
  $connect() {
    return this._request.get('/size', {timeout: this.CONNECT_TIMEOUT}, [200, 404, 401]).catch(e => {
      return Errors.technical(
        'critical',
        'Could not connect to the AllegroGraph server (' + e.message + ').',
        true
      );

    }).then(existR => {
      // if the repository does not exist
      if (existR.statusCode === 404) {
        // and I can create it
        if (this.getGraphOption('create')) {
          // create it
          return this._request.put('', undefined, [204]);
        } else {
          return Errors.technical('critical', 'The repository was not found.', true);
        }
      } else if (existR.statusCode === 401) {
        return Errors.business('invalid_parameter',
          'Credentials for AllegroGraph are not valid.', true);
      }
    }).then(() => {
      // retrieve the namespaces
      return this._request.get('/namespaces', undefined, [200]).then(nsR => {

        this._prefixToURI.clear();

        for (let i = 0; i < nsR.body.length; i++) {
          this._prefixToURI.set(nsR.body[i].prefix, nsR.body[i].namespace);
        }

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
      // baseUrl by default is the repository Url. Here we need the AllegroGraph Url
      return this._request.get('/version', {baseUrl: this.getGraphOption('url')}, [200])
        .get('body');
    });
  }

  /**
   * Check if the remote server is alive.
   *
   * @returns {Bluebird<void>}
   */
  $checkUp() {
    return this._request.get('/size', [200]).return();
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
    return this.$getStatements(
      [subject], [predicate], [object]
    ).then(result => {
      return result.length > 0;
    });
  }

  /**
   * Return all the statements in the triple store that have subject in `subjects`.
   *
   * @param {string[]} subjects
   * @returns {Bluebird<string[][]>}
   */
  $getStatementsBySubjects(subjects) {
    return this.$getStatements(subjects);
  }

  /**
   * Return all the statements in the triple store that have object in `objects`.
   *
   * @param {string[]} objects
   * @returns {Bluebird<string[][]>}
   */
  $getStatementsByObjects(objects) {
    return this.$getStatements(undefined, undefined, objects);
  }

  /**
   * Return all the statements in the triple store that:
   * - have subject in `subjects`, or any if undefined
   * - have predicate in `predicates`, or any if undefined
   * - have object in `objects`, or any if undefined
   *
   * @param {string[]} [subjects]
   * @param {string[]} [predicates]
   * @param {string[]} [objects]
   * @returns {Bluebird<string[][]>}
   */
  $getStatements(subjects, predicates, objects) {
    // An empty array means none, undefined means all.
    if ((Utils.hasValue(subjects) && subjects.length === 0) ||
      (Utils.hasValue(predicates) && predicates.length === 0) ||
      (Utils.hasValue(objects) && objects.length === 0)) {
      return Promise.resolve([]);
    }

    const form = {};
    if (Utils.hasValue(subjects)) {
      form.subj = subjects;
    }
    if (Utils.hasValue(predicates)) {
      form.pred = predicates;
    }
    if (Utils.hasValue(objects)) {
      form.obj = objects;
    }

    return this._request.post('/statements/query',
      {form, qsStringifyOptions: {indices: false}}, [200]).get('body');
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
    return this._request.delete('/statements',
      {qs: {subj: subject, pred: predicate, obj: object}}, [200]).then(response => {

      return response.body > 0; // response.body is the number of deleted statements
    });
  }

  /**
   * Delete all the statements in the triple store.
   *
   * @returns {Bluebird<void>}
   */
  $deleteAllStatements() {
    return this._request.delete('/statements', undefined, [200]).return();
  }

  /**
   * Add `statements` to the triple store.
   *
   * @param {string[][]} statements
   * @returns {Bluebird<void>}
   */
  $addStatements(statements) {
    return this._request.post('/statements', {body: statements}, [204]).return();
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
    // AllegroGraph handle write permissions for us. Only post requests can modify the data
    let request = this._request.get.bind(this._request);
    if (canWrite) {
      request = this._request.post.bind(this._request);
    }

    return request('', {qs: {query: query}, timeout: timeout})
      .then(response => {
        if (response.statusCode !== 200) {
          const isBadGraphRequest = response.body && response.body.includes('MALFORMED QUERY');

          const errorMessage = '$doSparqlQuery wasn\'t able to execute ' +
            'the query on AllegroGraph: ' + response.statusCode + ' ' + response.body;

          if (isBadGraphRequest) {
            return Errors.business('bad_graph_request', errorMessage, true);
          } else {
            return Errors.technical('critical', errorMessage, true);
          }
        }

        return response.body.values;
      });
  }
}

module.exports = AllegroGraphConnector;
