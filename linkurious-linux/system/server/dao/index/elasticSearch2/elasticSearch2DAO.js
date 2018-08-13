/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-08-30.
 */
'use strict';

/* eslint no-unused-vars: 0 */ // fix with refactoring

// libraries
const _ = require('lodash');
const Promise = require('bluebird');
const fs = require('fs');

// imports
const IndexDAO = require('../indexDAO');
const LKE = require('../../../services/index');
const LkRequest = require('../../../lib/LkRequest');

// services
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const Log = LKE.getLogger(__filename);

const DaoUtils = require('../../utils/daoUtils');

////////////////////////////////////////////////////////////////////////////////

const EARLIEST_SUPPORTED_VERSION = '2.0';
const LATEST_SUPPORTED_VERSION = '2.4';

// size of the payload of a bulk operation
// https://www.elastic.co/guide/en/elasticsearch/guide/current/bulk.html#_how_big_is_too_big
const BULK_SIZE_IN_BYTE = 10000000; // 10MB

// name of the fields where categories and types are store in ES documents
const NODE_CATEGORIES_FIELD = 'lk_categories';
const EDGE_TYPE_FIELD = 'lk_type';

// how to translate ES field types
const MAPPING_ES_TYPE = {
  'text': 'string',
  'string': 'string',
  'byte': 'integer',
  'short': 'integer',
  'integer': 'integer',
  'long': 'integer',
  'float': 'float',
  'double': 'float',
  'boolean': 'boolean',
  'date': 'date'
};

// This fields are interesting for two reasons:
// - The score of a match on one of these fields is boosted in comparison to other fields
// - This fields are used as names in record results
const INTERESTING_FIELDS = ['name', 'title', 'label', 'caption', 'rdfs:label'];
const BOOSTED_INTERESTING_FIELDS = INTERESTING_FIELDS.map(field => field + '^1.5').concat(['_all']);

const DISPLAY_NAME_PROPERTIES_HEURISTIC = _.flatten(
  _.map(INTERESTING_FIELDS,
    e => [e, _.capitalize(e), e.toUpperCase()]
  ));

