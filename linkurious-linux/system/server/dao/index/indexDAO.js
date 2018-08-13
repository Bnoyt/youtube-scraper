/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-01-08.
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const Config = LKE.getConfig();

// locals
const DAO = require('../DAO');

// constants
const DEFAULT_FUZZINESS = Config.get('advanced.defaultFuzziness', 0.9);

/**
 * IndexFeatures
 *
 * @property {boolean} external?             Whether the index stays in sync with the graph database automatically
 * @property {object}  schema?               Whether the index is able to produce a full schema
 * @property {boolean} schema.counts?        Whether the schema contains counts (if set to false it will freeze the schema)
 * @property {boolean} schema.properties?    Whether the schema contains properties
 * @property {boolean} schema.inferred?      Whether the schema is able to discover inferred node/edge types
 * @property {boolean} canCount?             Whether the index can count nodes and edges
 * @property {boolean} typing?               Whether the schema is able to fetch type information for properties
 * @property {boolean} fuzzy?                Whether the index allows fuzzy search queries
 * @property {boolean} canIndexEdges?        Whether the index can index edges
 * @property {boolean} canIndexCategories?   Whether the index can index categories
 * @property {boolean} versions?             Whether the index provide versions of nodes and edges
 * @property {string}  advancedQueryDialect? Whether the index provide advanced queries and with which 'dialect'
 * @property {boolean} searchHitsCount?      Whether the search result will contain 'totalHits' or 'moreResults'
 */

/**
 * LkSearchOptions
 *
 * @property {number}     [size]              Maximum number of results we want to receive (for pagination)
 * @property {number}     [from=0]            Offset of the first result (for pagination)
 * @property {number}     [fuzziness=0.9]     Acceptable normalized edit similarity among the query and the result. The edit distance is length(searchString) * (1 - fuzziness)
 * @property {string[][]} [filter]            Array of pairs key-value used to filter the result. The keys represent object properties and the values that should match for each property
 * @property {string[]}   [categoriesOrTypes] Exclusive list of edge-types or node-categories to restrict the search on
 * @property {boolean}    [full]              Whether to return all the properties. Mutually exclusive with the `idOnly` options
 * @property {boolean}    [idOnly]            Whether to return only the id. Mutually exclusive with the `full` options
 */

/**
 * LkSearchResponse
 *
 * @property {string}              type                    'node' or 'edge'
 * @property {number}              [totalHits]             Number of search results matching the search query (available if features.searchHitsCount is true)
 * @property {boolean}             [moreResults]           Whether other results were not returned due to pagination (available if features.searchHitsCount is false)
 * @property {object[] | string[]} results                 If options.idOnly is true, return string[] (an array of IDs), otherwise,
 *                                                         group the search results by their categories/type
 * @property {string}              results.title           Title representing the categories (e.g.: "Actor, Person")
 * @property {string[]}            results.categories      Array of categories (for nodes), or an array of size one, the type (for edges)
 * @property {object[]}            results.children        One entry per search result
 * @property {string}              results.children.id     ID of the entry
 * @property {string}              results.children.name   Title of the search result (found with an heuristic)
 * @property {string}              results.children.field  Field that matched the search query
 * @property {string}              results.children.value  Highlighted value that matched the search query (e.g.: '[match]Sylvain[/match]')
 * @property {any}                 [results.children.data] Data of the entry (available if options.full is true)
 */

