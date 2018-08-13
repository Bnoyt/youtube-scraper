/**
 * LINKURIOUS CONFIDENTIAL
 * __________________
 *
 *  [2012] - [2014] Linkurious SAS
 *  All Rights Reserved.
 *
 *  Description: This file handles the link between the Linkurious API and
 *  the Elasticsearch one.
 *
 */
'use strict';

/* eslint no-unused-vars: 0 */ // fix with refactoring

// ext libs
const _ = require('lodash');
const Promise = require('bluebird');
const elasticsearch = require('elasticsearch');

// services
const LKE = require('../../../services/index');
const Log = LKE.getLogger(__filename);
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();

// locals
const AbstractElasticDAO = require('../abstractElasticDAO');

/**
 * Embedded ElasticSearch index DAO
 */
class ElasticSearchDAO extends AbstractElasticDAO {
  /**
   * ElasticSearch DAO constructor
   *
   * @param {Object} options
   * @param {String} options.host server host
   * @param {String|Number} options.port server port
   * @param {String} options.indexName index name
   * @param {String} [options.mapping] custom mapping options (see ElasticSearch manual)
   * @param {boolean} [options.https] whether to use an HTTPS connection
   * @param {GraphDAO} graphDao The connected Graph DAO
   * @constructor
   */
  constructor(options, graphDao) {
    super(
      'elasticSearch',
      ['host', 'port'],
      [
        'url', 'host', 'port', 'mapping', 'forceReindex',
        'dynamicMapping', 'dateDetection', 'user', 'password', 'https', 'analyzer'
      ],
      options,
      {
        canCount: true,
        fuzzy: true,
        canIndexEdges: true,
        canIndexCategories: true,
        versions: true,
        searchHitsCount: true,

        // this is the internally-indexed ES index
        external: false,

        // we cannot read the schema from ES since "aggregations" are not supported
        schema: null,

        // we use the mapping to read types from ES
        typing: true,

        advancedQueryDialect: 'elasticsearch'
      }
    );

    // TODO refactor this check with ES refactoring
    // check if graph vendor is different from DSE and stardog
    if (graphDao.vendor === 'dse' || graphDao.vendor === 'stardog') {
      throw Errors.technical(
        'critical', `Cannot use "${this.vendor}" with Graph DAO "${graphDao.vendor}".`, true
      );
    }

    if (Utils.hasValue(options.url)) {
      this.url = options.url;
    } else {
      let auth = '';
      if (Utils.hasValue(options.user) && Utils.hasValue(options.password)) {
        auth = options.user + ':' + options.password + '@';
      }
      this.url = `http${options.https ? 's' : ''}://${auth}${options.host}:${options.port}`;
    }

    this.fieldDataHeapLimit = null;

    // we do not let ElasticSearch print any logs.
    // to change the way ElasticSearch logs, see the documentation:
    // http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/logging.html
    function LogPlug() {
      //this.error = Log.error.bind(Log),
      this.error = () => {};
      this.warning = () => {};
      this.info = () => {};
      this.debug = () => {};
      this.trace = () => {};
      this.close = () => {};
    }

    this.esclient = new elasticsearch.Client({
      log: LogPlug,
      host: this.url,
      apiVersion: '1.2'
    });
  }

  /**
   * @param {LkNode|LkEdge} item
   * @param {number} item.version version increment
   * @param {string} type 'node' or 'edge'
   *
   * @returns {{id: string, type: string, data: object, version?: number}}
   * @private
   */
  _formatDataToIndex(item, type) {
    const result = {
      id: item.id,
      type: type === 'node' ? 'node' : 'edge',
      version: item.version,
      data: Utils.clone(item.data)
    };

    if (type === 'edge') {
      result.data['lk_type'] = item.type;
    } else if (item.categories) {
      result.data['lk_categories'] = item.categories;
    }

    return result;
  }