// RegExp to recognize an advanced query
const ADVANCED_QUERY_RE = /(\sAND\s|\s\|\|\s|\s&&\s|\sOR\s|>|<|\[|:|\s\+|\s-)/;

class ElasticSearch2DAO extends IndexDAO {

  /**
   * ElasticSearch2 DAO constructor
   *
   * Notes:
   * We are going to have two individual indices, one for nodes and one for edges (if edge
   * indexation is enabled).
   *
   * @param {object} options
   * @param {string} options.host                   ES host
   * @param {string|number} options.port            ES port
   * @param {boolean} [options.https]               Boolean that represents if we have to use HTTP over SSL
   * @param {string} [options.username]             ES username
   * @param {string} [options.password]             ES password
   * @param {boolean} [options.dynamicMapping=true] Boolean that represents if ES can automatically choose the type of a field
   * @param {string[]} [options.forceStringMapping] List of fields that are mapped to strings even with dynamicMapping=true
   * @param {boolean} [options.analyzer]            Analyzer used by ES to index string fields
   * @param {boolean} [options.skipEdgeIndexation]  Boolean that represents if we don't have to index the edges
   * @param {string} options.indexName              Prefix of the names of the indices
   * @param {string} options.caCert                 Absolute path to CA certificate
   * @param {GraphDAO} graphDao                     The connected Graph DAO
   * @constructor
   */
  constructor(options, graphDao) {
    super(
      'elasticSearch2', // name of the index
      ['host', 'port'], // required params
      ['host', 'port', 'https', 'user', 'password', 'dynamicMapping', 'forceStringMapping',
        'analyzer', 'forceReindex', 'caCert'], // optional params
      options,
      {
        canCount: true,
        fuzzy: true,
        canIndexEdges: true,
        canIndexCategories: true,
        versions: true,
        searchHitsCount: true,

        external: false, // this is an internal index
        schema: null, // we may produce a schema but we are an internal index and we don't care
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

    this._nodeIndexName = options.indexName + '_nodes';
    this._edgeIndexName = options.indexName + '_edges';

    // dynamicMapping set to true means that if the schema is consistent the fields are mapped
    // automatically to a type (integer, float, boolean, date, string). This break if the
    // schema is not consistent and it must be disabled. If disabled all fields are still mapped
    // automatically to the type string.
    this._dynamicMapping = this.getOption('dynamicMapping', false); // by default it's false
    this._forceStringMapping = this.getOption('forceStringMapping', []);

    this._analyzer = this.getOption('analyzer', 'lk_analyzer');

    const protocol = options.https ? 'https' : 'http';

    this._url = protocol + '://' + options.host + ':' + options.port;

    this._request = new LkRequest({
      baseUrl: this._url,
      auth: options.user ? {
        user: options.user,
        password: options.password
      } : undefined,
      json: true,
      pool: {maxSockets: 5},
      gzip: true,
      agentOptions: {
        ca: options.caCert ? fs.readFileSync(options.caCert) : undefined
      }
    }, {
      errorPrefix: 'ElasticSearch2'
    });
  }

  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Return a dynamic template that match `match` and index the matched field as a string and
   * as a not_analyzed. The not_analyzed version of the field is called `${field}.raw`.
   *
   * @param {string} match
   * @returns {object}
   * @private
   */
  _templateForNotAnalyzedFields(match) {
    const templateName = match + '_has_raw';
    const result = {};
    result[templateName] = {
      match: match,
      mapping: {
        type: 'string',
        analyzer: this._analyzer,
        fields: {
          raw: {
            type: 'string',
            index: 'not_analyzed'
          }
        }
      }
    };
    return result;
  }

  /**
   * It generate the options for the index (indices) based on the `dynamicMapping` and `analyzer`
   * options.
   *
   * @param {string} type 'node' or 'edge'
   * @returns {{mappings: {_default_: {dynamic_templates: *[]}}}}
   * @private
   */
  _newIndexOptions(type) {
    // we add a new analyzer 'lk_analyzer' that will replace `.` with ` ` but, for all the rest,
    // it will behave like the standard analyzer
    // https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis-standard-analyzer.html
    // https://www.elastic.co/guide/en/elasticsearch/guide/current/standard-analyzer.html
    const lkAnalizerIndexSettings = {
      // number_of_shards: 1, // ALWAYS use this line while analyzing the scores
      index: {
        analysis: {
          'char_filter': {
            'dot_to_whitespace': {
              type: 'pattern_replace',
              pattern: '(\\D)\\.(\\D)', // we replace any dot that is included among 2 letters
              replacement: '$1 $2'
            },
            'underscore_to_whitespace': {
              type: 'pattern_replace',
              pattern: '_', // we replace any underscore
              replacement: ' '
            }
          },
          filter: {
            'asciifolding_original': {
              type: 'asciifolding',
              'preserve_original': true
            }
          },
          analyzer: {
            'lk_analyzer': {
              tokenizer: 'standard',
              'char_filter': [
                'dot_to_whitespace',
                'underscore_to_whitespace'
              ],
              filter: ['asciifolding_original', 'lowercase', 'stop']
            }
          }
        }
      }
    };

    const mappingToString = {
      type: 'string',
      analyzer: this._analyzer
    };

    const dynamicTemplates = [];

    if (type === 'node') {
      dynamicTemplates.push(this._templateForNotAnalyzedFields(NODE_CATEGORIES_FIELD));
    } else { // 'edge'
      dynamicTemplates.push(this._templateForNotAnalyzedFields(EDGE_TYPE_FIELD));
    }

    if (!this._dynamicMapping) {
      // everything is a string
      dynamicTemplates.push(
        {
          'all_fields_are_strings': {
            match: '*',
            mapping: mappingToString
          }
        }
      );
    } else {
      // everything in forceStringMapping is forced to a string
      _.forEach(this._forceStringMapping, field => {
        const template = {};
        template[field + '_is_a_string'] = {
          match: field,
          mapping: mappingToString
        };

        dynamicTemplates.push(template);
      });

      // we change the analyzer to any other field that was mapped by dynamic mapping as a string
      dynamicTemplates.push(
        {
          'all_strings_use_this_analyzer': {
            match: '*',
            'match_mapping_type': 'string', // only what was detected by dynamic mapping as a string
            mapping: mappingToString
          }
        }
      );
    }

    const indexOptions = {
      'settings': lkAnalizerIndexSettings,
      'mappings': {
        '_default_': {
          'dynamic_templates': dynamicTemplates
        }
      }
    };

    // change _all mapping to use our analyzer
    indexOptions.mappings[type] = {
      '_all': {
        type: 'string',
        analyzer: this._analyzer
      }
    };

    return indexOptions;
  }

  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Return the index url for nodes and edges.
   *
   * @param {string} type
   * @returns {string}
   * @private
   */
  _indexUrl(type) {
    if (type === 'node') {
      return this._nodeIndexName;
    } else {
      return this._edgeIndexName;
    }
  }

  /**
   * Return the type url for nodes and edges.
   *
   * @param {string} type
   * @returns {string}
   * @private
   */
  _typeUrl(type) {
    return this._indexUrl(type) + '/' + type;
  }

  /**
   * Return the id url for a given type and id.
   *
   * @param {string} type
   * @param {*} id
   * @returns {string}
   * @private
   */
  _idUrl(type, id) {
    return this._typeUrl(type) + '/' + encodeURIComponent(id);
  }

  /**
   * Return the array of indices used by this DAO.
   * Usually used when we have to do the same operation (create, delete, flush) on both indices.
   *
   * @returns {string[]}
   * @private
   */
  _indices() {
    return [this._nodeIndexName, this._edgeIndexName];
  }

  /**
   * @param {string} type 'node' or 'edge'
   * @param {boolean} [raw] true to obtain the not_analyzed field
   * @returns {string}
   * @private
   */
  _fieldCategoriesOrTypes(type, raw) {
    let result;
    if (type === 'node') {
      result = NODE_CATEGORIES_FIELD;
    } else {
      result = EDGE_TYPE_FIELD;
    }

    if (raw) {
      return result + '.raw';
    }

    return result;
  }

  ////////////////////////////////////////////////////////////////////////////////

  /**
   * A wrapper for bulk operations to ES.
   * This function will automatically split the bulk request in many requests as long as the payload
   * of each is close to `BULK_SIZE_IN_BYTE`.
   *
   * The format of `operations` follows the pattern used by ElasticSearch:
   *   https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html
   *
   * The main difference here is that entries are not delimited by the newline character
   * (as requested by ES) but they are in an array.
   *
   * The possible actions are 'index', 'create', 'delete' and 'update'.
   * 'index', 'create' and 'update' actions require a 'source' field.
   * 'delete' cannot have a 'source' field.
   *
   * @example
   * _bulk([
   *   {
   *     action: {index: {_index: 'test', _type: 'type1', _id: 1}},
   *     source: {field1: 'value1'}
   *   },
   *   {
   *     action: {delete: {_index: 'test', _type: 'type1', _id: 2}}
   *   }
   * ])
   * It indexes a document {field1: value1} in '/test/type1/1' and it deletes '/test/type1/2'.
   *
   * @param {object[]} operations
   * @param {string} [defaultIndex] Instead of specifying the index for each bulk operation use this default index
   * @param {string} [defaultType]  Instead of specifying the type for each bulk operation use this default type (`defaultIndex` is required)
   * @returns {Bluebird<object[]>} a response for each action (exactly as returned by ES)
   * @private
   */
  _bulk(operations, defaultIndex, defaultType) {
    return Promise.resolve().then(() => {
      if (operations.length === 0) {
        return [];
      }

      // 1) split the operations in payloads of BULK_SIZE_IN_BYTE
      const payloads = [];

      let body = '';
      _.forEach(operations, operation => {
        body += global.JSON.stringify(operation.action) + '\n';
        if (Utils.hasValue(operation.source)) {
          // an 'index', 'create' and 'update' action will use 2 lines
          body += global.JSON.stringify(operation.source) + '\n';
        }

        if (body.length >= BULK_SIZE_IN_BYTE) {
          payloads.push(body);
          body = '';
        }
      });

      if (body.length > 0) {
        payloads.push(body);
      }

      let url = '';
      if (defaultIndex) {
        url += '/' + defaultIndex;
        if (defaultType) {
          url += '/' + defaultType;
        }
      }
      url += '/_bulk';

      // 2) make as many request as payloads we have
      return Promise.map(payloads, payload => {
        return this._request.post(url, {json: false, body: payload}, [200]).then(bulkR => {
          // our body is not a valid json, but the answer is, so we decode it
          return global.JSON.parse(bulkR.body);
        });
      }, {concurrency: 1}).then(multipleBulkR => {
        // we join the responses in a unique response
        return {
          errors: _.reduce(_.map(multipleBulkR, 'errors'), (clause, error) => {
            return clause || error;
          }, false),
          items: [].concat.apply([], _.map(multipleBulkR, 'items'))
        };
      });
    });
  }

  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Transform a node in another document following these rules:
   * - result = node.data
   * - result[NODE_CATEGORIES_FIELD] = node.categories
   *
   * Transform an edge in another document following these rules:
   * - result = edge.data
   * - result[EDGE_TYPE_FIELD] = edge.type
   *
   * @param {LkNode|LkEdge} lkObject
   * @param {string} type
   * @returns {object}
   * @private
   */
  _transformLkObjectToESDocument(lkObject, type) {
    const result = Utils.clone(lkObject.data);
    if (type === 'node') {
      result[NODE_CATEGORIES_FIELD] = lkObject.categories;
    } else { // edge
      result[EDGE_TYPE_FIELD] = lkObject.type;
    }
    return result;
  }

  ////////////////////////////////////////////////////////////////////////////////

  /**
   * ES2 wants the fuzziness expressed in number of characters of distance.
   * The editDistance is 0 if fuzziness === 1
   * AUTO if 0.4 <= fuzziness < 1
   * 2 if fuzziness < 0.4
   *
   * Definition of AUTO:
   * https://www.elastic.co/guide/en/elasticsearch/reference/1.4/common-options.html#_string_fields
   *
   * @param {number} length    length of the searchString
   * @param {number} fuzziness
   * @returns {*}
   * @private
   */
  _editDistanceFromFuzziness(length, fuzziness) {
    if (fuzziness === 1) {
      return 0;
    } else if (fuzziness >= 0.4) {
      return 'AUTO';
    } else {
      return 2;
    }
  }

  /**
   * Return an array of ES queries that have to be respected but that don't contribute to the score.
   * These queries are constructed on the `filter` and the `categoriesOrTypes` of LkSearchOptions.
   * All the filter have to be respected and at least a category (or a type) have too.
   *
   * @example
   * we want all the nodes with categories 'Actor' or 'Producer'
   * that are 40 years old and from France.
   * The result will be:
   *
   * [{
   *   bool: {
   *     should: [{
   *       match: {
   *         "lk_categories.raw": {
   *           query: "Actor"
   *         }
   *       }
   *     }, {
   *       match: {
   *         "lk_categories.raw": {
   *           query: "Producer"
   *         }
   *       }
   *     }]
   *   }
   * }, {
   *   match: {
   *     age: {
   *       query: 40
   *     }
   *   }
   * }, {
   *   match: {
   *     country: {
   *       query: "France"
   *     }
   *   }
   * }];
   *
   * @param {string[][]} [filter]          Array of pairs key-value used to filter the result. The keys represent object properties and the values that should match for each property.
   * @param {string[]} [categoriesOrTypes] Exclusive list of edge-types or node-categories to restrict the search on.
   * @param {string} type                  'node' or 'edge'
   * @returns {*[]} an array of ES queries
   * @private
   */
  _buildFilter(filter, categoriesOrTypes, type) {
    const fieldCategoryOrType = this._fieldCategoriesOrTypes(type);
    const rawFieldCategoryOrType = this._fieldCategoriesOrTypes(type, true);
    const fieldFilters = _.map(filter, fieldFilter => {
      const fieldName = fieldFilter[0];
      const fieldQuery = fieldFilter[1];
      // fuzziness is left to AUTO
      const result = {match: {}};
      result.match[fieldName] = {query: fieldQuery};
      return result;
    });

    const categoriesOrTypesFilter = {
      bool: {
        should: _.map(categoriesOrTypes, categoryOrTypeFilter => {
          if (categoryOrTypeFilter === DaoUtils.LABEL_NODES_WITH_NO_CATEGORY) {
            // category '[no_category]' means with no categories or types
            return {missing: {field: fieldCategoryOrType}};
          } else {
            const categoryQuery = {match: {}};
            categoryQuery.match[rawFieldCategoryOrType] = {query: categoryOrTypeFilter};
            return categoryQuery;
          }
        })
      }
    };

    return fieldFilters.concat([categoriesOrTypesFilter]);
  }

  /**
   * Pick the most representative field for a document based on a simple heuristic.
   * Return undefined if it wasn't possible to find it.
   *
   * @param {object} document
   * @returns {string} a property of source
   * @private
   */
  _mostRepresentativeField(document) {
    let fields = DISPLAY_NAME_PROPERTIES_HEURISTIC;
    const objectKeys = new Set(_.keys(document));

    fields = _.filter(fields, field => objectKeys.has(field));

    return fields[0];
  }

  /**
   * Convert the artificial fields for categories and types.
   *
   * @param {string} propertyName
   * @returns {string}
   */
  _mapIndexField(propertyName) {
    if (propertyName.indexOf(this._fieldCategoriesOrTypes('node')) >= 0) {
      return '[categories]';
    } else if (propertyName.indexOf(this._fieldCategoriesOrTypes('edge')) >= 0) {
      return '[type]';
    } else {
      return propertyName;
    }
  }

  /**
   * Extract the field name and field value from the highlighted value from ES.
   * Also, pick a name of the record based on a simple heuristic.
   *
   * @param {object} hit Result from ES
   * @param {string} hit._id document id
   * @param {object} hit._source document content
   * @param {object<string>} [hit.highlight] field-match highlights (by field name)
   * @returns {{name: string, highlightedValue: string, highlightedField: string}}
   * @private
   */
  _getHitDisplay(hit) {
    const result = {name: '', highlightedValue: '', highlightedField: ''};

    const nameField = this._mostRepresentativeField(hit._source);

    if (hit.highlight) {
      const highlightedFields = _.keys(hit.highlight);
      // we may have multiple highlighted fields. If that's the case and one of the highlighted
      // field is the name field than we pick that one
      const highlightedField = highlightedFields.indexOf(nameField) >= 0
        ? nameField
        : highlightedFields[0];

      result.highlightedField = this._mapIndexField(highlightedField); // here we also convert lk_categories to [categories]
      result.highlightedValue = hit.highlight[highlightedField][0];
      // we use the highlightedValue as a title if the nameField wasn't found
      result.name = nameField ? hit._source[nameField] : result.highlightedValue;
    } else {
      // it's rare that highlight is undefined because we used the require_field_match flag
      // if it happens we use the nameField
      if (nameField) {
        result.highlightedField = nameField;
        result.highlightedValue = hit._source[nameField];
        result.name = hit._source[nameField];
      } else {
        // nothing to show, we only have the id
        result.name = hit._id;
      }
    }

    return result;
  }

  /**
   * Transform the results array from ES in our result array grouped by categories.
   *
   * @param {string} type   'node' or 'edge'
   * @param {object[]} hits Results array from ES
   * @param {boolean} full  Whether to return all the properties
   * @returns {{title: string,
   *   categories: string[],
   *   children: {id: string|number,
   *     name: string,
   *     field: string,
   *     value: string}[]}[]}
   * @private
   */
  _groupSearchResults(type, hits, full) {
    const groups = {};
    hits.forEach(hit => {
      const categories = type === 'node'
        ? hit._source[this._fieldCategoriesOrTypes('node')]
        : [hit._source[this._fieldCategoriesOrTypes('edge')]];

      const title = (categories.length > 0) ? categories.sort().join(', ') : 'Other';

      if (Utils.noValue(groups[title])) {
        groups[title] = {title: title, categories: categories, children: []};
      }

      const display = this._getHitDisplay(hit);

      if (full) {
        // if full we are going to return _source directly:
        // remove node categories and edge types from _source
        hit._source[this._fieldCategoriesOrTypes('node')] = undefined;
        hit._source[this._fieldCategoriesOrTypes('edge')] = undefined;
      }

      groups[title].children.push({
        id: hit._id,
        name: display.name,
        field: display.highlightedField,
        value: display.highlightedValue,
        data: full ? hit._source : undefined
      });
    });

    // return as an array (sorted by group-key)
    return _.sortBy(_.map(groups, value => value), 'title');
  }

  /**
   * Build the query to send to ES.
   *
   * @param {string} type             'node' or 'edge'
   * @param {string} searchString
   * @param {LkSearchOptions} options
   * @param {boolean} advanced        Wheter to build an advanced query
   * @returns {{query: {bool: {must: {bool: {should: *[]}}, filter: *[]}}, size: (number|*), from: (*|Date), sort: *[], _source: boolean, highlight: *}}
   * @private
   */
  _buildQuery(type, searchString, options, advanced) {
    const editDistance = this._editDistanceFromFuzziness(searchString.length, options.fuzziness);

    const sortingOptions = [{_score: {order: 'desc'}}];
    if (LKE.isTestMode()) {
      // sort on score first and then id to mantain consistency in pagination
      sortingOptions.push({_uid: {order: 'asc', 'unmapped_type': 'string'}});
    }

    return {
      query: {
        bool: {
          'minimum_should_match': 1,
          should: advanced ? [{
            'query_string': {
              fields: BOOSTED_INTERESTING_FIELDS, // we use '_all' instead of '*' because ['name^3', '*'] would ignore the boost
              lenient: true,
              query: searchString,
              analyzer: this._analyzer
            }}] : [{
            'multi_match': {
              fields: ['*'], // we use '*' instead of '_all' because _all doesn't seem to work with phrase_prefix
              lenient: true, // necessary to use field '*'
              query: searchString,
              type: 'phrase_prefix'
            }}, {
            'multi_match': {
              fields: BOOSTED_INTERESTING_FIELDS,
              lenient: true,
              query: searchString,
              fuzziness: editDistance
            }}],
          // we enforce the filter and options.categoriesOrTypes
          filter: this._buildFilter(options.filter, options.categoriesOrTypes, type)
        }
      },
      // we enforce pagination
      size: options.size,
      from: options.from,
      sort: sortingOptions,
      _source: !options.idOnly, // we don't care about the source if idOnly is true
      highlight: options.idOnly
        ? undefined
        : { // we don't care about the highlight if idOnly is true
          fields: {'*': {
            'pre_tags': ['[match]'],
            'post_tags': ['[/match]']
          }},
          // by default the highlighter would highlight only the fields on which the match occurred
          'require_field_match': false
        }
    };
  }

  ////////////////////////////////////////////////////////////////////////////////

  /**
   * @inheritdoc
   */
  connect() {
    return this._request.get('', {}, [200]).catch(err => {
      Log.warn('Cannot connect to ElasticSearch due to: ' + err);
      return Errors.technical('index_unreachable', 'Cannot connect to ElasticSearch.', true);
    }).then(connectR => {
      const version = connectR.body.version.number;

      if (Utils.compareSemVer(version, EARLIEST_SUPPORTED_VERSION) < 0) {
        return Errors.business('not_supported',
          `ElasticSearch ${version} is not supported by ElasticSearch2.`, true);
      }

      if (Utils.compareSemVer(version, LATEST_SUPPORTED_VERSION) > 0) {
        Log.warn(`ElasticSearch ${version} wasn't tested yet with Linkurious.`);
      }

      return version;
    });
  }

  /**
   * @inheritdoc
   */
  checkUp() {
    return this._request.get('', {}, [200]).catch(() => {
      return Errors.technical('index_unreachable', 'Cannot reach ElasticSearch.', true);
    });
  }

  /**
   * @inheritdoc
   */
  $indexExists() {
    return this._request.get('/_cat/indices', {qs: {format: 'json'}}, [200]).then(indicesR => {
      const indicesInES = _.map(indicesR.body, 'index');
      // we check if it contains the node index and, if we indexed also the edges, the edge index
      return _.includes(indicesInES, this._nodeIndexName) &&
        _.includes(indicesInES, this._edgeIndexName);
    });
  }

  /**
   * Delete ES index with name `indexName`. Return 'true' if deletion was successful.
   *
   * @param {string} indexName
   * @returns {Bluebird<boolean>}
   * @private
   */
  _deleteIfExistsIndexWithName(indexName) {
    return this._request.delete(indexName, {}, [200, 404])
      .then(deleteR => deleteR.statusCode === 200);
  }

  /**
   * @inheritdoc
   */
  $deleteIfExists() {
    return Promise.map(this._indices(), index => {
      return this._deleteIfExistsIndexWithName(index);
    }).then(deleteIndicesR => {
      // It should never happen that one index exists and the other doesn't except if one of them
      // was manually deleted in ES.
      if (deleteIndicesR[0] ? !deleteIndicesR[1] : deleteIndicesR[1]) { // XOR operation
        Log.warn('The was an inconsistency in ES where one of the index existed ' +
          'and the other did not.');
      }

      return deleteIndicesR[0] || deleteIndicesR[1];
    });
  }

  /**
   * @inheritdoc
   */
  $createIndex() {
    return Promise.map(['node', 'edge'], type => {
      return this._request.put(this._indexUrl(type),
        {body: this._newIndexOptions(type)}, [200]).return(this._indexUrl(type));
    });
  }

  /**
   * Look at $addEntries.
   *
   * @param {string} type
   * @param {LkNode[]|LkEdge[]} entries
   * @returns {Bluebird<{index: {_version: number}}[]>}
   * @private
   */
  _addEntries(type, entries) {
    const index = type === 'node' ? this._nodeIndexName : this._edgeIndexName;

    return this._bulk(_.map(entries, entry => {
      return {
        action: {index: {_id: entry.id}},
        source: this._transformLkObjectToESDocument(entry, type)
      };
    }), index, type).then(bulkR => {
      if (bulkR.errors) {
        // If there was an error, we search for it so we can throw nicely
        const faultyIndexations = _.filter(bulkR.items,
          item => [200, 201].indexOf(item.index.status) < 0);
        if (faultyIndexations.length >= 0) {
          // if the error type is mapper_parsing_exception or illegal_argument_exception we throw an ad-hoc error
          const error = faultyIndexations[0].index.error;

          if (error.type === 'mapper_parsing_exception' ||
            error.type === 'illegal_argument_exception') {
            // we parse the property name on which occurred the mapping exception
            // the reason has the following format 'failed to parse [propertyName]' or 'mapper [propertyName] of ...'
            const propertyName = /\[(.*?)]/g.exec(error.reason)[1];
            // propertyName is an heuristic. There might be other reasons for 'mapper_parsing_exception' or 'illegal_argument_exception' errors

            // we build the message
            let errorMsg = 'A property had an unexpected type.';
            if (Utils.hasValue(propertyName)) {
              errorMsg = 'The property ' + propertyName + ' had an unexpected type.';
            }
            if (Utils.hasValue(error['caused_by']) &&
              error['caused_by'].type === 'number_format_exception') {
              errorMsg += ' (expecting a number)';
            }

            return Errors.business('index_mapping_error', errorMsg, true);
          } else {
            // otherwise return a generic error
            return Errors.technical('critical', 'ElasticSearch wasn\'t able to index the record. ' +
              global.JSON.stringify(faultyIndexations[0].index.error), true);
          }
        }
      }

      return bulkR.items;
    });
  }

  /**
   * @inheritdoc
   */
  $addEntries(type, entries) {
    return this._addEntries(type, entries).return();
  }

  /**
   * @inheritdoc
   */
  $commit() {
    return this._request.post(this._indices().join(',') + '/_flush', {}, [200]).catch(e => {
      return Errors.technical('critical', 'Couldn\'t flush indices: ' + e.message, true);
    });
  }

  /**
   * @inheritdoc
   */
  $getItemVersions(type, ids) {
    // _mget has a body even though the method is get
    // https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-multi-get.html
    return this._request.get(
      this._idUrl(type, '_mget'),
      {body: {ids}},
      [200]
    ).then(mgetR => {
      // Map an array of docs to an object s.t. keys are ids and values are the versions
      return _.zipObject(_.map(mgetR.body.docs, '_id'), _.map(mgetR.body.docs, '_version'));
    });
  }

  /**
   * @inheritdoc
   */
  $getSize(type) {
    return this._request.get(
      this._idUrl(type, '_count'), {}, [200, 404]
    ).then(countR => {
      if (countR.statusCode === 404) {
        return 0;
      }

      return countR.body.count;
    });
  }

  /**
   * @inheritdoc
   */
  $upsertEntry(type, entry) {
    return this._addEntries(type, [entry]).then(addEntriesR => addEntriesR[0].index._version);
  }

  /**
   * @inheritdoc
   */
  $deleteEntry(id, type, ignoreNotFound) {
    return this._request.delete(this._idUrl(type, id), {}, [200, 404]).then(deleteR => {
      if (!ignoreNotFound && deleteR.statusCode === 404) {
        return Errors.business('node_not_found', `Node #${id} was not found.`, true);
      }
    });
  }

  /**
   * @inheritdoc
   */
  $getPropertyTypes(type) {
    return this._request.get(this._indexUrl(type), {}, [200]).then(getPropertyTypesR => {
      // we get the mapping from ES
      const esMappings = getPropertyTypesR.body[this._indexUrl(type)].mappings[type];
      // esMapping may be undefined if no documents are indexed
      let mappings = esMappings ? esMappings.properties : {};

      // we remove artificial fields
      mappings = _.omit(mappings, [NODE_CATEGORIES_FIELD, EDGE_TYPE_FIELD]);

      // for each mapping we translate the type to one type we recognize:
      // string, integer, float, boolean, date
      return _.mapValues(mappings, mapping => MAPPING_ES_TYPE[mapping.type]);
    });
  }

  /**
   * @inheritdoc
   */
  $search(type, searchString, options) {
    return Promise.resolve().then(() => {

      // if searchString looks alike an advanced query
      if (searchString.match(ADVANCED_QUERY_RE)) {
        return this._request.get(
          this._idUrl(type, '_search'),
          {body: this._buildQuery(type, searchString, options, true)},
          [200]
        ).catch(() => undefined);
        // catch advanced query errors to fallback to simple query
      } else {
        // directly fallback to simple query
        return undefined;
      }
    }).then(advancedQueryR => {
      if (advancedQueryR) {
        return advancedQueryR;
      }

      return this._request.get(
        this._idUrl(type, '_search'),
        {body: this._buildQuery(type, searchString, options, false)},
        [200]
      );
    }).then(queryR => ({
      type: type,
      totalHits: queryR.body.hits.total,
      results: options.idOnly
        ? queryR.body.hits.hits.map(o => o._id)
        : this._groupSearchResults(type, queryR.body.hits.hits, options.full)
    }));
  }

  /**
   * Not implemented because the ES2 is an internal index and (at least for now) the schema feature
   * is disabled.
   */
  $getSchema() {}
}

module.exports = ElasticSearch2DAO;