class IndexDAO extends DAO {
  /**
   * Abstract Index DAO constructor
   *
   * @param {string}                                 vendor               Name of the vendor for this DAO (e.g.: neo4j, elasticSearch)
   * @param {string[]}                               requiredOptions      List of required option properties
   * @param {string[]}                               availableOptions     List of available option properties
   * @param {any}                                    options              DAO constructor options
   * @param {IndexFeatures}                          features             Features of the index DAO
   * @param {GraphDAO}                               [graphDao]           The connected Graph DAO (optional to support old DAOs, see #634)
   * @param {string | string[]}                      [connectors]         Name of the connector of the DAO (optional to support old DAOs, see #634)
   * @param {Array<{version: string, name: string}>} [drivers]            Name of the driver to use from a given version (optional to support old DAOs, see #634)
   * @param {string[]}                               [supportedGraphDAOs] List of supported graphDAOs (optional to support old DAOs, see #634)
   * @constructor
   */
  constructor(
    vendor,
    requiredOptions,
    availableOptions,
    options,
    features,
    graphDao,
    connectors,
    drivers,
    supportedGraphDAOs
  ) {

    // We automatically set skipEdgeIndexation to true if canIndexEdges is false
    if (!features.canIndexEdges) {
      options.skipEdgeIndexation = true;
    }

    super(
      'Index',
      vendor,
      requiredOptions.concat(['indexName']),
      availableOptions.concat(['indexName', 'skipEdgeIndexation']),
      options,
      graphDao,
      connectors,
      drivers
    );

    if (!features) {
      throw Errors.technical('bug', 'Index DAO: "features" is required');
    }

    if (features.schema === null) {
      features.schema = {
        counts: false,
        properties: false,
        inferred: false
      };
    }

    this._features = features;
    Utils.check.properties('features', this._features, {
      external: {required: true, type: 'boolean'},
      schema: {
        required: true,
        properties: {
          counts: {required: true, type: 'boolean'},
          properties: {required: true, type: 'boolean'},
          inferred: {required: true, type: 'boolean'}
        }
      },
      canCount: {required: true, type: 'boolean'},
      typing: {required: true, type: 'boolean'},
      fuzzy: {required: true, type: 'boolean'},
      canIndexEdges: {required: true, type: 'boolean'},
      canIndexCategories: {required: true, type: 'boolean'},
      versions: {required: true, type: 'boolean'},
      advancedQueryDialect: {check: 'nonEmpty'},
      searchHitsCount: {required: true, type: 'boolean'}
    });

    if (Utils.hasValue(supportedGraphDAOs) && !supportedGraphDAOs.includes(graphDao.vendor)) {
      throw Errors.business('invalid_parameter',
        'Index vendor ' + vendor + ' is not compatible with the graph vendor "' + graphDao.vendor +
        '". Please use one of the following instead: "' + supportedGraphDAOs.join('", "') + '".');
    }

    // Item (node or edge) version is assumed to be incremental where the first version of an item
    // is 1. This is not true for some vendor like neo2esDAO.
    this.$nodeVersionOffset = 0;
  }

  /**
   * @type {IndexDriver}
   */
  get driver() {
    if (this.$driver) {
      return this.$driver;
    }

    return Utils.NOT_IMPLEMENTED();
  }

  /**
   * The features supported by the underlying index.
   *
   * @type {IndexFeatures}
   */
  get features() {
    return this._features;
  }

  /**
   * Default number of document per page (search results are paginated).
   *
   * @type {number}
   */
  get DEFAULT_PAGE_SIZE() {
    return 20;
  }

  /**
   * Create an Index DAO instance.
   *
   * @param {string}   vendor   Vendor name
   * @param {any}      options  IndexDAO constructor options
   * @param {GraphDAO} graphDao The connected Graph DAO
   * @returns {IndexDAO}
   */
  static createInstance(vendor, options, graphDao) {
    return /**@type {IndexDAO}*/ (DAO.createInstance('Index', vendor, options, graphDao));
  }

  /**
   * Get the number of nodes or edges in the search index.
   *
   * @param {string} type 'node' or 'edge'
   * @returns {Bluebird<number>}
   */
  getSize(type) {
    if (!this.features.canCount) {
      return Errors.business('not_supported', 'Counting nodes and edges is not supported ' +
        'by ' + this.vendor + '.', true);
    } else {
      return this.$getSize(type);
    }
  }

  /**
   * Get the number of nodes or edges in the search index.
   *
   * @param {string} type 'node' or 'edge'
   * @returns {Bluebird<number>}
   */
  $getSize(type) { return this.driver.$getSize(type); }

  /**
   * Index nodes or edges.
   *
   * @param {string}              type    'node' or 'edge'
   * @param {LkNode[] | LkEdge[]} entries Entries to add
   * @returns {Bluebird<void>}
   */
  addEntries(type, entries) {
    return Promise.resolve().then(() => {
      if (this.features.external) { return; }

      Utils.check.array('entries', entries);
      Utils.check.values('type', type, ['node', 'edge']);

      // nothing to do
      if (entries.length === 0) { return; }

      return this.$addEntries(type, entries);
    });
  }

