/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-07-26.
 */
'use strict';

/* eslint no-unused-vars: 0 */ // abstract methods

// external libs
const Promise = require('bluebird');

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();

// locals
const Connector = require('./connector');

/**
 * Note:
 * This is the format of subjects, predicates and objects returned
 * by $getStatements and $doSparqlQuery:
 *
 * numbers: "\"1967\"^^<http://www.w3.org/2001/XMLSchema#integer>"
 * string : "\"The Matrix Reloaded\""
 * bnode  : "_:bFDBE1B15x2"
 * uri    : "<http://link.com>"
 */
class SparqlConnector extends Connector {

  /**
   * @param {any} graphOptions   GraphDAO options
   * @param {any} [indexOptions] IndexDAO options (only if the type of the DAO is 'Index')
   * @constructor
   */
  constructor(graphOptions, indexOptions) {
    super(graphOptions, indexOptions);

    this.$url = Utils.normalizeUrl(this.getGraphOption('url'));

    this.$defaultNamespace = this.getGraphOption('namespace', 'http://linkurio.us/');

    // resolution to a full URI of this.$categoryPredicate will occur inside the '$connect' method
    this.$categoryPredicate = this.getGraphOption(
      'categoryPredicate',
      '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'
    );
  }

  /**
   * Data that the connector will pass to the driver.
   *
   * @returns {Bluebird<any>}
   */
  $getConnectorData() {
    return Promise.resolve({
      prefixToURI: this.$prefixToURI,
      categoryPredicate: this.$categoryPredicate,
      defaultNamespace: this.$defaultNamespace
    });
  }

  /**
   * Delete all the statements in the triple store that match at least one of the rules in
   * `deleteArray`.
   *
   * A statement match a rule if:
   * - it has `subject` as subject, or any if undefined
   * - it has `predicate` as predicate, or any if undefined
   * - it has `object` as object, or any if undefined
   *
   * Return true if at least a statement was deleted.
   *
   * @param {Array<{subject?: string, predicate?: string, object?: string}>} deleteArray
   * @returns {Bluebird<boolean>}
   */
  $deleteMultipleStatements(deleteArray) {
    return Promise.map(deleteArray, rule => {
      return this.$deleteStatements(rule.subject, rule.predicate, rule.object);
    }).then(results => {
      return results.some(result => result === true);
    });
  }

  /**
   * Get the LkRequest object for direct access to the HTTP endpoint.
   *
   * @type {LkRequest}
   */
  get $request() {
    return Utils.NOT_IMPLEMENTED();
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
    return Utils.NOT_IMPLEMENTED();
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
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Return all the statements in the triple store that have subject in `subjects`.
   *
   * @param {string[]} subjects
   * @returns {Bluebird<string[][]>}
   */
  $getStatementsBySubjects(subjects) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Return all the statements in the triple store that have object in `objects`.
   *
   * @param {string[]} objects
   * @returns {Bluebird<string[][]>}
   */
  $getStatementsByObjects(objects) {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Return all the statements in the triple store that:
   * - have subject in `subjects`, or any if undefined
   * - have predicate in `predicates`, or any if undefined
   * - have object in `objects`, or any if undefined
   *
   * Implement only if the SparqlDriver doesn't support blank node labels.
   *
   * @param {string[]} [subjects]
   * @param {string[]} [predicates]
   * @param {string[]} [objects]
   * @returns {Bluebird<string[][]>}
   */
  $getStatements(subjects, predicates, objects) {
    return Utils.NOT_IMPLEMENTED();
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
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Delete all the statements in the triple store.
   *
   * @returns {Bluebird<void>}
   */
  $deleteAllStatements() {
    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * Add `statements` to the triple store.
   *
   * @param {string[][]} statements
   * @returns {Bluebird<void>}
   */
  $addStatements(statements) {
    return Utils.NOT_IMPLEMENTED();
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
    return Utils.NOT_IMPLEMENTED();
  }
}

module.exports = SparqlConnector;
