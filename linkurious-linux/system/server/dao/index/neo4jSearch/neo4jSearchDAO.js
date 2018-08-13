/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-10-09.
 */
'use strict';

// locals
const IndexDAO = require('../indexDAO');

class Neo4jSearch extends IndexDAO {

  /**
   * @param {object}  options
   * @param {number}  [options.batchSize=1000000]   Number of nodes to index at once
   * @param {number}  [options.numberOfThreads=8]   Number of concurrent requests
   * @param {boolean} [options.initialization=true] Whether to perform the actual indexation on "start indexation" or just refresh the schema
   * @param {number}  [options.initialOffsetNodes]  Offset of the node where to start to index if indexation got previously interrupted
   * @param {number}  [options.initialOffsetEdges]  Offset of the edge where to start to index if indexation got previously interrupted
   * @param {GraphDAO} graphDao                     The connected Graph DAO
   * @constructor
   */
  constructor(options, graphDao) {
    const useBolt = graphDao.getOption('url').toLowerCase().startsWith('bolt');

    super('neo4jSearch',
      [],
      [
        'batchSize',
        'numberOfThreads',
        'initialization',
        'initialOffsetNodes',
        'initialOffsetEdges',
        'disableIndexExistCheck' // for tests only
      ],
      options,
      {
        fuzzy: true,
        external: true,
        canCount: false, // duplicate feature of Neo4jDAO
        typing: false,
        versions: false,
        schema: null,
        canIndexEdges: true,
        canIndexCategories: false,
        advancedQueryDialect: 'lucene',
        searchHitsCount: false
      },
      graphDao,
      useBolt ? 'neo4jBolt' : ['neo4jBolt', 'neo4jHTTP'],
      [
        {version: '3.3.0', name: '[latest]'},
        {version: '3.3.0', name: 'neo4jSearch330'},
        {version: '3.0.0', name: 'neo4jSearch300'},
        {version: '2.1.5', name: 'neo4jSearch'}
      ],
      ['neo4j']
    );
  }
}

module.exports = Neo4jSearch;

/**
 * @dokapi neo4j.search.config
 *
 * The `neo4jSearch` connector is a solution for full-text search with Neo4j.
 *
 * ## Configuration
 *
 * To edit the Neo4j data-source configuration,
 * you can either [use the Web user-interface](/configure-sources/#using-the-web-user-interface)
 * or edit the configuration file located at {{config}}.
 *
 * Example configuration:
 * ```json
 * {
 *   "dataSources": [
 *     {
 *       "graphdb": {
 *         "vendor": "neo4j",
 *         "url": "http://127.0.0.1:7474/",
 *         "user": "myNeo4jUser",
 *         "password": "nyNeo4jPassword"
 *       },
 *       "index": {
 *         "vendor": "neo4jSearch",
 *         "batchSize": 4000000,
 *         "numberOfThreads": 32,
 *         "initialOffsetNodes": 0,
 *         "initialOffsetEdges": 0
 *       }
 *     }
 *   ]
 * }
 * ```
 *
 * Supported `index` options with Neo4jSearch:
 *
 * - `batchSize` (optional): Number of nodes to index at once
 * - `numberOfThreads` (optional): Number of concurrent requests during indexation
 * - `initialization` (optional): Whether to perform the actual indexation on "start indexation" or just refresh the schema
 * - `initialOffsetNodes` (optional): Offset of the node where to start to index if indexation got previously interrupted
 * - `initialOffsetEdges` (optional): Offset of the edge where to start to index if indexation got previously interrupted
 *
 * Setting `batchSize` and `numberOfThreads` to higher values will decrease the required time
 * to index the whole dataset.
 * Suggested values for the batch size are `10000000` (default value) and multiples of it.
 * Regarding the number of threads, the suggested value is the number of cores of the machine where
 * Neo4j is installed.
 *
 * ## Neo4j search integration
 *
 * Linkurious can use the builtin search indices managed by Neo4j itself.
 * You can either [use the Web user-interface](/search/#using-the-web-user-interface)
 * or edit the configuration file located at {{config}} to set the `index.vendor` property to the value `neo4jSearch`.
 *
 * ### Configure Neo4j to create a search index
 *
 * 1. Edit the Neo4 configuration at `neo4j/conf/neo4j.conf` and add the following lines at the beginning of the file:
 * ```sh
 * dbms.auto_index.nodes.enabled=true
 * # node properties that will be searchable (SET YOUR OWN)
 * dbms.auto_index.nodes.keys=name,description,firstName,lastName,email,content
 *
 * # Add the following lines if you want to index relationships as well
 * dbms.auto_index.relationships.enabled=true
 * # relationship properties that will be searchable (SET YOUR OWN)
 * dbms.auto_index.relationships.keys=description,content
 * ```
 *
 * 2. Restart Neo4j
 */
