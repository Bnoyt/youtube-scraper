/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-08-21.
 */
'use strict';

// external libs
const Promise = require('bluebird');
const _ = require('lodash');

// our libs
const StringUtils = require('../../../../lib/StringUtils');

// services
const LKE = require('../../../services');
const Errors = LKE.getErrors();

// locals
const SparqlSearchDriver = require('../sparqlSearchDriver');

const S_EXPRESSION_RESERVED_WORDS = ['and', 'or', 'phrase', 'match', 'fuzzy'];

const MIN_SEARCH_LENGTH_TO_SORT = 4;

class AllegroGraphSearchDriver extends SparqlSearchDriver {

  /**
   * Return true if `searchString` is an S-expression.
   * We will test the query. If it returns an HTTP status other than 200 it isn't an S-expression.
   *
   * @param {string} searchString
   * @returns {Bluebird<boolean>} resolved with `true` if `searchString` is an S-expression
   * @private
   */
  _isAnSExpression(searchString) {
    searchString = searchString.trim();
    const hasParenthesis = searchString.startsWith('(') && searchString.endsWith(')');
    let containsAReservedWord = false;

    _.forEach(S_EXPRESSION_RESERVED_WORDS, reservedWord => {
      containsAReservedWord = containsAReservedWord || searchString.includes(reservedWord);
    });

    if (hasParenthesis && containsAReservedWord) {
      return this._doFreeTextQuery(searchString, true, 1, 0).then(() => true).catch(() => false);
    } else {
      // we don't need to ask Allegro since it's obviously not an S-expression.
      return Promise.resolve(false);
    }
  }

  /**
   * Escape `searchString` and apply fuzziness to it if `fuzzy` is true.
   * The last token is always considered a prefix.
   *
   * If `searchString` is already a pattern query, return it directly.
   *
   * Note:
   * It's not possible to use fuzziness (~) and a wildcard (*) on the same word.
   *
   * @param {string}  searchString
   * @param {boolean} fuzzy
   * @returns {string}
   * @private
   */
  _generateFuzzyQuery(searchString, fuzzy) {
    if (/[()|*?~]/g.test(searchString)) {
      return searchString; // it's a pattern query or even an S-expression query
    }

    const tokens = StringUtils.uniqTokenize(searchString);

    searchString = '';

    for (let i = 0; i < tokens.length; i++) {
      if (i !== tokens.length - 1) {
        searchString += tokens[i] + (fuzzy ? '~' : '') + ' | ';
      } else {
        // last token has to be treated differently because it will be used also as a prefix
        if (fuzzy) {
          searchString += `(${tokens[i]}~ | ${tokens[i]}*)`;
        } else {
          searchString += tokens[i] + '*';
        }
      }
    }

    return searchString;
  }

  /**
   * Execute a free text query 'searchString' on AllegroGraph.
   * It uses the right endpoint depending on `isAnSExpression`.
   *
   * @param {string}  searchString
   * @param {boolean} isSExpression
   * @param {number}  limit
   * @param {number}  offset
   * @returns {Bluebird<string[][]>}
   * @private
   */
  _doFreeTextQuery(searchString, isSExpression, limit, offset) {
    // sorting may be expensive, apply only if searchString is at least 4 chars
    const sorted = searchString.length >= MIN_SEARCH_LENGTH_TO_SORT;

    const qs = {limit: limit, offset: offset, sorted: sorted};
    if (isSExpression) {
      qs.expression = searchString;
    } else {
      qs.pattern = searchString;
    }

    return this.connector.$request.post('/freetext', {qs}, [200]).get('body');
  }

  /**
   * Search for statements matching `searchString`.
   *
   * Additional notes:
   * The `searchString` param can be any of the following kind of queries:
   * - S-expression query, e.g: (and (phrase "common lisp") (or "programming" (match "develop*")))
   * - pattern query, e.g: "common lisp" (programming | develop*)
   * - base query, e.g: helloo wor
   *
   * A base query is technically a pattern query. The only difference is that a base query doesn't
   * contain the following characters: ()|*?~
   *
   * On base queries we will apply a fuzziness according to `fuzziness`.
   *
   * S-expression query and pattern query will ignore `fuzziness` because they can apply
   * fuzziness on their own with a word granularity.
   *
   * @param {string} searchString String to search (can be just text or written in `advancedQueryDialect`)
   * @param {number} limit        Maximum number of statements we want to receive (for pagination)
   * @param {number} offset       Offset of the first result (for pagination)
   * @param {number} fuzziness    Acceptable normalized edit similarity among the query and the result
   * @returns {Bluebird<string[][]>}
   */
  $doTextQuery(searchString, limit, offset, fuzziness) {
    // escape the searchString and apply the fuzziness
    const searchQuery = this._generateFuzzyQuery(searchString, fuzziness !== 1);

    // Decide which endpoint to use: 'fti:matchExpression' or 'fti:match'
    return this._isAnSExpression(searchQuery).then(isSExpression => {
      return this._doFreeTextQuery(searchQuery, isSExpression, limit, offset);
    });
  }

  /**
   * Called at the end of the connect phase for additional initializations.
   *
   * @returns {Bluebird<void>}
   */
  $onAfterConnect() {
    return this.connector.$request.get('/freetext/indices').then(ftiR => {
      // if there are no free-text indices in allegroGraph
      // and we are not in test mode (where the index will be created by allegroSetup)
      if (!(ftiR.statusCode === 200 && ftiR.body.length > 0 ||
          this.getIndexOption('disableIndexExistCheck'))) {
        return Errors.business('source_action_needed',
          'No free-text indices found in AllegroGraph.', true);
      }
    });
  }
}

module.exports = AllegroGraphSearchDriver;
