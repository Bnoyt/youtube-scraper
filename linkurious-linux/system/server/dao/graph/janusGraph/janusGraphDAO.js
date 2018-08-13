/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-01.
 */
'use strict';

// locals
const GraphDAO = require('../graphDAO');

class JanusGraphDAO extends GraphDAO {

  /**
   * @param {object}  options
   * @param {string}  options.url                 JanusGraph url
   * @param {string}  [options.configurationPath] Path to the Gremlin configuration file
   * @param {object}  [options.configuration]     JanusGraph graph configuration
   * @param {string}  [options.user]              JanusGraph user
   * @param {string}  [options.password]          JanusGraph password
   * @param {boolean} [options.allowSelfSigned]   Whether to allow self-signed certificates
   * @constructor
   */
  constructor(options) {
    super('janusGraph',
      ['url'],
      ['url', 'configurationPath', 'configuration', 'user', 'password', 'allowSelfSigned'],
      options,
      {
        edgeProperties: true,
        immutableNodeCategories: true,
        minNodeCategories: 1,
        maxNodeCategories: 1,
        serializeArrayProperties: true,
        canCount: false,
        alerts: false,
        shortestPaths: true,
        alternativeIds: true,
        emptyNodes: true,
        dialects: ['gremlin'],
        canStream: true,
        detectSupernodes: false
      },
      'janusGraph',
      [
        {version: '0.2.0', name: '[latest]'},
        {version: '0.1.1', name: 'janusGraph'}
      ]
    );
  }
}

module.exports = JanusGraphDAO;

/**
 * @dokapi janusgraph.datasource.config
 *
 * JanusGraph is supported since version 0.1.1.
 *
 * ## Configuration
 *
 * To edit the JanusGraph data-source configuration,
 * you can either [use the Web user-interface](/configure-sources/#using-the-web-user-interface)
 * or edit the configuration file located at {{config}}.
 *
 * Example configuration:
 * ```json
 * {
 *   "dataSources": [
 *     {
 *       "graphdb": {
 *         "vendor": "janusGraph",
 *         "url": "ws://127.0.0.1:8182/",
 *         "configuration": {
 *           "storage.backend": "cassandra",
 *           "storage.hostname": "127.0.0.1"
 *         }
 *       },
 *       "index": {
 *         "vendor": "janusGraphSearch"
 *       }
 *     }
 *   ]
 * }
 * ```
 *
 * Supported `graphdb` options for JanusGraph:
 *
 * - `url` (*required*): URL of the Gremlin server (must be a WebSocket URL, i.e. start with `ws://` or `wss://`)
 * - `configuration` (*required*): Dictionary of configuration values (for reference, see the [JanusGraph documentation](http://docs.janusgraph.org/latest/configuration.html))
 * - `configurationPath` (alternative to `configuration`): Path to the Gremlin configuration file on the Gremlin server
 * - `user` (optional): JanusGraph user
 * - `password` (optional): JanusGraph password
 * - `alternativeNodeId` (optional): Name of the node property to use as reference in visualizations (see [alternative IDs](/alternative-ids))
 * - `alternativeEdgeId` (optional): Name of the edge property to use as reference in visualizations
 * - `latitudeProperty` (optional): Name of the node property to use for latitude (used in geo mode)
 * - `longitudeProperty` (optional): Name of the node property to use for longitude (used in geo mode)
 * - `allowSelfSigned` (optional, default `false`): Whether to allow self-signed certificates
 *
 * Note that exactly one option among `configuration` and `configurationPath` has to be defined.
 *
 * ## Search with JanusGraph
 *
 * In order to have full-text search, you can choose among the following options:
 *
 * - [Configure a search index in JanusGraph](/search-janus).
 * - [Configure a search index in Elasticsearch](/es-config).
 */

/**
 * @dokapi janusgraph.import
 *
 * Please refer to the
 * [JanusGraph online documentation](http://docs.janusgraph.org/latest/hadoop-tp3.html)
 * for details on how to load data into JanusGraph.
 */
