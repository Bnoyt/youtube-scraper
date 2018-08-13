/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-07-28.
 */
'use strict';

/* eslint no-unused-vars: 0 */ // fix with refactoring

// libraries
const _ = require('lodash');
const Promise = require('bluebird');

// imports
const DAO = require('../DAO');
const IndexDAO = require('./indexDAO');
const LKE = require('../../services');

// services
const Errors = LKE.getErrors();
const Log = LKE.getLogger(__filename);
const Utils = LKE.getUtils();

const DaoUtils = require('../utils/daoUtils');

// constants
const ADVANCED_QUERY_RE = /(\sAND\s|\s\|\|\s|\s&&\s|\sOR\s|>|<|\[|:|\s\+|\s-)/;

// Heuristic: 'name', 'title' and 'lk_categories' are more important than other fields for nodes
const FIELD_BOOST_NODE = {_all: 1, name: 3, title: 3, '[categories]': 5};
let FIELD_BOOST_NODE_ARRAY = null;

// Heuristic: 'name', 'title' and 'lk_type' are more important than other fields for edges
const FIELD_BOOST_EDGE = {_all: 1, name: 3, title: 3, '[type]': 5};
let FIELD_BOOST_EDGE_ARRAY = null;

const DISPLAY_NAME_PROPERTIES_HEURISTIC = _.flatten(
  _.map(['name', 'title', 'label', 'caption', 'rdfs:label'],
    e => [e, _.capitalize(e), e.toUpperCase()]
  ));

const BAD_SORT_COLUMN_RE = new RegExp('No mapping found for \\[([^\\]]+)\\] in order to sort on');

const BAD_QUERY_MAPPING_RE = new RegExp('NumberFormatException\\[(.+?")\\];');

/**
 * Abstract ElasticSearch index DAO
 */
class AbstractElasticDAO extends IndexDAO {

  constructor(vendor, requiredOptions, availableOptions, options, features) {
    super(
      vendor,
      requiredOptions,
      availableOptions,
      options,
      features
    );
  }

  /**
   * The `_source` field used to store a node's categories.
   *
   * @param {boolean} [raw=false]
   * @returns {string}
   */
  $nodeCategoriesField(raw) {
    return 'lk_categories';
  }

  /**
   * The `_source` field used to store an edge's type.
   *
   * @param {boolean} [raw=false]
   * @returns {string}
   */
  $edgeTypeField(raw) {
    return 'lk_type';
  }

  get ADVANCED_QUERY_RE() {
    return ADVANCED_QUERY_RE;
  }

  /**
   * Default number of seconds to wait for a connection/ping response
   *
   * @returns {number}
   */
  get DEFAULT_PING_TIMEOUT() {
    return 5;
  }

  /**
   * Maximum number of characters to keep in un-analyzed search sub-fields used for sorting
   *
   * @returns {number}
   */
  get SORT_FIELD_LENGTH() {
    return 15;
  }

  get FIELD_BOOST_NODE_ARRAY() {
    if (FIELD_BOOST_NODE_ARRAY === null) {
      FIELD_BOOST_NODE_ARRAY = _.map(FIELD_BOOST_NODE, (value, key) => {
        return this.resolveIndexField(key) + (value === 1 ? '' : ('^' + value));
      });
    }
    return FIELD_BOOST_NODE_ARRAY;
  }

  get FIELD_BOOST_EDGE_ARRAY() {
    if (FIELD_BOOST_EDGE_ARRAY === null) {
      FIELD_BOOST_EDGE_ARRAY = _.map(FIELD_BOOST_EDGE, (value, key) => {
        return this.resolveIndexField(key) + (value === 1 ? '' : ('^' + value));
      });
    }
    return FIELD_BOOST_EDGE_ARRAY;
  }

  get MAPPING_ES_TYPE() {
    return {
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
  }

  /**
   * Convert a raw property into it's alias counterpart
   *
   * @param {string} propertyRawName
   * @returns {string}
   */
  mapIndexField(propertyRawName) {
    if (propertyRawName === this.$nodeCategoriesField()) {
      return '[categories]';
    } else if (propertyRawName === this.$edgeTypeField()) {
      return '[type]';
    } else {
      return propertyRawName;
    }
  }

  /**
   * Convert a property alias into it's raw counterpart
   *
   * @param {string} propertyAlias
   * @returns {string}
   */
  resolveIndexField(propertyAlias) {
    if (propertyAlias === '[categories]') {
      return this.$nodeCategoriesField();
    } else if (propertyAlias === '[type]') {
      return this.$edgeTypeField();
    } else {
      return propertyAlias;
    }
  }

  /**
   * Group the matching items by category/type and keep only one matching field
   *
   * Result example:
   * ```
   * [{
   *   title: 'Movie, TheMatrix',
   *   categories: ['Movie', 'TheMatrix'],
   *   children: [{
   *     id: 10906,
   *     name: 'The Matrix',
   *     field: 'tagline'
   *     value: 'Welcome to the <em>Real World</em>'
   *   }]
   * }]
   * ```
   *
   * @param {string} type "node" or "edge"
   * @param {object[]} hits
   * @param {string} hits._id node/edge ID
   * @param {object} hits._source matching item's properties
   * @param {string} [hits._source.lk_type] matching item's type (for edges)
   * @param {string[]} [hits._source.lk_categories] matching item's categories (for nodes)
   * @param {object} hits.highlight matching fields (by property keys)
   * @param {string} searchString the search string
   * @param {boolean} [full] whether to include
   *
   * @returns {{title:string, categories:string[], children:{id:number, name:string, value:string, field:string, data?:object}[]}[]}
   *
   * @private
   */
  _groupSearchResults(type, hits, searchString, full) {
    const groups = {};
    hits.forEach(hit => {
      let categories = type === 'node'
        ? hit._source[this.$nodeCategoriesField()]
        : [hit._source[this.$edgeTypeField()]];
      if (!Array.isArray(categories)) { categories = [categories]; }

      const key = (categories.length > 0) ? categories.sort().join(', ') : 'Other';
      let group = groups[key];
      if (group === undefined) {
        groups[key] = group = {title: key, categories: categories, children: []};
      }
      const display = this._getHitDisplay(hit, searchString);

      // remove node-categories/edge-type from properties object
      if (full) {
        hit._source[this.$nodeCategoriesField()] = undefined;
        hit._source[this.$edgeTypeField()] = undefined;
      }
      group.children.push({
        id: hit._id,
        name: display.name,
        field: this.mapIndexField(display.highlightedField),
        value: display.highlightedValue,
        data: full ? hit._source : undefined
      });
    });
    // return as an array (sorted by group-key)
    return _.sortBy(_.map(groups, value => value), 'title');
  }

  /**
   * @inheritdoc
   */
  $search(type, searchString, options) {
    return this._failSafeSearch(type, searchString, options).then(result => {

      const results = options.idOnly
        ? result.hits.hits.map(o => o._id)
        : this._groupSearchResults(type, result.hits.hits, searchString, options.full);

      return Promise.resolve({
        type: type,
        totalHits: result.hits.total,
        results: results
      });
    });
  }

  /**
   * Contains the logic or retrying a search query when advanced mode fails
   *
   * `result.hits.hits` example:
   * [{
   *   _index: 'linkurious_xxxxx',
   *   _type: 'node',
   *   _id: '10906',
   *   _score: 0.095891505,
   *   _source: {
   *     tagline: 'Welcome to the Real World',
   *     released: '1999',
   *     title: 'The Matrix',
   *     lk_categories: [ 'Movie', 'TheMatrix' ]
   *   },
   *   highlight: {
   *     tagline: [ 'Welcome to the <em>Real World</em>' ]
   *   }
   * }]
   *
   * @param {string} itemType 'node' or 'edge'
   * @param {string} searchString a search query sent by the user
   * @param {LkSearchOptions} options search options
   * @param {boolean} [forceSimpleMode=false] whether to force a simple query (even with advanced syntax)
   * @returns {Bluebird<{hits: {hits: {_index:string, _type:string, _id:string, _score:number, _source:object, highlight:object}[]}}>}
   */
  _failSafeSearch(itemType, searchString, options, forceSimpleMode) {
    // first call: let the query decide of the search mode
    if (forceSimpleMode === undefined) {
      forceSimpleMode = false;
    }

    let search;
    if (Utils.hasValue(this._version) && Utils.compareSemVer(this._version, '2.0.0') >= 0) {
      // TODO refactor this code
      const advanced = !forceSimpleMode && searchString.match(this.ADVANCED_QUERY_RE);
      search = {query: {body: this._buildES2SearchQuery(itemType, searchString, options, advanced)},
        advanced};
      search.query.size = search.query.body.size;
      search.query.from = search.query.body.from;
      search.query.version = search.query.body.version;
    } else {
      search = this._buildSearchQuery(itemType, searchString, options, forceSimpleMode);
    }

    return this.searchPromise(itemType, search.query, search.advanced).catch(customError => {
      if (!search.advanced) {
        // a simple search failing : we have a serious problem
        return Promise.reject(customError);
      } else {
        // retry: force 'simple' mode
        return this._failSafeSearch(itemType, searchString, options, true);
      }
    });
  }

  /**
   * @param {string} itemType "node" or "edge"
   * @returns {string} the ElasticSearch type for the given itemType
   * @abstract
   */
  $resolveESType(itemType) { return Utils.NOT_IMPLEMENTED(); }

  /**
   * @param {string} itemType
   * @returns {string} the ElasticSearch index for the given itemType
   * @abstract
   */
  $resolveESIndex(itemType) { return Utils.NOT_IMPLEMENTED(); }

  /**
   * @param {string} type
   * @param {string} searchString
   * @param {LkSearchOptions} options
   * @param {boolean} [forceSimple=false]
   * @returns {{Object}} ElasticSearch query
   * @private
   */
  _buildSearchQuery(type, searchString, options, forceSimple) {
    let advanced = false;

    // for search stability trade-offs and optimization ideas:
    // http://www.elasticsearch.org/blog/understanding-query-then-fetch-vs-dfs-query-then-fetch/
    const query = {
      size: options.size === undefined ? this.DEFAULT_PAGE_SIZE : Math.max(1, options.size),
      from: options.from === undefined ? 0 : Math.max(0, options.from),
      // for order/score stability across shards (for pagination)
      body: {
        highlight: {
          fields: {'*': {'pre_tags': ['[match]'], 'post_tags': ['[/match]'], encoder: 'default'}}
        },
        query: {
          filtered: {
            query: {
              'dis_max': {
                'tie_breaker': 0.5,
                queries: []
              }
            },
            filter: {
              and: [
                {term: {_type: this.$resolveESType(type)}}
              ]
            }
          }
        }
      }
    };

    if (options.idOnly) {
      delete query.body.highlight;
      query.body._source = false;
    }

    if (LKE.isTestMode()) {
      // better sort stability on small indexes, but slower.
      query.searchType = 'dfs_query_then_fetch';

      // sort on score first, then on document ID to achieve stability (for pagination)
      query.body.sort = [
        {_score: {order: 'desc'}},
        {_uid: {order: 'asc'}}
      ];
    }

    // add all "field filters". Field filter: [ "field_name", "field_value" ]
    if (options && options.filter) {
      options.filter.forEach(filter => {
        const q = {query: {match: {}}};
        q.query.match[this.resolveIndexField(filter[0])] = {
          query: filter[1],
          operator: 'and'
        };
        query.body.query.filtered.filter.and.push(q);
      });
    }

    // add NodeCategory/EdgeType filters : inclusive filter (or)
    if (options && options.categoriesOrTypes/* && options.categoriesOrTypes.length > 0*/) {
      const filter = this.$makeCategoriesOrTypesFilter(type, options.categoriesOrTypes);
      query.body.query.filtered.filter.and.push(filter);
    }

    // Choose between ADVANCED (fragile) and SIMPLE (fail safe) search
    if (!forceSimple && searchString.match(this.ADVANCED_QUERY_RE)) {
      // ADVANCED SEARCH : use query_string, uses following syntax:
      // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#query-string-syntax
      advanced = true;

      query.body.query.filtered.query = {
        'query_string': {
          query: searchString
        }
      };

      if (options && options.fuzziness) {
        // add fuzziness if required
        query.body.query.filtered.query['query_string'].fuzziness = parseFloat(options.fuzziness);
      }
    } else {
      // SIMPLE SEARCH : the search string as a simple string

      query.body.query.filtered.query['dis_max'].queries.push({
        'simple_query_string': {
          query: searchString,
          fields: type === 'node' ? this.FIELD_BOOST_NODE_ARRAY : this.FIELD_BOOST_EDGE_ARRAY,
          'default_operator': 'or'
        }
      });

      query.body.query.filtered.query['dis_max'].queries.push({
        match: {
          _all: {
            query: searchString,
            type: 'phrase_prefix'
          }
        }
      });

      // (fuzziness == 1) mean NOT fuzzy.
      // (fuzziness == 0.1) means VERY fuzzy.
      if (options.fuzziness < 1) {
        query.body.query.filtered.query['dis_max'].queries.push({
          'function_score': {
            query: {
              'fuzzy_like_this': {
                'like_text': searchString,
                fuzziness: options.fuzziness
              }
            },
            // the stricter the matching, the higher the boost factor
            'boost_factor': options.fuzziness
          }
        });
      }
    }
    return {query: query, advanced: advanced};
  }

  /**
   * TODO refactor this duplicate code from ES2 DAO
   *
   * Return an array of ES queries that have to be respected but that don't contribute to the score.
   * These queries are constructed on the `filter` and the `categoriesOrTypes` of LkSearchOptions.
   * All the filter have to be respected and at least a category (or a type) have too.
   *
   * @param {string[][]} [filter]          Array of pairs key-value used to filter the result. The keys represent object properties and the values that should match for each property.
   * @param {string[]} [categoriesOrTypes] Exclusive list of edge-types or node-categories to restrict the search on.
   * @param {string} type                  'node' or 'edge'
   * @returns {*[]} an array of ES queries
   * @private
   */
  _buildES2Filter(filter, categoriesOrTypes, type) {
    const fieldFilters = _.map(filter, fieldFilter => {
      const fieldName = fieldFilter[0];
      const fieldQuery = fieldFilter[1];
      // fuzziness is left to AUTO
      const result = {match: {}};
      result.match[fieldName] = {query: fieldQuery};
      return result;
    });

    const fieldCategoryOrType = type === 'node'
      ? this.$nodeCategoriesField()
      : this.$edgeTypeField();
    const rawFieldCategoryOrType = type === 'node'
      ? this.$nodeCategoriesField(true)
      : this.$edgeTypeField(true);

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
   * Build the query to send to ES2.
   * TODO refactor this duplicate code from ES2 DAO
   *
   * @param {string} type             'node' or 'edge'
   * @param {string} searchString
   * @param {LkSearchOptions} options
   * @param {boolean} advanced        Wheter to build an advanced query
   * @returns {{query: {bool: {must: {bool: {should: *[]}}, filter: *[]}}, size: (number|*), from: (*|Date), sort: *[], _source: boolean, highlight: *}}
   * @private
   */
  _buildES2SearchQuery(type, searchString, options, advanced) {
    const editDistance = Math.min(2, Math.round(searchString.length * (1 - options.fuzziness)));

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
              fields: this.FIELD_BOOST_NODE_ARRAY.concat('_all'),
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
              fields: this.FIELD_BOOST_NODE_ARRAY.concat('_all'),
              lenient: true,
              query: searchString,
              fuzziness: editDistance
            }}],
          // we enforce the filter and options.categoriesOrTypes
          filter: this._buildES2Filter(options.filter, options.categoriesOrTypes, type)
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

  /**
   *
   * @param {Object} hit
   * @param {Object} hit.highlight
   * @param {Object} hit._source
   * @param {string} searchQuery
   * @returns {{name:string, highlightedField:string, highlightedValue:string}} display
   * @private
   */
  _getHitDisplay(hit, searchQuery) {
    const d = {name: '', highlightedValue: '', highlightedField: ''};

    // 1) get highlighted FIELD + VALUE
    if (hit.highlight) {
      // highlight: use first highlight if present
      d.highlightedField = _.keys(hit.highlight)[0];
      d.highlightedValue = hit.highlight[d.highlightedField][0];
    } else {
      // no-highlight: use the first field that appears in the search string
      const keys = Object.keys(hit._source);
      keys.forEach(key => {
        if (searchQuery.indexOf(key) >= 0) {
          d.highlightedField = key;
          return false;
        }
      });
      if (d.highlightedField === '' && keys.length > 0) {
        d.highlightedField = keys[0];
      }
      d.highlightedValue = hit._source[d.highlightedField];
    }

    // 2) get display NAME
    _.forEach(DISPLAY_NAME_PROPERTIES_HEURISTIC, field => {
      if (hit._source[field] !== undefined) {
        d.name = hit._source[field];
        return false;
      }
    });
    if (d.name === '') {
      d.name = d.highlightedValue;
    }

    // todo: workaround: I wasn't able to avoid search matching on *.sort sub-fields, so I just rename here
    if (d.highlightedField.indexOf('.sort') > 0) {
      d.highlightedField = d.highlightedField.split('.')[0];
    }

    return d;
  }

  /**
   * @inheritdoc
   */
  $getItemVersions(itemType, ids) {
    // todo: use esclient.mget (with realtime:true ?)
    // see http://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference-1-1.html#api-mget-1-1
    const query = {
      version: true,
      size: ids.length,
      body: {
        filter: {ids: {type: this.$resolveESType(itemType), values: ids}},
        _source: false
      }
    };

    return this.searchPromise(itemType, query).then(results => {
      const versions = {};
      _.forEach(results.hits.hits, document => {
        versions[document._id] = document._version;
      });

      return versions;
    });
  }

  /**
   * Generate a nodeCategory or edgeType filter
   * TODO: store raw categories/type fields as well, filter on raw version
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

    const terms = _.flatten(_.map(categoriesOrTypes, term => {
      // term filters are not analyzed and lk_categories/lk_type is indexed with the default analyser:
      // lowercase + space tokenizer

      // a.a, a:a, 1.1 don't have to be split
      term = term.replace(/([a-z])[:.]((?![a-z]).*)/gi, '$1 $2');
      term = term.replace(/([0-9])[.]((?![0-9]).*)/gi, '$1 $2');

      return term.replace(/[()|/@<>#-]+/g, ' ').trim().toLowerCase().split(/ +/);
    }));

    // ONE category/type: make all terms match.
    const andFilter = categoriesOrTypes.length === 1;

    const field = type === 'node' ? this.$nodeCategoriesField(true) : this.$edgeTypeField(true);
    if (includeNone) {
      return {or: [
        {missing: {field: this.$nodeCategoriesField(true)}},
        {terms: {
          [field]: terms,
          execution: andFilter ? 'and' : 'plain'
        }}
      ]};
    } else {
      return {terms: {
        [field]: terms,
        execution: andFilter ? 'and' : 'plain'
      }};
    }
  }

  /**
   * @param {string} itemType "node" or edge"
   * @param {Object} queryBody an ElasticSearch query object
   * @param {boolean} [doNotLogErrorQuery=false]
   * @returns {Bluebird<Object|LkError>} a response promise
   *
   * @abstract
   */
  searchPromise(itemType, queryBody, doNotLogErrorQuery) {
    return this.$searchPromise(itemType, queryBody).catch(err => {
      if (typeof err === 'object' && typeof err.message === 'string') {
        let groups;
        if ((groups = BAD_SORT_COLUMN_RE.exec(err.message))) {
          return Errors.business(
            'invalid_parameter', 'ElasticSearch: invalid sort column (' + groups[1] + ')', true
          );
        }
        if ((groups = BAD_QUERY_MAPPING_RE.exec(err.message))) {
          return Errors.business(
            'invalid_parameter', 'ElasticSearch: invalid number (' + groups[1] + ')', true
          );
        }
      }

      if (!doNotLogErrorQuery) {
        Log.error('ElasticSearch error, query was:',
          global.JSON.stringify(queryBody, null, ' ')
        );
      }

      return Promise.reject(this.getLkError(err, undefined, itemType));
    });
  }

  /**
   * Run a search query
   *
   * @param {string} itemType "node" or "edge"
   * @param {object} query
   * @param {object} query.body actual query
   * @param {number} [query.from]
   * @param {number} [query.size]
   * @param {boolean} [query.version]
   *
   * @returns {Bluebird<object>}
   * @abstract
   */
  $searchPromise(itemType, query) { return Utils.NOT_IMPLEMENTED(); }

  /**
   * @inheritdoc
   */
  $getSchema(itemType, withProperties) {
    return this._getItemTypes(itemType).map(type => {
      if (!withProperties) { return type; }

      return this._getItemTypeProperties(itemType, type.name)
        .then(properties => type.properties = properties)
        .return(type);
    }).then(types => {
      return Promise.props({
        name: '*',
        count: this.$getSize(itemType),
        properties: this._getItemTypeProperties(itemType, undefined)
      }).then(wildcardType => {
        types.push(wildcardType);
        return types;
      });
    });
  }

  /**
   * Get the node-category/edge-type list with item count.
   *
   * @param {string} itemType "node" or "edge".
   * @returns {Bluebird<{name: string, count: number}[]>}
   */
  _getItemTypes(itemType) {
    const field = itemType === 'node' ? this.$nodeCategoriesField(true) : this.$edgeTypeField(true);

    return this.$searchPromise(itemType, {
      size: 0,
      body: {
        query: {'match_all': {}},
        aggs: {
          schema: {
            terms: {
              field: field,
              size: 1000 // detect up to 1000 node-categories/edge-types
            }
          }
        }
      }
    }).then(r => {
      return r.aggregations.schema.buckets
        .map(bucket => ({name: bucket.key, count: bucket['doc_count']}));
    });
  }

  /**
   * @param {string} itemType "node" or "edge"
   * @param {string|undefined} [typeName] The node-category/edge-type to get properties for (can be `undefined` for all properties)
   * @returns {Bluebird<{key:string, count:number}[]>}
   * @private
   */
  _getItemTypeProperties(itemType, typeName) {
    const typeFieldRaw = itemType === 'node'
      ? this.$nodeCategoriesField(true)
      : this.$edgeTypeField(true);

    const typeField = itemType === 'node' ? this.$nodeCategoriesField() : this.$edgeTypeField();

    const ignoredProperties = [
      '_source', '_version', '_all', '_type', '_uid', typeField, typeFieldRaw
    ];

    return this.$searchPromise(itemType, {
      size: 0,
      body: {
        query: typeName === undefined ? undefined : {
          filtered: {
            query: {'match_all': {}},
            filter: {
              term: {[typeFieldRaw]: typeName}
            }
          }
        },
        aggs: {
          schema: {
            terms: {
              field: '_field_names',
              size: 1000 // detect up to 1000 property names
            }
          }
        }
      }
    }).then(r => {
      return r.aggregations.schema.buckets
        .map(bucket => ({key: bucket.key, count: bucket['doc_count']}))
        .filter(property => ignoredProperties.indexOf(property.key) === -1);
    });
  }

  /**
   * @param {*} esError
   * @param {string} [prefix]
   * @param {string} [itemType] "node" or "edge"
 * @returns {LkError}
   */
  getLkError(esError, prefix, itemType) {
    prefix = 'ElasticSearch' + (prefix ? ' ' + prefix : '');
    const errorMessage = (esError && esError.message
      ? esError.message + ''
      : JSON.stringify(esError)
    );

    if (errorMessage === 'No Living connections') {
      return Errors.business('dataSource_unavailable', 'Could not connect to ElasticSearch.');
    }

    if (errorMessage.startsWith('MapperParsingException')) {
      Log.error(esError);

      let message = _.capitalize(itemType || 'item') + ' property had an unexpected type';
      if (errorMessage.indexOf('NumberFormatException') > 0) {
        message += ' (expected a number)';
      }
      message += ', try setting "dynamicMapping:false" in index configuration.';

      return Errors.business('index_mapping_error', message);
    }

    return Errors.technical('critical', prefix + ': ' + errorMessage);
  }
}

module.exports = AbstractElasticDAO;
