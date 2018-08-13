/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-01.
 */
'use strict';

// locals
const IndexDAO = require('../indexDAO');

class DseSearchDAO extends IndexDAO {
  constructor(options, graphDao) {
    super('dseSearch',
      [],
      ['disableIndexExistCheck'], // for tests only
      options, {
        fuzzy: true,
        external: true,
        canCount: false,
        typing: true,
        versions: false,
        schema: {
          counts: false,
          properties: true,
          inferred: false
        },
        canIndexEdges: false,
        canIndexCategories: false,
        searchHitsCount: false
      },
      graphDao,
      'dse',
      [
        // Note: we are talking about gremlin versions
        {version: '3.2.6', name: '[latest]'}, // Correspond to DSE 5.1.3
        {version: '3.2.6', name: 'dseSearch'}
        // We explicitly don't support DSE 5.0.x because it doesn't support fuzzy search
      ],
      ['dse']
    );
  }
}

module.exports = DseSearchDAO;

/**
 * @dokapi dse.search.config
 *
 * The `dseSearch` connector is the recommended solution for full-text search
 * for graphs with more than 100,000 nodes and edges.
 *
 * ## DataStax Enterprise Graph Search integration
 *
 * Linkurious can use the builtin search indices managed by DataStax Enterprise Graph itself.
 * You can either [use the Web user-interface](/search/#using-the-web-user-interface)
 * or edit the configuration file located at {{config}} to set the `index.vendor` property to the value `dseSearch`.
 *
 * See the [DataStax Enterprise Graph documentation](http://docs.datastax.com/en/dse/5.1/dse-admin/datastax_enterprise/search/searchTOC.html) to learn more.
 *
 * If you already have a search index in DataStax Enterprise Graph, the following step is not required.
 *
 * ### Create a search index in DataStax Enterprise Graph
 *
 *
 *
 * DSE Search in DataStax Enterprise's built-in search engine.
 * You [can learn more about DSE Search from DataStax' documentation](http://docs.datastax.com/en/latest-dse-search/).
 *
 * ### Index with DSE Search
 *
 * Please refer to the [DataStax Enterprise Graph documentation](https://docs.datastax.com/en/dse/5.1/dse-dev/datastax_enterprise/graph/using/createIndexes.html)
 * on how to create new indices, including search indices.
 *
 * Follow these steps to use DSE Search and integrate it with Linkurious:
 *
 * 1. Connect via gremlin to DSE Graph
 * 2. For each node label you want to index execute this command:
 * ```java
 * schema.vertexLabel("MY_NODE_LABEL").index("search").search()
 * .by("MY_NODE_PROPERTY_1").asText()
 * .by("MY_NODE_PROPERTY_2").asText()
 * .by("MY_NODE_PROPERTY_3").asText()
 * .by("MY_NODE_PROPERTY_N").asText()
 * .add();
 * ```
 *
 * Every property key that you want to index has to appear in this command.
 * You can add as many properties as you want. We recommend to index only what you actually need to.
 *
 * We recommend to create `asText()` search indices instead of `asString()` ones. Both types of indices
 * are supported by Linkurious, but the latter doesn't support `OR` search queries. If you don't need
 * this feature, `asString()` indices will actually compute search queries faster. It's also possible to mix
 * `asText()` and `asString()` indices to find a balance of features and performances.
 */
