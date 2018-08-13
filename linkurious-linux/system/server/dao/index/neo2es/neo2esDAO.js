/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-06-22.
 */
'use strict';

/* eslint no-unused-vars: 0 */ // fix with refactoring

// libraries
const Promise = require('bluebird');
const _ = require('lodash');

// imports
const AbstractElasticDAO = require('../abstractElasticDAO');
const LKE = require('../../../services/index');

const DaoUtils = require('../../utils/daoUtils');

// services
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();
const Log = LKE.getLogger(__filename);

/**
 * Index DAO to communicate with an index generated bu the "neo4j-to-elasticsearch" plugin
 */
class N2ESPluginDAO extends AbstractElasticDAO {

  constructor(options, graphDao) {
    super('neo2es', [], [], options, {
      canCount: true,
      fuzzy: true,
      canIndexEdges: true,
      canIndexCategories: true,
      versions: false,
      searchHitsCount: true,

      external: true,
      schema: {
        counts: true,
        properties: true,
        inferred: false
      },
      typing: true,
      advancedQueryDialect: 'elasticsearch'
    });

    // workaround for Neo2ES version offset starting at "2"
    this.$nodeVersionOffset = -1;

    // check if graph vendor is neo4j
    if (graphDao.vendor !== 'neo4j') {
      throw Errors.technical(
        'critical', `Cannot use "${this.vendor}" with Graph DAO "${graphDao.vendor}".`, true
      );
    }

    // Note: Neo2es is only for Neo4j > 3.0 (the plugin and the procedures were not available before)

    /**
     * @type {Neo4jDAO}
     */
    this.graph = graphDao;
  }

  /**
   * @inheritdoc
   */
  $nodeCategoriesField(raw) {
    return '_labels' + (raw ? '.raw' : '');
  }

  /**
   * @inheritdoc
   */
  $edgeTypeField(raw) {
    return '_relationship' + (raw ? '.raw' : '');
  }

  /**
   * @inheritdoc
   */
  connect() {
    // check that neo4j-to-elasticsearch and graphaware-server-community-all
    // are installed => they should be listed in Neo4j in classpath
    return this.graph.connector.$queryJmx('java.lang', 'type=Runtime', 'ClassPath')
      .then(config => {

        const gaFwkPlugin = /graphaware-server-community-all-(.*?)\.jar/g.exec(config);

        const neo2esPlugin = /graphaware-neo4j-to-elasticsearch-(.*?)\.jar/g.exec(config);

        if (Utils.noValue(gaFwkPlugin)) {
          Log.warn('The GraphAware framework does not seem to be installed.');
          return;
        }

        if (Utils.noValue(neo2esPlugin)) {
          Log.warn('The Neo4j plugin "neo4j-to-elasticsearch" does not seem to be installed.');
          return;
        }

        // Check versions
        const gaFwkVersion = gaFwkPlugin[1];
        const neo2esVersion = neo2esPlugin[1];

        if (neo2esVersion.toLowerCase().includes('snapshot')) {
          // It's safe to assume we gave them the plugin
          Log.warn('"neo4j-to-elasticsearch" SNAPSHOT plugin used: ' + neo2esPlugin[0]);
          return;
        }

        const neo2esMinVersion = '3.1.0.44.7';

        if (Utils.compareSemVer(neo2esVersion, neo2esMinVersion) < 0) {
          Log.warn('The version of Neo4j plugin "neo4j-to-elasticsearch" version ' + neo2esVersion +
            ' must be above ' + neo2esMinVersion);
          return;
        }

        // We assume that the Neo2ES plugin is always based on the compatible GraphAware version
        if (!neo2esVersion.startsWith(gaFwkVersion)) {
          Log.warn('The Neo4j plugin "neo4j-to-elasticsearch" version ' + neo2esPlugin +
            'is not compatible with the GraphAware framework version' + gaFwkVersion);
        }

        // check if neo2es plugin is installed
      }).then(() => this._esQuery('ga.es.initialized()', 'status')).catch(Errors.LkError, e => {
        if (e.key === 'bad_graph_request') {
          return Errors.business(
            'index_unreachable',
            'The Neo4j plugin "neo4j-to-elasticsearch" does not seem to be installed. ' +
            'The procedures "ga.*" may not be whitelisted (bad_graph_request).',
            true
          );
        }
        return Promise.reject(e);
      }).then(initialized => {
        if (!initialized) {
          return Errors.business(
            'index_unreachable',
            'The Neo4j plugin "neo4j-to-elasticsearch" is not initialized.',
            true
          );
        }

        // get the current ES version
        return this._esQuery('ga.es.info()', 'json').then(
          json => global.JSON.parse(json)
        ).then(info => {
          this._version = info.version.number;
          return this._version;
        });
      });
  }

  /**
   * @param {string} q
   * @param {string} valueName
   * @returns {Bluebird<Object|LkError>}
   * @private
   */
  _esQuery(q, valueName) {
    const query = 'CALL ' + q + ' YIELD ' + valueName + ' as r RETURN r';

    return this.graph.connector.$doCypherQuery(query).then(response => {
      return response.results[0].rows[0];
    });
  }