  /**
   * Index nodes or edges.
   *
   * @param {string}              type    'node' or 'edge'
   * @param {LkNode[] | LkEdge[]} entries Entries to add
   * @returns {Bluebird<void>}
   */
  $addEntries(type, entries) { return this.driver.$addEntries(type, entries); }

  /**
   * Return the name of the property in options.filter passed to IndexDAO::search that represents
   * the filter for category or type.
   *
   * @param {string} type 'node' or 'edge'
   * @private
   */
  _getCategoryFilterPropertyName(type) {
    if (type === 'node') {
      return '[categories]';
    } else { // edge
      return '[type]';
    }
  }

  /**
   * Search for nodes or edges using `searchString`.
   * Search results are grouped by categories or types.
   *
   * If `options.idOnly` is true, highlighting and grouping are disabled and `results` is a string[].
   *
   * @param {string} type              'node' or 'edge'
   * @param {string} searchString      Query that will be forwarded to the index. It may be either
   *                                   plain text or formatted in a supported query language
   * @param {Partial<LkSearchOptions>} options
   * @returns {Bluebird<LkSearchResponse>}
   */
  search(type, searchString, options) {
    options = Utils.clone(options);

    if (Utils.noValue(searchString) || searchString === '') {
      return Errors.business('missing_field', 'Query `q` is required', true);
    }

    if (type === 'edge' && !this.features.canIndexEdges) {
      return Promise.resolve({type: type, totalHits: 0, results: []});
    }

    return Promise.resolve().then(() => {
      Utils.check.values('type', type, ['node', 'edge']);
      Utils.check.nonEmpty('searchString', searchString);

      Utils.check.properties('options', options, {
        size: {check: ['integer', 1]},
        from: {check: 'integer'},
        fuzziness: {check: ['number', 0, 1]},
        // category '[no_category]' means "nodes with no categories"
        categoriesOrTypes: {arrayItem: {required: false, type: 'string'}},
        idOnly: {type: 'boolean'},
        full: {type: 'boolean'},
        filter: {
          arrayItem: {
            arraySize: 2,
            arrayItem: {type: ['string', 'number']}
          }
        }
      });

      if (options.full && options.idOnly) {
        return Errors.business('invalid_parameter', '\'options.full\' and \'options.idOnly\'' +
          ' cannot be both true.', true);
      }

      const categoryPropertyName = this._getCategoryFilterPropertyName(type);

      // Categories filters from the API come in the option `filter`
      // e.g.: if options.filters contains ['[categories]', 'PERSON']
      // we add 'PERSON' to options.categoriesOrTypes and we remove it from options.filters
      const categoryFilter = _.filter(options.filter, f => f[0] === categoryPropertyName);
      if (categoryFilter.length > 0) {
        // If we have such a filter, we move it to the option `categoriesOrTypes`
        if (Utils.hasValue(options.categoriesOrTypes)) {
          options.categoriesOrTypes.push(categoryFilter[0][1]);
        } else {
          options.categoriesOrTypes = [categoryFilter[0][1]];
        }

        // and we remove it from the option `filter`
        options.filter = _.filter(options.filter, f => f[0] !== categoryPropertyName);
      }

      // set default values
      options.from = Utils.noValue(options.from) ? 0 : Math.max(0, options.from);
      options.size = Utils.noValue(options.size)
        ? this.DEFAULT_PAGE_SIZE
        : Math.max(1, options.size);

      // default value for fuzziness is 0.9 (1 == not fuzzy, 0.1 == very fuzzy)
      options.fuzziness = Utils.noValue(options.fuzziness)
        ? DEFAULT_FUZZINESS
        // prevent (fuzziness < 0.1) and (fuzziness > 1)
        : Math.max(0.1, Math.min(1, options.fuzziness));

      return this.$search(
        type, searchString, /**@type {LkSearchOptions}*/ (options)
      ).then(searchResult => {
        if (options.idOnly) {
          return searchResult;
        }

        // Sort search results by category name
        searchResult.results = _.orderBy(
          /**@type {string[]}*/ (searchResult.results), ['title'], ['asc']
        );

        return searchResult;
      });
    });
  }

