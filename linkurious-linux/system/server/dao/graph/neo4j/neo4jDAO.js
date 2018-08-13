/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-10-09.
 */
'use strict';

// locals
const GraphDAO = require('../graphDAO');

class Neo4jDAO extends GraphDAO {

  /**
   * @param {object}  options
   * @param {string}  options.url               Neo4j Bolt/HTTP/HTTPS url
   * @param {string}  [options.user]            Neo4j user
   * @param {string}  [options.password]        Neo4j password
   * @param {string}  [options.writeURL]        Neo4j HTTP/HTTPS Core Server url (not used for Bolt)
   * @param {string}  [options.proxy]           HTTP proxy (not used for Bolt)
   * @param {boolean} [options.allowSelfSigned] Whether to allow self-signed certificates (not used for Bolt)
   * @constructor
   */
  constructor(options) {
    const useBolt = options.url.toLowerCase().startsWith('bolt');

    super('neo4j',
      ['url'],
      ['url', 'user', 'password', 'writeURL', 'proxy', 'allowSelfSigned'],
      options,
      {
        edgeProperties: true,
        immutableNodeCategories: false,
        minNodeCategories: 0,
        maxNodeCategories: undefined,
        serializeArrayProperties: false,
        canCount: true,
        alerts: true,
        shortestPaths: true,
        alternativeIds: true,
        emptyNodes: true,
        dialects: ['cypher'],
        canStream: true,
        detectSupernodes: true
      },
      useBolt ? 'neo4jBolt' : ['neo4jBolt', 'neo4jHTTP'],
      [
        {version: '3.3.2', name: '[latest]'},
        {version: '3.0.0', name: 'neo4j300'},
        {version: '2.1.5', name: 'neo4j'}
      ]
    );
  }
}

module.exports = Neo4jDAO;

/**
 * @dokapi neo4j.datasource.config
 *
 * Neo4j is supported since version 2.1.5.
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
 *         "vendor": "neo4jSearch"
 *       }
 *     }
 *   ]
 * }
 * ```
 *
 * > Since Neo4j version 3.0, Linkurious can connect to Neo4j via the `Bolt` protocol. To do so, you need to enable the protocol
 * in your Neo4j configuration file. If Linkurious is connected over HTTP/S, it will try to automatically upgrade the connection to Bolt.
 * The HTTP/S protocol is still *required* to perform a small subset of operations.
 *
 * Supported `graphdb` options with Neo4j:
 *
 * - `url` (*required*): URL of the Neo4j server (HTTP/HTTPS/Bolt)
 * - `user` (optional): Neo4j user (if credentials are enabled, see [Neo4j credentials](#neo4j-credentials))
 * - `password` (optional): Neo4j password (if credentials are enabled)
 * - `proxy` (optional): URL of the HTTP proxy to use to connect to Neo4j (only used when `url` is HTTP/S)
 * - `alternativeNodeId` (optional): Name of the node property to use as reference in visualizations (see [alternative IDs](/alternative-ids))
 * - `alternativeEdgeId` (optional): Name of the edge property to use as reference in visualizations
 * - `latitudeProperty` (optional): Name of the node property to use for latitude (used in geo mode)
 * - `longitudeProperty` (optional): Name of the node property to use for longitude (used in geo mode)
 * - `allowSelfSigned` (optional, default `false`): Whether to allow self-signed certificates
 *
 * ## Search with Neo4j
 *
 * In order to have full-text search, you can choose among the following options:
 *
 * - [Configure a search index in Neo4j](/search-neo4j).
 * - [Configure a search index with a Neo4j to Elasticsearch plugin](/search-neo4j-to-elasticsearch).
 * - [Configure a search index in Elasticsearch](/es-config).
 *
 * ## Neo4j credentials
 *
 * If you just installed Neo4j, these steps will help you create credentials:
 *
 * 1. Launch the Neo4j server
 * 2. Open your Web browser at http://127.0.0.1:7474
 * 3. Follow the instructions to create a new username and password
 *
 * Alternatively, you can disable credentials in Neo4j by editing the Neo4j configuration at `neo4j/conf/neo4j.conf`
 * by uncommenting the following line:
 * ```
 * dbms.security.auth_enabled=false
 * ```
 */

/**
 * @dokapi neo4j.import
 *
 * Linkurious relies on Neo4j to store the data.
 * The data importation is thus not handled by our solution.
 * Many options exist to import data into Neo4j:
 *
 * - There is a [Gephi](https://gephi.org/) plugin that lets you export any file compatible with Gephi to Neo4j ([list of compatible formats](https://gephi.org/users/supported-graph-formats/)).
 * - If you can handle a spreadsheet, you can easily [import CSV formatted data](https://neo4j.com/blog/importing-data-into-neo4j-the-spreadsheet-way/).
 * - For the more tech savvy, have a look at the [CSV batch Importer](https://github.com/jexp/batch-import)
 * - If you want to get help from professionals, we can get you in touch with great people.
 * - If you are still not sure about whether you can get your data in Linkurious, [contact us](/support), we will be happy to answer your questions.
 *
 * Finally, if you want to quickly try {{lke}} with an example dataset, you can download a [Neo4j-compatible example dataset](https://neo4j.com/developer/example-data/).
 */
