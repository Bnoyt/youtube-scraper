/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-07-26.
 */
'use strict';

// locals
const IndexDAO = require('../indexDAO');

class StardogSearchDAO extends IndexDAO {
  constructor(options, graphDao) {
    super('stardogSearch',
      [],
      ['disableIndexExistCheck'], // for tests only
      options, {
        fuzzy: true,
        canIndexCategories: true,

        external: true,
        canCount: false,
        typing: false,
        versions: false,

        schema: null,

        canIndexEdges: false,
        searchHitsCount: false
      },
      graphDao,
      'stardog',
      [
        {version: '5.0.3', name: '[latest]'},
        {version: '5.0.0', name: 'stardogSearch'}
      ],
      ['stardog']
    );
  }
}

module.exports = StardogSearchDAO;

/**
 * @dokapi stardog.search.config
 *
 * The `stardogSearch` connector is the only solution for full-text search in Stardog.
 *
 * ## Stardog search integration
 *
 * Linkurious can use the builtin search indices managed by Stardog itself.
 * You can either [use the Web user-interface](/search/#using-the-web-user-interface)
 * or edit the configuration file located at {{config}} to set the `index.vendor` property to the value `stardogSearch`.
 *
 * See the [Stardog documentation](https://www.stardog.com/docs/#_search) to learn more.
 *
 * If you already have a search index in Stardog, the following step is not required.
 *
 * ### Create a search index in Stardog
 *
 * Under the configuration page of the repository, ensure that `search.enabled` is `ON`.
 */
