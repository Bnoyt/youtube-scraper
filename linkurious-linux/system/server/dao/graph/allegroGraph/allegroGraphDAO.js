/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-07-26.
 */
'use strict';

// locals
const GraphDAO = require('../graphDAO');

class AllegroGraphDAO extends GraphDAO {

  /**
   * User can choose the id of a new node by setting `options.idPropertyName` if defined.
   * Updating the id is currently not supported since it would break the indexation.
   *
   * @param {object}  options
   * @param {string}  options.url                               AllegroGraph url
   * @param {string}  options.repository                        AllegroGraph repository name
   * @param {string}  [options.user]                            AllegroGraph user
   * @param {string}  [options.password]                        AllegroGraph password
   * @param {boolean} [options.create]                          Whether to create the graph repository if it does not exist
   * @param {string}  [options.namespace="http://linkurio.us/"] Default namespace
   * @param {string}  [options.categoryPredicate="rdf:type"]    Predicate that appears in category statements
   * @param {string}  [options.idPropertyName]                  Property name used to show the id in its short form
   * @param {boolean} [options.allowSelfSigned]                 Whether to allow self-signed certificates
   * @constructor
   */
  constructor(options) {
    super('allegroGraph',
      ['url', 'repository'],
      ['url', 'repository', 'user', 'password', 'create', 'namespace', 'categoryPredicate',
        'idPropertyName', 'allowSelfSigned'],
      options,
      {
        edgeProperties: false,
        immutableNodeCategories: false,
        minNodeCategories: 0,
        maxNodeCategories: undefined,
        serializeArrayProperties: true,
        canCount: false,
        alerts: false,
        shortestPaths: false,
        alternativeIds: false,
        emptyNodes: false,
        dialects: ['sparql'],
        canStream: true,
        detectSupernodes: false
      },
      'allegroGraph',
      [
        {version: '6.2.3', name: '[latest]'},
        {version: '6.0.0', name: 'allegroGraph'}
      ]
    );
  }
}

module.exports = AllegroGraphDAO;

/**
 * @dokapi allegro.datasource.config
 *
 * AllegroGraph is supported since version 6.0.0.
 *
 * ## Configuration
 *
 * To edit the AllegroGraph data-source configuration,
 * you can either [use the Web user-interface](/configure-sources/#using-the-web-user-interface)
 * or edit the configuration file located at {{config}}.
 *
 * Example configuration:
 * ```json
 * {
 *   "dataSources": [
 *     {
 *       "graphdb": {
 *         "vendor": "allegroGraph",
 *         "url": "http://127.0.0.1:10035/",
 *         "repository": "myGraph"
 *       },
 *       "index": {
 *         "vendor": "allegroGraphSearch"
 *       }
 *     }
 *   ]
 * }
 * ```
 *
 * Supported `graphdb` options for AllegroGraph:
 *
 * - `url` (*required*): URL of the AllegroGraph server
 * - `repository` (*required*): Name of the repository to use
 * - `create` (optional): `true` to let Linkurious create the repository if it does not exist
 * - `user` (optional): AllegroGraph user
 * - `password` (optional): AllegroGraph password
 * - `namespace` (optional, default `http://linkurio.us`): Namespace to use by default
 * - `idPropertyName` (optional): Name of the virtual node property containing the node URI
 * - `categoryPredicate` (optional, default `rdf:type`): Predicate used to extract node categories
 * - `latitudeProperty` (optional): Name of the node property to use for latitude (used in geo mode)
 * - `longitudeProperty` (optional): Name of the node property to use for longitude (used in geo mode)
 * - `allowSelfSigned` (optional, default `false`): Whether to allow self-signed certificates
 *
 * ## Search with AllegroGraph
 *
 * In order to have full-text search, you can choose among the following options:
 *
 * - [Configure a search index in AllegroGraph](/search-allegrograph).
 * - [Configure a search index in Elasticsearch](/es-config).
 */

/**
 * @dokapi allegro.import
 *
 * Please refer to the
 * [AllegroGraph online documentation](https://franz.com/agraph/support/documentation/current/agload.html)
 * for details on how to load data into AllegroGraph.
 */
