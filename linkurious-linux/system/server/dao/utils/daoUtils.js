/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-08-23.
 */
'use strict';

// external libs
const _ = require('lodash');

// our libs
// we build an highlighter similar to the one used by ElasticSearch to be used in any other DAO
const highlighter = new (require('../../../lib/Highlighter'))('[match]', '[/match]');
const StringUtils = require('../../../lib/StringUtils');

// services
const LKE = require('../../services');
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();

// number of characters for the field `value` in the result (when it's not done automatically, e.g. by elasticsearch)
const MAX_LENGTH_SEARCH_RESULT = 80;

class DaoUtils {

  /**
   * @type {string}
   */
  get LABEL_NODES_WITH_NO_CATEGORY() {
    return '[no_category]';
  }

  /**
   * Check an array of missing items (comparing the actual found items to the request item IDs).
   *
   * @param {string}                 itemType        'node' or 'edge'
   * @param {any[]}                  wantedIds       IDs to look for
   * @param {Array<LkNode | LkEdge>} foundItems      Nodes or edges returned by the graph database
   * @param {string}                 [alternativeID] The property to match `wantedIds` on (instead of the actual IDs)
   * @param {function}               [encodeId]     Transform every ID in `wantedIds` with this function
   * @throws {LkError} in case of missing item
   */
  checkMissing(itemType, wantedIds, foundItems, alternativeID, encodeId) {
    if (foundItems.length !== wantedIds.length) {
      const idPath = alternativeID === undefined ? 'id' : ['data', alternativeID];
      if (Utils.hasValue(encodeId)) {
        wantedIds = _.map(wantedIds, id => encodeId(id));
      }
      const missingIds = _.difference(wantedIds, _.map(foundItems, i => _.get(i, idPath))).sort();
      if (missingIds.length > 0) {
        throw Errors.business(
          itemType + '_not_found',
          `${_.capitalize(itemType)} #${missingIds[0]} was not found.`
        );
      }
    }
  }

  /**
   * Choose the best string to represent an item (node or edge) with an heuristic.
   * `propertyKeys` are the candidate properties to be used as a representative.
   * If the first keyword is not found move to the next and so on.
   * Fallback to the id.
   *
   * @param {LkNode | LkEdge} item
   * @param {string[]}        propertyKeys
   * @returns {{field: string, value: string}}
   */
  getItemCaption(item, propertyKeys) {
    const itemProperties = _.keys(item.data);
    const lcItemProperties = new Map(); // we cache all lower case item properties
    _.each(itemProperties, itemProperty => {
      lcItemProperties.set(itemProperty, itemProperty.toLowerCase());
    });

    for (let i = 0; i < propertyKeys.length; ++i) {
      // ignore undefined/null values
      if (Utils.noValue(propertyKeys[i])) {
        continue;
      }
      const lcPropertyKey = propertyKeys[i].toLowerCase();
      for (const itemProperty of itemProperties) {
        if (lcItemProperties.get(itemProperty).indexOf(lcPropertyKey) >= 0) {
          return {field: itemProperty, value: item.data[itemProperty]};
        }
      }
    }

    return {field: 'id', value: item.id + ''};
  }

  /**
   * This function looks for tokens of `searchString` inside `properties`.
   * If there is a match it will return the property key in `field` and the property value in `value`
   * properly truncated and highlighted.
   *
   * Imitate what ElasticSearch does, that is:
   * - Wrap every tokens of `searchString` that is contained in `value` like: [match]word[/match].
   * - If `value` is longer than MAX_LENGTH_SEARCH_RESULT, it will be shortened by extracting
   * a fragment where the highest number of matched words appear.
   *
   * @example
   * node: {name: 'Sylvain', ...}
   * searchString: 'Sylvain'
   *
   * returns:
   * {
   *   field: 'name',
   *   value: '[match]Sylvain[/match]'
   * }
   *
   * @param {object} object
   * @param {string} searchString
   * @param {object} [options]
   * @param {number} [options.maxResultSize=MAX_LENGTH_SEARCH_RESULT]
   * @param {number} [options.minTokenLength=2]
   * @param {number} [options.maxTokenLength=7]
   * @param {number} [options.fuzziness=0.6]
   * @returns {{field: string | null, value: string | null}}
   */
  findBestMatchAndHighlight(object, searchString, options) {
    return highlighter.run(object, searchString,
      _.defaults(options, {maxResultSize: MAX_LENGTH_SEARCH_RESULT, fuzziness: 0.6}));
  }

  /**
   * Populate `nodes` with `edges` following a given policy.
   *
   * @param {LkNode[]} nodes
   * @param {LkEdge[]} edges
   * @param {string}   policy "all": Populate using all the edges,
   *                          "strict": Filter away edges that don't have both ends in nodes,
   *                          "none": Don't populate edges.
   * @param {string[]} [visibleNodeIds] Use edges towards these nodes if `policy` is "strict"
   * @returns {LkNode[]}
   */
  populateNodesWithEdges(nodes, edges, policy, visibleNodeIds) {
    if (policy === 'none') {
      return nodes;
    }

    const nodeMap = new Map();
    const visibleNodeIdsSet = /**@type {Set<string>}*/ (new Set(visibleNodeIds));

    _.forEach(nodes, node => {
      node.edges = [];
      nodeMap.set(node.id, node);
    });

    // Filter away edges with a source or target not in `nodes` if policy is "strict"
    if (policy === 'strict') {
      edges = _.filter(edges, edge =>
        (nodeMap.has(edge.source) || visibleNodeIdsSet.has(edge.source)) &&
        (nodeMap.has(edge.target) || visibleNodeIdsSet.has(edge.target))
      );
    }

    edges.forEach(edge => {
      const srcNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (srcNode) {
        srcNode.edges.push(edge);
      }

      if (targetNode) {
        targetNode.edges.push(edge);
      }
    });

    return Array.from(nodeMap.values());
  }