  /**
   * Search for nodes or edges using `searchString`.
   * Search results are grouped by categories or types.
   *
   * If `options.idOnly` is true, highlighting and grouping are disabled and `results` is a string[].
   *
   * @param {string} type         'node' or 'edge'
   * @param {string} searchString Query that will be forwarded to the index. It may be either
   *                              plain text or formatted in a supported query language
   * @param {LkSearchOptions}     options
   * @returns {Bluebird<LkSearchResponse>}
   */
  $search(type, searchString, options) { return this.driver.$search(type, searchString, options); }

  /**
   * Get a detailed schema from the index.
   *
   * @param {string}  type             'node' or 'edge'
   * @param {boolean} [withProperties] Whether to include properties
   * @returns {Bluebird<{name: string, count?: number, properties?: {key: string, count?: number}[]}[]>}
   */
  getSchema(type, withProperties) {
    Utils.check.values('type', type, ['node', 'edge']);

    return this.$getSchema(type, withProperties);
  }

  /**
   * Get a detailed schema from the index.
   *
   * @param {string}  type           'node' or 'edge'
   * @param {boolean} withProperties Whether to include properties
   * @returns {Bluebird<{name: string, count?: number, properties?: {key: string, count?: number}[]}[]>}
   */
  $getSchema(type, withProperties) { return this.driver.$getSchema(type, withProperties); }

  /**
   * Remove all entries from the index and make a new one.
   *
   * @returns {Bluebird<void>}
   */
  clear() {
    if (this.features.external) { return Promise.resolve(); }

    return this.$deleteIfExists().then(() => {
      return this.$createIndex();
    });
  }

  /**
   * Delete the index if it exists.
   *
   * @returns {Bluebird<boolean>} true if an index was deleted
   */
  $deleteIfExists() { return this.driver.$deleteIfExists(); }

  /**
   * Create the index.
   *
   * @returns {Bluebird<void>}
   */
  $createIndex() { return this.driver.$createIndex(); }

  /**
   * Commit the changes to the Index server.
   *
   * @returns {Bluebird<void>}
   */
  commit() {
    if (this.features.external) { return Promise.resolve(); }

    return this.$commit();
  }

  /**
   * Commit the changes to the Index server.
   *
   * @returns {Bluebird<void>}
   */
  $commit() {
    return Utils.retryPromise(
      'commit write to search index',
      () => this.driver.$commit(),
      {delay: 3000, retries: 5}
    );
  }

  /**
   * Index an entry if it doesn't exist or update it if it does.
   *
   * @param {string}          type  'node' or 'edge'
   * @param {LkNode | LkEdge} entry Entries to add
   * @returns {Bluebird<number>} the version of the entry
   */
  upsertEntry(type, entry) {
    return Promise.resolve().then(() => {
      if (this.features.external) { return 1; }

      Utils.check.values('type', type, ['node', 'edge']);
      Utils.check.object('entry', entry);

      return this.$upsertEntry(type, entry);
    });
  }

  /**
   * Index an entry if it doesn't exist or update it if it does.
   *
   * @param {string}          type  'node' or 'edge'
   * @param {LkNode | LkEdge} entry Entries to add
   * @returns {Bluebird<number>} the version of the entry
   */
  $upsertEntry(type, entry) { return this.driver.$upsertEntry(type, entry); }

  /**
   * Delete an entry.
   *
   * @param {string}  id               ID of the entry to delete
   * @param {string}  type             'node' or 'edge'
   * @param {boolean} [ignoreNotFound] Whether to resolve if the entry to delete was not found
   * @returns {Bluebird<void>}
   */
  deleteEntry(id, type, ignoreNotFound) {
    return Promise.resolve().then(() => {
      if (this.features.external) { return; }

      Utils.check.values('type', type, ['node', 'edge']);

      return this.$deleteEntry(id, type, ignoreNotFound);
    });
  }

  /**
   * Delete an entry.
   *
   * @param {string}  id               ID of the entry to delete
   * @param {string}  type             'node' or 'edge'
   * @param {boolean} [ignoreNotFound] Whether to resolve if the entry to delete was not found
   * @returns {Bluebird<void>}
   */
  $deleteEntry(id, type, ignoreNotFound) {
    return this.driver.$deleteEntry(id, type, ignoreNotFound);
  }

