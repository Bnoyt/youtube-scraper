/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-07-26.
 */
'use strict';

// locals
const GraphDAO = require('../graphDAO');

class StardogDAO extends GraphDAO {

  /**
   * User can choose the id of a new node by setting `options.idPropertyName` if defined.
   * Updating the id is currently not supported since it would break the indexation.
   *
   * @param {object}  options
   * @param {string}  options.url                               Stardog url
   * @param {string}  options.repository                        Stardog repository name
   * @param {string}  [options.user]                            Stardog user
   * @param {string}  [options.password]                        Stardog password
   * @param {string}  [options.namespace="http://linkurio.us/"] Default namespace
   * @param {string}  [options.categoryPredicate="rdf:type"]    Predicate that appears in category statements
   * @param {string}  [options.idPropertyName]                  Property name used to show the id in its short form
   * @param {boolean} [options.allowSelfSigned]                 Whether to allow self-signed certificates
   * @constructor
   */
  constructor(options) {
    super('stardog',
      ['url', 'repository'],
      ['url', 'repository', 'user', 'password', 'namespace', 'categoryPredicate',
        'idPropertyName', 'allowSelfSigned'],
      options,
      {
        immutableNodeCategories: false,
        minNodeCategories: 0,
        maxNodeCategories: undefined,
        serializeArrayProperties: true,
        edgeProperties: false,
        alerts: false,
        shortestPaths: false,
        canCount: false,
        alternativeIds: false,
        emptyNodes: false,
        dialects: ['sparql'],
        canStream: false,
        detectSupernodes: false
      },
      'stardog',
      [
        {version: '5.0.3', name: '[latest]'},
        {version: '5.0.0', name: 'stardog'}
      ]
    );
  }
}

module.exports = StardogDAO;

/**
 * @dokapi stardog.datasource.config
 *
 * Stardog is supported since versions 5.0.0.
 *
 * ## Configuration
 *
 * To edit the Stardog data-source configuration,
 * you can either [use the Web user-interface](/configure-sources/#using-the-web-user-interface)
 * or edit the configuration file located at {{config}}.
 *
 * Example configuration:
 * ```json
 * {
 *   "dataSources": [
 *     {
 *       "graphdb": {
 *         "vendor": "stardog",
 *         "url": "http://127.0.0.1:10035/",
 *         "repository": "myGraph"
 *       },
 *       "index": {
 *         "vendor": "stardogSearch"
 *       }
 *     }
 *   ]
 * }
 * ```
 *
 * Supported `graphdb` options for Stardog:
 *
 * - `url` (*required*): URL of the Stardog server
 * - `repository` (*required*): Name of the repository to use
 * - `user` (optional): Stardog user
 * - `password` (optional): Stardog password
 * - `namespace` (optional, default `http://linkurio.us`): Namespace to use by default
 * - `idPropertyName` (optional): Name of the virtual node property containing the node URI
 * - `categoryPredicate` (optional, default `rdf:type`): Predicate used to extract node categories
 * - `latitudeProperty` (optional): Name of the node property to use for latitude (used in geo mode)
 * - `longitudeProperty` (optional): Name of the node property to use for longitude (used in geo mode)
 * - `allowSelfSigned` (optional, default `false`): Whether to allow self-signed certificates
 *
 * ## Search with Stardog
 *
 * In order to have full-text search,
 * it's required to [configure a search index in Stardog](/search-stardog).
 */

/**
 * @dokapi stardog.import
 *
 * Please refer to the
 * [Stardog online documentation](https://www.stardog.com/docs/#_enterprise_data_unification)
 * for details on how to load data into Stardog.
 */