  /**
   * Escape `searchString` and apply fuzziness to it.
   * The last token is always considered a prefix.
   *
   * Note:
   * It's not possible to use fuzziness (~) and a wildcard (*) on the same word.
   *
   * Reference:
   * http://lucene.apache.org/core/5_3_0/queryparser/org/apache/lucene/queryparser/classic/package-summary.html#package_description
   *
   * @param {string}   searchString
   * @param {string[]} properties
   * @param {number}   fuzziness    Acceptable normalized edit similarity among the query and the result. The edit distance is length(searchString) * (1 - fuzziness)
   * @param {object}   options
   * @param {number}   [options.minLengthPrefix]
   * @returns {string}
   */
  generateFieldedLuceneFuzzyQuery(searchString, properties, fuzziness, options) {
    const tokens = StringUtils.uniqTokenize(searchString);

    const searchClauses = [JSON.stringify(searchString)];

    for (let i = 0; i < tokens.length; i++) {
      if (fuzziness === 1) {
        searchClauses.push(tokens[i]);
      } else {
        searchClauses.push(tokens[i] + '~' + Math.round(fuzziness * 10) / 10);
      }

      if (
        i === tokens.length - 1 && // last token has to be treated differently because it will be used also as a prefix
        (Utils.noValue(options.minLengthPrefix) || options.minLengthPrefix <= tokens[i].length)
      ) {
        searchClauses.push(tokens[i] + '*');
      }
    }

    return _.map(properties, property => `${property}:(${searchClauses. join(' ')})`).join(' ');
  }

  /**
   * Escape `searchString` and apply fuzziness to it if `fuzzy` is true.
   * The last token is always considered a prefix.
   *
   * Note:
   * It's not possible to use fuzziness (~) and a wildcard (*) on the same word.
   *
   * Reference:
   * http://lucene.apache.org/core/5_3_0/queryparser/org/apache/lucene/queryparser/classic/package-summary.html#package_description
   *
   * @param {string}  searchString
   * @param {boolean} fuzzy
   * @returns {string}
   */
  generateBasicLuceneFuzzyQuery(searchString, fuzzy) {
    const tokens = StringUtils.uniqTokenize(searchString);

    searchString = '';

    for (let i = 0; i < tokens.length; i++) {
      if (i !== tokens.length - 1) {
        searchString += tokens[i] + (fuzzy ? '~' : '') + ' ';
      } else {
        // last token has to be treated differently because it will be used also as a prefix
        if (fuzzy) {
          searchString += tokens[i] + '~ ' + tokens[i] + '*';
        } else {
          searchString += tokens[i] + '*';
        }
      }
    }

    return searchString;
  }

  /**
   * Build an LkSearchResponse based on an array of LkNodes or LkEdges and the input of the search.
   *
   * @param {string}                 type         'node' or 'edge'
   * @param {Array<LkNode | LkEdge>} foundItems
   * @param {boolean | number}       moreResultsOrTotalHits
   * @param {string}                 searchString
   * @param {LkSearchOptions}        options
   * @returns {LkSearchResponse}
   */
  buildSearchResponse(type, foundItems, moreResultsOrTotalHits, searchString, options) {
    const searchResult = {
      type: 'node',
      results: []
    };

    if (Utils.isBoolean(moreResultsOrTotalHits)) {
      searchResult.moreResults = moreResultsOrTotalHits;
    } else {
      searchResult.totalHits = moreResultsOrTotalHits;
    }

    if (options.idOnly) {
      searchResult.results = _.map(foundItems, nodeResult => nodeResult.id);
      return searchResult;
    }

    // Group items by category or type; in case of nodes, categories are guaranteed to be sorted
    const groupedItems = _.groupBy(foundItems, item => type === 'node'
      ? (/**@type {LkNode}*/ (item)).categories
      : (/**@type {LkEdge}*/ (item)).type
    );

    _.forEach(groupedItems, itemResults => {
      // itemResults is an LkNode[] or an LkEdge[]

      // this is required because key produced by the groupBy is a string and not an array
      const categoriesOrTypes = type === 'node'
        ? (/**@type {LkNode}*/ (itemResults[0])).categories
        : [(/**@type {LkEdge}*/ (itemResults[0])).type];

      searchResult.results.push({
        title: categoriesOrTypes.join(', '),
        categories: categoriesOrTypes,
        children: _.map(itemResults, itemResult => {
          // Pick field and value
          const fieldAndValue = this.findBestMatchAndHighlight(
            // it's possible to search on IDs, that's why we add the id (also called URI) among the properties
            _.defaults({_URI: itemResult.id}, itemResult.data),
            searchString, {fuzziness: options.fuzziness});

            // Pick a name for the item
          const itemCaption = this.getItemCaption(
            itemResult, ['rdfs:label', 'title', 'name', fieldAndValue.field]
          );

          return {
            id: itemResult.id,
            name: itemCaption.value,
            field: fieldAndValue.field || itemCaption.field,
            value: fieldAndValue.value || itemCaption.value,
            data: options.full ? itemResult.data : undefined
          };
        })
      });
    });

    return searchResult;
  }
}

module.exports = new DaoUtils();