  /**
   * Set the `version` field for nodes and edges.
   * If a given entry is not indexed, set its version to 0.
   *
   * @param {LkNode[]} [nodes] Nodes
   * @param {LkEdge[]} [edges] Edges
   *
   * @returns {Bluebird<void>}
   */
  setVersions(nodes, edges) {
    if (Utils.noValue(nodes)) {
      nodes = [];
    }
    if (Utils.noValue(edges)) {
      edges = [];
    }

    Utils.check.array('nodes', nodes);
    Utils.check.array('edges', edges);

    if (!nodes.length && !edges.length) { return Promise.resolve(); }

    const nodeMap = Utils.indexBy(nodes, node => node.id);
    const edgeMap = Utils.indexBy(edges, edge => edge.id);

    return this._getVersions(
      Array.from(nodeMap.keys()), Array.from(edgeMap.keys())
    ).then(versions => {
      // set version on nodes (version 0 if not found)
      for (const e of nodeMap.entries()) {
        e[1].version = versions.nodes[e[0]] + this.$nodeVersionOffset || 0;
      }
      // set version on edges (version 0 if not found)
      for (const e of edgeMap.entries()) {
        e[1].version = versions.edges[e[0]] || 0;
      }
    });
  }

  /**
   * Get the versions of nodes and edges. The result is two objects, one for each type, with
   * the IDs as keys and the versions of the entries as values.
   *
   * @param {string[]} nodeIds IDs of the nodes
   * @param {string[]} edgeIds IDs of the edges
   *
   * @returns {Bluebird<{edges: object, nodes: object}>}
   * @private
   */
  _getVersions(nodeIds, edgeIds) {
    if (this.features.versions) {
      return Promise.props({
        nodes: nodeIds.length === 0 ? [] : this.$getItemVersions('node', nodeIds),
        edges: edgeIds.length === 0 ? [] : this.$getItemVersions('edge', edgeIds)
      });
    } else {
      return Promise.resolve({
        // if versions are disabled, the version is always 1
        nodes: Utils.arrayToMap(nodeIds, 1),
        edges: Utils.arrayToMap(edgeIds, 1)
      });
    }
  }

  /**
   * Return an object with the IDs as keys and the versions of the entries as values.
   *
   * @param {string}   type 'node' or 'edge'
   * @param {string[]} ids
   * @returns {Bluebird<object>}
   */
  $getItemVersions(type, ids) { return this.driver.$getItemVersions(type, ids); }

  /**
   * Get the type of the properties of nodes and edges.
   * Return an object with the property names as keys and the type of those properties as values.
   *
   * Possible returned type values are:
   * - string
   * - integer
   * - float
   * - boolean
   * - date
   *
   * @param {string} type 'node' or 'edge'
   * @returns {Bluebird<object>}
   */
  getPropertyTypes(type) {
    Utils.check.values('type', type, ['node', 'edge']);

    if (!this.features.typing) { return Promise.resolve({}); }

    return this.$getPropertyTypes(type);
  }

  /**
   * Get the type of the properties of nodes and edges.
   * Return an object with the property names as keys and the type of those properties as values.
   *
   * Possible returned type values are:
   * - string
   * - integer
   * - float
   * - boolean
   * - date
   *
   * @param {string} type 'node' or 'edge'
   * @returns {Bluebird<object>}
   */
  $getPropertyTypes(type) { return this.driver.$getPropertyTypes(type); }

  /**
   * Run the indexation of the external index.
   *
   * @param {Progress} progress Instance used to keep track of the progress
   * @returns {Bluebird<void>}
   */
  indexSource(progress) {
    return Promise.resolve().then(() => {
      if (!this.features.external) { return; }

      return this.$indexSource(progress);
    });
  }

  /**
   * Run the indexation of the external index.
   *
   * @param {Progress} progress Instance used to keep track of the progress
   * @returns {Bluebird<void>}
   */
  $indexSource(progress) { return this.driver.$indexSource(progress); }
}

module.exports = IndexDAO;
