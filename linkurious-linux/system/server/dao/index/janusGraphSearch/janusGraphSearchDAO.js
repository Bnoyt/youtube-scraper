/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-01.
 */
'use strict';

// locals
const IndexDAO = require('../indexDAO');

class JanusGraphSearchDAO extends IndexDAO {
  constructor(options, graphDao) {
    super('janusGraphSearch',
      [],
      ['disableIndexExistCheck'], // for tests only
      options, {
        fuzzy: true,
        external: true,
        canCount: false,
        typing: false, // typing can be enabled in a future driver (it requires Server#918)
        versions: false,
        schema: null,
        canIndexEdges: false, // canIndexEdge can be enabled in a future driver
        canIndexCategories: false,
        searchHitsCount: false
      },
      graphDao,
      'janusGraph',
      [
        {version: '0.1.1', name: '[latest]'},
        {version: '0.1.1', name: 'janusGraphSearch'}
      ],
      ['janusGraph']
    );
  }
}

module.exports = JanusGraphSearchDAO;

/**
 * @dokapi janusgraph.search.config
 *
 * The `janusGraphSearch` connector is the recommended solution for full-text search
 * for graphs with more than 100,000 nodes and edges.
 *
 * ## JanusGraph search integration
 *
 * Linkurious can use the builtin search indices managed by JanusGraph itself.
 * You can either [use the Web user-interface](/search/#using-the-web-user-interface)
 * or edit the configuration file located at {{config}} to set the `index.vendor` property to the value `janusGraphSearch`.
 *
 * See the [JanusGraph documentation](http://docs.janusgraph.org/latest/index-parameters.html) to learn more.
 *
 * If you already have a search index in JanusGraph, the following step is not required.
 *
 * ### Create a search index in JanusGraph
 *
 * Please refer to the [JanusGraph documentation](http://docs.janusgraph.org/latest/index-parameters.html)
 * on how to create mixed indices.
 *
 * First, ensure that the property keys to index are of the `String` data type:
 * ```java
 * > name = mgmt.makePropertyKey('name').dataType(String.class).make()
 * ```
 *
 * Follow these steps to use JanusGraph Search and integrate it with Linkurious:
 *
 * 1. Connect via gremlin to JanusGraph
 * 2. Execute this command:
 * ```java
 * mgmt.buildIndex('searchIndexName', Vertex.class)
 * .addKey(property1, Mapping.TEXTSTRING.asParameter())
 * .addKey(property2, Mapping.TEXTSTRING.asParameter())
 * .addKey(property3, Mapping.TEXTSTRING.asParameter())
 * .buildMixedIndex("search")
 * mgmt.commit()
 * ```
 *
 * Every property key that you want to index has to appear in this command.
 * You can add as many properties as you want. We recommend to index only what you actually need to.
 */