  /**
   * @inheritdoc
   */
  connect() {
    const timeout = this.DEFAULT_PING_TIMEOUT * 1000;
    return new Promise((resolve, reject) => {

      /**
       * Connection-error handler
       *
       * @param {*} err
       * @returns {boolean} true if there was an error.
       */
      const handleError = err => {
        if (err) {
          reject(Errors.technical('index_unreachable', 'Cannot connect to ElasticSearch: ' +
            (err.message ? err.message : err)
          ));
          return true;
        } else {
          return false;
        }
      };

      this.esclient.info({timeout: timeout}, (err, info) => {
        if (handleError(err)) { return; }

        const version = info.version.number;
        if (Utils.compareSemVer(version, '2.0.0') >= 0) {
          reject(Errors.business(
            'not_supported',
            'ElasticSearch 2.x is not supported by this driver. Please use ElasticSearch 2 driver.'
          ));
        }

        this.esclient.cluster.stats({timeout: timeout}, (err, stats) => {
          if (handleError(err)) { return; }

          // default to 1GB is the value is zero or undefined (zero actually happens)
          const maxHeap = stats.nodes.jvm.mem['heap_max_in_bytes'] || (1024 * 1000 * 1000);

          this.esclient.cluster.getSettings({timeout: timeout}, (err, settings) => {
            // default values
            let fieldDataLimit = '60%';
            let fieldDataOverhead = 1.03;

            // ignore error: this will fails (HTTP 401) in AWS because of security policies
            if (!err) {
              // see https://www.elastic.co/guide/en/elasticsearch/reference/1.5/index-modules-fielddata.html
              fieldDataLimit = settings.persistent['indices.breaker.fielddata.limit'] || '60%';
              fieldDataOverhead = settings.persistent['indices.breaker.fielddata.limit'] || 1.03;
            }

            const fieldDataLimitRatio = fieldDataLimit.replace('%', '') / 100;
            // maximum number of bytes that can be used by field-data (e.g.: sorting)
            this.fieldDataHeapLimit = Math.floor(maxHeap * fieldDataLimitRatio / fieldDataOverhead);

            resolve(version);
          });
        });
      });
    }).then(version => {
      // fill the size caches and return the version
      return Promise.join(version, this.$getSize('node'),
        this.$getSize('edge'), version => version);
    });
  }

  /**
   * @inheritdoc
   */
  $indexExists() {
    return this._indexAction('exists', {expandWildcards: 'closed'});
  }

  /**
   * @inheritdoc
   */
  $deleteIfExists() {
    return this.$indexExists().then(exists => {
      if (!exists) {
        return false;
      }
      return this._indexAction('delete');
    }).then(() => {
      return true;
    });
  }

