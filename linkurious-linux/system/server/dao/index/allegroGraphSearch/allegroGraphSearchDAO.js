/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-08-22.
 */
'use strict';

// locals
const IndexDAO = require('../indexDAO');

class AllegroGraphSearchDAO extends IndexDAO {
  constructor(options, graphDao) {
    super('allegroGraphSearch',
      [],
      ['disableIndexExistCheck'], // for tests only
      options, {
        external: true,
        schema: null,
        canCount: false,
        typing: false,
        fuzzy: true,
        canIndexEdges: false,
        canIndexCategories: true,
        versions: false,
        advancedQueryDialect: 'allegro',
        searchHitsCount: false
      },
      graphDao,
      'allegroGraph',
      [
        {version: '6.2.3', name: '[latest]'},
        {version: '6.0.0', name: 'allegroGraphSearch'}
      ],
      ['allegroGraph']
    );
  }
}

module.exports = AllegroGraphSearchDAO;

/**
 * @dokapi allegro.search.config
 *
 * The `allegroGraphSearch` connector is the recommended solution for full-text search
 * for graphs with more than 1,000,000 triples.
 *
 * ## AllegroGraph search integration
 *
 * Linkurious can use the builtin search indices managed by AllegroGraph itself.
 * You can either [use the Web user-interface](/search/#using-the-web-user-interface)
 * or edit the configuration file located at {{config}} to set the `index.vendor` property to the value `allegroGraphSearch`.
 *
 * See the [AllegroGraph documentation](https://franz.com/agraph/support/documentation/current/text-index.html) to learn more.
 *
 * If you already have a search index in AllegroGraph, the following step is not required.
 *
 * ### Create a search index in AllegroGraph
 *
 * 1. Go to the repository page on AllegroGraph WebView (by default at http://127.0.0.1:10035)
 * 2. Press *Manage free-text indices*
 * 3. Create a new free-text index, the name is irrelevant
 * 4. The default options for the newly created index should be enough.
 *
 * You must ensure that `Objects` under `Fields to index` is highlighted.
 */
