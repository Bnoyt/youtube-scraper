/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-11-06.
 */
'use strict';

// our libs
const StringUtils = require('./../../../lib/StringUtils');

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();

const CYPHER_WRITE_STATEMENTS = [
  'SET', 'CREATE', 'MERGE', 'DELETE', 'REMOVE', 'FOREACH', 'LOAD', 'DROP'
].sort();

const CYPHER_WRITE_RE = new RegExp(
  '[\\s|^](' + CYPHER_WRITE_STATEMENTS.join('|') + ')[\\(|\\s]', 'i'
);

class CypherUtils {
  /**
   * Names in Cypher are wrapped in back-ticks ("`").
   * Escape is done with a double back-tick.
   *
   * @param {string} v
   * @returns {string}
   */
  encodeName(v) {
    return '`' + StringUtils.replaceAll(v, '`', '``') + '`';
  }

  /**
   * @param {any} v
   * @returns {string}
   */
  encodeValue(v) {
    return JSON.stringify(v);
  }

  /**
   * @param {string[]} ids
   * @returns {string}
   */
  encodeIDArray(ids) {
    return '[' + ids.join() + ']';
  }

  /**
   * Check if a query is correct and if it wants to try to write data but it can't.
   *
   * @param {string}  query      The graph query
   * @param {boolean} [canWrite] Whether the query is allowed to alter the data
   * @throws {LkError} if the query is not valid or not authorized
   */
  checkQuery(query, canWrite) {
    // trim, remove trailing ';' from query and
    // remove string literals from the query to avoid most false positives
    const queryStatements = Utils.stripLiterals(query.trim().replace(/[;]+$/, ''));

    if (!queryStatements.match(/RETURN/i)) {
      throw Errors.business(
        'invalid_parameter', 'The Cypher query is missing a "RETURN" statement.');
    }

    let match;
    // check for write statements in the query and fail if any are found
    if (!canWrite) {
      if (!queryStatements.match(/^(START|MATCH)/i)) {
        throw Errors.access('write_forbidden', 'The query must start with "MATCH" or "START"');
      }
      if ((match = CYPHER_WRITE_RE.exec(queryStatements)) !== null) {
        throw Errors.access('write_forbidden', 'The query cannot use statement "' + match[1] +
          '", or any of ' + CYPHER_WRITE_STATEMENTS);
      }
    }
  }

  /**
   * Enforce a limit on the number of matched subgraphs.
   *
   * @param {string} query The graph query
   * @param {number} limit Maximum number of matched subgraphs
   * @returns {{query: string, originalLimit?: number}}
   */
  enforceLimit(query, limit) {
    // trim and remove trailing ';' from query
    let newQuery = query.trim().replace(/[;]+$/, '');
    let originalLimit;

    // remove string literals from the query to avoid most false positives
    const queryStatements = Utils.stripLiterals(newQuery);

    let match;
    // detect explicit LIMIT statements, check the value against limit
    if ((match = /\sLIMIT\s+(\d+)/i.exec(queryStatements)) !== null) {
      originalLimit = Utils.parseInt(match[1]);
      if ('' + originalLimit !== match[1]) {
        throw Errors.business(
          'bad_graph_request', `The Cypher query LIMIT value "${match[1]}" is invalid.`);
      }

      // fix the limit if greater than what the maximum limit
      if (originalLimit > limit) {
        newQuery = newQuery.replace(/\sLIMIT\s+\d+/gi, ' LIMIT ' + limit);
      }
    } else {
      // add an explicit limit if none was set
      newQuery += ' LIMIT ' + limit;
    }

    return {
      query: newQuery,
      originalLimit: originalLimit
    };
  }
}

module.exports = new CypherUtils();