  /**
   * @inheritdoc
   */
  checkUp() {
    return new Promise((resolve, reject) => {
      this.esclient.ping({requestTimeout: this.DEFAULT_PING_TIMEOUT * 1000}, err => {
        if (err) {
          reject(Errors.technical('index_unreachable', 'Cannot connect to ElasticSearch: ' +
            (err.message ? err.message : err)
          ));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * @inheritdoc
   */
  $getSize(type) {
    const indexName = this.$resolveESIndex(type);
    return new Promise((resolve, reject) => {
      this.esclient.count({
        index: indexName,
        ignoreUnavailable: true,
        type: type
      }, (err, result) => {
        if (err && err.message) {
          if (err.message === 'IndexMissingException[[' + indexName + '] missing]') {
            return resolve(0);
          }
          if (err.message === 'Service Unavailable') {
            return resolve(0);
          }
        }
        if (err) {
          return this.onError(reject, err, undefined, type);
        }
        if (!result) {
          return resolve(0);
        }

        resolve(result.count);
      });
    });
  }

  /**
   * @inheritdoc
   */
  $commit() {
    return new Promise((resolve, reject) => {
      this.esclient.indices.flush({index: this.options.indexName}, err => {
        if (err) {
          return this.onError(reject, err);
        }
        resolve();
      });
    });
  }

  /**
   * @inheritdoc
   */
  $createIndex() {
    const defaultAnalyzer = this.getOption('analyzer', 'standard');

    // analysis config
    const analysisConfig = {
      analyzer: {
        // sort field (*.sort) analyser
        'lk_sort': {
          type: 'custom',
          tokenizer: 'keyword',
          filter: [
            //'icu_collation',
            'lowercase', // lowercase all chars
            'trim', // remove white chars at start/end
            'truncateSort' // cut sort field at 15 chars
          ]
        }
      },
      filter: {
        truncateSort: {
          type: 'truncate',
          length: this.SORT_FIELD_LENGTH
        }
      }
    };

    // field for sorting
    const sortField = {sort: {
      type: 'string', analyzer: 'lk_sort', stored: false, 'include_in_all': false //, index: 'no'
    }};

    // dynamic mapping safety (default: true). see issue #273
    const dynamicMapping = this.getOption('dynamicMapping', true);

    // dynamic template for sorting sub-field
    const fieldTemplate = {
      'lk_template': {
        match: '*',
        mapping: {
          type: dynamicMapping ? '{dynamic_type}' : 'string',
          analyzer: defaultAnalyzer,
          fields: sortField
        }
      }
    };

    // set node/edge mapping
    let mapping = {};
    if (this.options.mapping) {
      mapping = this.options.mapping;
    }
    const nodeMapping = Utils.clone(mapping);
    nodeMapping[this.$nodeCategoriesField()] = {type: 'string', fields: sortField};
    const edgeMapping = Utils.clone(mapping);
    edgeMapping[this.$edgeTypeField()] = {type: 'string', fields: sortField};

    // date detection safety. (default: false). see issues #282
    const dateDetection = this.getOption('dateDetection', false);

    return this._indexAction('create', {
      body: {
        settings: {
          // custom analyzer for efficient sorting. see:
          // https://www.elastic.co/guide/en/elasticsearch/guide/master/sorting-collations.html
          analysis: analysisConfig
        },
        mappings: {
          '_default_': {
            'dynamic_templates': [fieldTemplate]
          },
          node: {
            'date_detection': dateDetection,
            properties: nodeMapping,
            dynamic: true // must always be true to allow dynamic templates
          },
          edge: {
            'date_detection': dateDetection,
            properties: edgeMapping,
            dynamic: true // must always be true to allow dynamic templates
          }
        }
      }
    }).catch(Errors.LkError, e => {
      if (e.message.indexOf('IndexAlreadyExistsException') > 0) {
        // ignore this error
        return;
      }
      return Promise.reject(e);
    });
  }

  /**
   * Call method `action` on ESClient.indices with options (`index:indexName` is added to options)
   *
   * @param {string} action action name
   * @param {object} [options]
   * @returns {Bluebird<*>}
   * @private
   */
  _indexAction(action, options) {
    if (!options) { options = {}; }
    options.index = this.options.indexName;

    return new Promise((resolve, reject) => {
      // create new index
      this.esclient.indices[action](options, (err, result) => {
        if (err) {
          return this.onError(
            reject, err, 'could not ' + action + ' index "' + options.index + '"'
          );
        }
        resolve(result);
      });
    });
  }

  /**
   * @inheritdoc
   */
  $upsertEntry(type, entry) {
    const indexEntry = this._formatDataToIndex(entry, type);
    return new Promise((resolve, reject) => {
      this.esclient.update({
        // force an index refresh to make sur we read up-to-date values in the next read
        // todo: check if 'realtime' in getVersions would be better
        //   see:
        //   Boolean — Specify whether to perform the operation in realtime or search mode
        refresh: true,
        index: this.$resolveESIndex(indexEntry.type),
        type: this.$resolveESType(indexEntry.type),
        id: indexEntry.id,
        body: {
          doc: indexEntry.data,
          'doc_as_upsert': true
        }
      }, (err, result) => {
        if (err) {
          if (err.message && err.message.match('DocumentMissingException')) {
            const key = indexEntry.type === 'node' ? 'node_not_found' : 'edge_not_found';
            return reject(Errors.business(key, JSON.stringify(err)));
          }
          return this.onError(reject, err, undefined, type);
        }

        resolve(result._version);
      });
    });
  }

  /**
   * Delete an entry
   *
   * @param {String} id the id fo the entry to delete
   * @param {String} type the type ('node' or 'edge') or the entry to delete
   * @param {boolean} [ignoreNotFound] whether to resolve if the entry to delet was not found
   * @returns {Promise}
   */
  $deleteEntry(id, type, ignoreNotFound) {
    return new Promise((resolve, reject) => {
      this.esclient.delete({
        index: this.$resolveESIndex(type),
        type: this.$resolveESType(type),
        id: id
      }, err => {
        if (err) {
          if (err.message && err.message.match('Not Found')) {
            if (ignoreNotFound) {
              return resolve();
            }
            const key = type === 'node' ? 'node_not_found' : 'edge_not_found';
            return reject(Errors.business(key, err));
          }
          return this.onError(reject, err, undefined, type);
        }
        return resolve();
      });
    });
  }

  /**
   * @inheritdoc
   */
  $addEntries(type, entries) {
    // about batch size:
    // http://www.elasticsearch.org/guide/en/elasticsearch/guide/current/bulk.html#_how_big_is_too_big
    // 1000 / 5000 document
    const chunkSize = 1000;

    if (entries.length === 0) {
      return Promise.resolve();
    }

    const startIndexes = [];
    if (entries.length > chunkSize) {
      for (let i = 0; i < Math.ceil(entries.length / chunkSize); ++i) {
        startIndexes.push(i * chunkSize);
      }
    } else {
      startIndexes.push(0);
    }

    return Promise.each(startIndexes, startIndex => {
      const commands = [];
      let entry;

      for (let i = startIndex; i < entries.length && i < (startIndex + chunkSize); i++) {
        commands.push({index: {
          '_id': entries[i].id
        }});
        entry = entries[i].data;
        if (type === 'node') {
          entry[this.$nodeCategoriesField()] = entries[i].categories;
        } else {
          entry[this.$edgeTypeField()] = entries[i].type;
        }
        commands.push(entry);
      }

      return new Promise((resolve, reject) => {
        this.esclient.bulk({
          index: this.$resolveESIndex(type),
          type: this.$resolveESType(type),
          body: commands
        }, (err, res) => {
          if (err) {
            return this.onError(reject, err, undefined, type);
          }

          if (res.errors && res.errors.length) {
            return this.onError(reject, res.errors, undefined, type);
          }

          if (res.errors === true) {
            let error = 'unknown error';
            _.forEach(res.items, item => {
              if (item.index && item.index.error) {
                error = item.index.error;
                return false;
              }
            });
            return this.onError(reject, error, undefined, type);
          }

          resolve();
        });
      });
    });
  }

  /**
   * @inheritdoc
   */
  $getPropertyTypes(type) {
    return this._indexAction('getMapping', {type: type}).then(res => {
      const mapping = {};
      _.forEach(res[this.options.indexName].mappings[type].properties, (m, propertyKey) => {
        mapping[propertyKey] = this.MAPPING_ES_TYPE[m.type];
      });
      return mapping;
    });
  }

  /**
   * @inheritdoc
   */
  $searchPromise(itemType, query) {
    query.index = this.$resolveESIndex(itemType);
    query.type = this.$resolveESType(itemType);

    return new Promise((resolve, reject) => {
      this.esclient.search(query, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * @inheritdoc
   */
  $resolveESType(itemType) {
    return itemType;
  }

  /**
   * @inheritdoc
   */
  $resolveESIndex(itemType) {
    return this.options.indexName;
  }

  /**
   * @param {function} reject Promise rejection callback
   * @param {*} esError
   * @param {string|undefined} [prefix]
   * @param {string} [itemType] "node" or "edge"
   */
  onError(reject, esError, prefix, itemType) {
    return reject(this.getLkError(esError, prefix, itemType));
  }
}

/**
 * @param {string} query
 * @param {string} field
 * @param {*} value
 * @returns {{query: {span_first: {end: number, match: {span_multi: {match: {}}}}}}}
 *
 * @private
 */
function spanFirstFilter(query, field, value) {
  value = value.toLowerCase();
  const f = {query: {
    'span_first': {
      end: 1,
      match: {
        'span_multi': {
          match: {}
        }
      }
    }
  }};
  f.query['span_first'].match['span_multi'].match[query] = {};
  f.query['span_first'].match['span_multi'].match[query][field] = value;
  return f;
}

module.exports = ElasticSearchDAO;
