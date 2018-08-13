/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-01.
 */
'use strict';

// locals
const GraphDAO = require('../graphDAO');

class DseDAO extends GraphDAO {

  /**
   * @param {object}  options
   * @param {string}  options.url               DSE Graph url
   * @param {string}  options.graphName         The name of the DSE graph to load
   * @param {string}  [options.user]            DSE Graph user
   * @param {string}  [options.password]        DSE Graph password
   * @param {boolean} options.create            Whether to create the graph if it does not exist
   * @param {boolean} [options.allowSelfSigned] Whether to allow self-signed certificates
   * @constructor
   */
  constructor(options) {
    super('dse',
      ['url', 'graphName'],
      ['url', 'graphName', 'user', 'password', 'create', 'allowSelfSigned'],
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
        alternativeIds: false,
        emptyNodes: true,
        dialects: ['gremlin'],
        canStream: true,
        detectSupernodes: false
      },
      'dse',
      [
        // Note: we are talking about gremlin versions
        {version: '3.2.6', name: '[latest]'}, // Correspond to DSE 5.1.3
        {version: '3.2.6', name: 'dse'}
        // We explicitly don't support DSE 5.0.x because it doesn't support fuzzy search
      ]
    );
  }
}

module.exports = DseDAO;

/**
 * @dokapi dse.datasource.config
 *
 * DataStax Enterprise Graph is supported since version 5.1.3.
 *
 * ## Prerequisites
 *
 * In order to use DSE Graph with Linkurious is necessary that the option `graph.tx_autostart` is set to `true`
 * on your current database.
 *
 * Enable it via the DSE [gremlin console](https://docs.datastax.com/en/dse/5.1/dse-dev/datastax_enterprise/graph/using/startGremlin.html) by typing:
 *
 * ```
 * :remote config alias g <graphName>.g
 * graph.schema().config().option('graph.tx_autostart').set('true')
 * ```
 *
 * If you are going to use any search index other than the one provided directly from [DataStax Enterprise Graph](/search-dse),
 * it is necessary to set to `true` also the option `graph.allow_scan`.
 *
 * ```
 * :remote config alias g <graphName>.g
 * graph.schema().config().option('graph.allow_scan').set('true')
 * ```
 *
 * ## Configuration
 *
 * To edit the DataStax Enterprise Graph data-source configuration,
 * you can either [use the Web user-interface](/configure-sources/#using-the-web-user-interface)
 * or edit the configuration file located at {{config}}.
 *
 * Example configuration:
 * ```json
 * {
 *   "dataSources": [
 *     {
 *       "graphdb": {
 *         "vendor": "dse",
 *         "url": "ws://127.0.0.1:8182/",
 *         "graphName": "myGraph"
 *       },
 *       "index": {
 *         "vendor": "dseSearch"
 *       }
 *     }
 *   ]
 * }
 * ```
 *
 * Supported `graphdb` options for DataStax Enterprise Graph:
 *
 * - `url` (*required*): URL of the Gremlin server (must be a WebSocket URL, i.e. start with `ws://` or `wss://`)
 * - `graphName` (*required*): Name of the graph to use
 * - `create` (optional): `true` to let Linkurious create the repository if it does not exist
 * - `user` (optional): DataStax Enterprise Graph user
 * - `password` (optional): DataStax Enterprise Graph password
 * - `latitudeProperty` (optional): Name of the node property to use for latitude (used in geo mode)
 * - `longitudeProperty` (optional): Name of the node property to use for longitude (used in geo mode)
 * - `allowSelfSigned` (optional, default `false`): Whether to allow self-signed certificates
 *
 * ## Search with DataStax Enterprise Graph
 *
 * In order to have full-text search, you can choose among the following options:
 *
 * - [Configure a search index in DataStax Enterprise Graph](/search-dse).
 * - [Configure a search index in Elasticsearch](/es-config).
 */

/**
 * @dokapi dse.import
 *
 * Please refer to the
 * [DataStax Enterprise Graph online documentation](https://docs.datastax.com/en/dse/5.1/dse-dev/datastax_enterprise/graph/dgl/graphloaderTOC.html)
 * for details on how to load data into DataStax Enterprise Graph.
 */