  _rawQuery(type, query) {
    const q = global.JSON.stringify(global.JSON.stringify(query));
    return this._esQuery(
      'ga.es.query' + (type === 'node' ? 'Node' : 'Relationship') + 'Raw(' + q + ')', 'json'
    ).then(json => global.JSON.parse(json)).then(response => {
      if (response.error) {
        return Promise.reject(response.error);
      }
      return response;
    });
  }

  /**
   * @inheritdoc
   */
  checkUp() { return Promise.resolve(); }

  /**
   * @inheritdoc
   */
  $getSize(type) {
    return this._rawQuery(type, {size: 0}).then(r => r.hits.total);
  }

  /**
   * @inheritdoc
   */
  $indexExists() {
    return this.$getSize('node').return(true).catch(e => false);
  }

  $resolveESType(itemType) {
    return itemType === 'node' ? 'node' : 'relationship';
  }

  $resolveESIndex(itemType) {
    return undefined;
  }

  /**
   * @inheritdoc
   */
  $getSchema(itemType, withProperties) {
    // $getSchema used to fail due to a timeout error/heap size error because of the aggregation
    // We fallback to $getSimpleSchema done by Neo4j
    return super.$getSchema(itemType, withProperties).catch(e => {
      Log.debug('$getSchema failed, falling back to graph simple schema', e);

      return this.graph.getSimpleSchema().then(simpleR => {
        const types = itemType === 'node' ? simpleR.nodeCategories : simpleR.edgeTypes;

        let properties = undefined;
        if (withProperties) {
          properties = (itemType === 'node' ? simpleR.nodeProperties : simpleR.edgeProperties).map(
            property => ({key: property})
          );
        }
        return types.map(type => ({name: type, properties: properties}));
      });
    });
  }

  /**
   * @inheritdoc
   */
  $search(type, searchString, options) {
    // Highlight is too expensive to be done by ES
    // So we get all the item ids from the ES, we look for these items in Neo4j
    // and we highlight them in Linkurious
    const failSafeSearchOptions = Utils.clone(options);
    failSafeSearchOptions.idOnly = true;

    return this._failSafeSearch(type, searchString, failSafeSearchOptions).then(result => {
      const ids = result.hits.hits.map(o => o._id);
      const totalHits = result.hits.total;

      if (options.idOnly) {
        return {
          type: type,
          totalHits: totalHits,
          results: ids
        };
      }

      return Promise.resolve().then(() => {
        if (type === 'node') {
          return this.graph.getNodesByID({ids: ids, edges: 'none'});
        } else {
          return this.graph.getEdgesByID({ids: ids});
        }
      }).then(items => {
        return DaoUtils.buildSearchResponse(type, items, totalHits, searchString, options);
      });
    });
  }

  /**
   * @inheritdoc
   */
  $searchPromise(itemType, query) {
    const queryBody = query.body;
    queryBody.from = query.from;
    queryBody.size = query.size;
    queryBody.version = query.version;

    //console.log('QUERY: ' + JSON.stringify(queryBody, null, ' '))

    return this._rawQuery(itemType, queryBody);
  }

  /**
   * @inheritdoc
   */
  $getPropertyTypes(itemType) {
    const q = itemType === 'node'
      ? 'ga.es.nodeMapping()'
      : 'ga.es.relationshipMapping()';
    return this._esQuery(q, 'json').then(json => {
      const r = global.JSON.parse(json);
      const mapping = {};
      const excluded = itemType === 'node' ? this.$nodeCategoriesField() : this.$edgeTypeField();
      _.forEach(r.mappings[this.$resolveESType(itemType)].properties, (m, propertyKey) => {
        if (propertyKey === excluded) { return; }
        mapping[propertyKey] = this.MAPPING_ES_TYPE[m.type];
      });
      return mapping;
    });
  }

  /**
   * Generate a nodeCategory or edgeType filter
   *
   * @param {string} type 'node' or 'edge'
   * @param {string[]} categoriesOrTypes include '[no_category]' for nodes with no categories
   * @returns {Object} ES filter
   */
  $makeCategoriesOrTypesFilter(type, categoriesOrTypes) {
    // detect request to include 'no category/label' items
    // 'includeNone' can't happen for edges in Neo4j
    const includeNone = (type === 'node') &&
      _.includes(categoriesOrTypes, DaoUtils.LABEL_NODES_WITH_NO_CATEGORY);

    categoriesOrTypes = _.filter(categoriesOrTypes, term => {
      return term !== DaoUtils.LABEL_NODES_WITH_NO_CATEGORY;
    });

    const field = type === 'node' ? this.$nodeCategoriesField(true) : this.$edgeTypeField(true);
    if (includeNone) {
      return {or: [
        {missing: {field: this.$nodeCategoriesField(true)}},
        {terms: {
          [field]: categoriesOrTypes,
          execution: 'plain'
        }}
      ]};
    } else {
      return {terms: {
        [field]: categoriesOrTypes,
        execution: 'plain'
      }};
    }
  }

  // not needed

  $addEntries() {}
  $commit() {}
  $upsertEntry() {}
  $deleteEntry() {}
  $deleteIfExists() {}
  $createIndex() {}
  $indexSource() {}
}

module.exports = N2ESPluginDAO;
