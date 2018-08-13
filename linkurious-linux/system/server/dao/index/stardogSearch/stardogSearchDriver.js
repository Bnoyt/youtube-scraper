/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-08-21.
 */
'use strict';

// locals
const SparqlSearchDriver = require('../sparqlSearchDriver');
const DaoUtils = require('../../utils/daoUtils');

// services
const LKE = require('../../../services');
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();

class StardogSearchDriver extends SparqlSearchDriver {

  /**
   * Search for statements matching `searchString`.
   *
   * @param {string} searchString String to search (can be just text or written in `advancedQueryDialect`)
   * @param {number} limit        Maximum number of statements we want to receive (for pagination)
   * @param {number} offset       Offset of the first result (for pagination)
   * @param {number} fuzziness    Acceptable normalized edit similarity among the query and the result
   * @returns {Bluebird<string[][]>}
   */
  $doTextQuery(searchString, limit, offset, fuzziness) {
    // escape the searchString and apply the fuzziness
    const searchQuery = DaoUtils.generateBasicLuceneFuzzyQuery(searchString, fuzziness !== 1);

    return this.connector.$doSparqlQuery(
      'select distinct ?s ?p ?l where {' +
      '?s ?p ?l. (?l ?score) <tag:stardog:api:property:textMatch> (\'' + searchQuery + '\').' +
      ' } order by desc(?score) limit ' + limit + ' offset ' + offset
    ).catch(() => {
      // soft-fail. It has the habit to fail if it doesn't like the search query
      return [];
    });
  }

  /**
   * Called at the end of the connect phase for additional initializations.
   *
   * @returns {Bluebird<void>}
   */
  $onAfterConnect() {
    const baseUrl = Utils.normalizeUrl(this.getGraphOption('url')) + '/admin/databases/' +
      encodeURIComponent(this.getGraphOption('repository'));

    return this.connector.$request.put('/options',
      {baseUrl: baseUrl, body: {'search.enabled': ''}, json: true}, [200])
      .then(response => {

        const enabled = response.body['search.enabled'];

        if (!enabled) {
          return Errors.business('source_action_needed',
            'Search is not enabled in Stardog', true);
        }
      });
  }
}

module.exports = StardogSearchDriver;
