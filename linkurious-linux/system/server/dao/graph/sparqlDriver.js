/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-08-21.
 */
'use strict';

// external libs
const shortid = require('shortid');
const _ = require('lodash');
const Promise = require('bluebird');

// our libs
const MockStream = require('../../../lib/MockStream');

// services
const LKE = require('../../services');
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();
const Config = LKE.getConfig();
const Log = LKE.getLogger(__filename);

// locals
const GraphDriver = require('./graphDriver');
const SparqlUtils = require('../utils/sparqlUtils');
const DaoUtils = require('../utils/daoUtils');

// timeout after which $getSimpleSchema will give up
const GET_SIMPLE_SCHEMA_TIMEOUT = 10000; // 10 seconds

/**
 * Notes:
 * If ?o is a literal, "?s ?p ?o" defines a property.
 * If ?o is a URI or a blank node, "?s ?p ?o" defines an edge.
 * Exception: if ?p is `categoryPredicate`, "?s ?p ?o" defines a category.
 * In a category statement, ?o can be a URI, a blank node or a literal.
 *
 * A node exists only if it has at least a property, a category or an edge.
 * You can create a new node only if it has at least a property or a category.
 * You CANNOT create edges "?s ?p ?o" if source and target don't exist already.
 * You CANNOT delete all properties and categories from a node (even if it has an edge).
 * If in the original dataset there is an edge that have as a target a node without
 * categories and properties, this node will appear empty.
 * Empty nodes are defined as the nodes that don't have any property or category.
 * In this case, if we try to delete the edge, the deletion will fail because it would result
 * in a deletion of the node too.
 * Empty nodes are not counted in getNodeCount and they are not emitted in getNodeStream.
 *
 * In this driver the encoded IDs are equal to the decoded ones.
 *
 *
 * This driver requires a SparqlConnector and the following graph options:
 * @property {string} [idPropertyName] Property name used to show the id in its short form
 *
 * A Driver that extends SparqlDriver has to:
 * - supportBlankNodeLabels, or
 * - implementGetStatements
 *
 * If the graph database supports blank node labels, $getStatements, on the connector, is never invoked.
 *
 * The SparqlConnector will pass the following data to the driver:
 * @property {Map<string, string>} prefixToURI       Mapping from prefixes to namespaces, e.g.:
 *                                                   'foaf' -> 'http://xmlns.com/foaf/0.1/'
 *                                                   'rdf'  -> 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
 * @property {string}              categoryPredicate Predicate (URI wrapped in angle brackets) that represents a category
 * @property {string}              defaultNamespace  Default namespace (namespace used for node IDs without any prefix)
 */
class SparqlDriver extends GraphDriver {

  /**
   * @param {Connector} connector     Connector used by the DAO
   * @param {any}       graphOptions  GraphDAO options
   * @param {any}       connectorData Data from the connector
   * @param {object}    sparqlOptions
   * @param {boolean}   sparqlOptions.supportBlankNodeLabels Whether you can directly access a blank node from a sparql query by wrapping its ID in angle brackets
   * @param {boolean}   sparqlOptions.implementGetStatements Whether the connector can implement $getStatements (the graph database implements RDF4J APIs)
   */
  constructor(connector, graphOptions, connectorData, sparqlOptions) {
    super(connector, graphOptions, connectorData);

    this._idPropertyName = this.getGraphOption('idPropertyName');

    // each driver is responsible to validate its connectorData
    Utils.check.properties('connectorData', connectorData, {
      prefixToURI: {required: true, check: (k, prefixToURI) => {
        prefixToURI.forEach((value, key) => {
          Utils.check.string(k + '[' + key + ']', value, true);
        });
      }},
      categoryPredicate: {required: true, check: 'nonEmpty'},
      defaultNamespace: {required: true, check: 'nonEmpty'}
    });

    this._utils = new SparqlUtils(
      connectorData.prefixToURI,
      connectorData.defaultNamespace,
      connectorData.categoryPredicate,
      this._idPropertyName
    );

    this._categoryPredicate = connectorData.categoryPredicate;

    if (!sparqlOptions.supportBlankNodeLabels && !sparqlOptions.implementGetStatements) {
      throw Errors.technical('bug', 'Graph database doesn\'t support blank node labels' +
        ' nor it can implement getStatements.');
    }

    this.supportBlankNodeLabels = sparqlOptions.supportBlankNodeLabels;
  }

  /**
   * @type {SparqlConnector}
   */
  get connector() {
    return super.connector;
  }

  /**
   * Special properties that can't be read, created or updated.
   *
   * @type {Array<{key: string, read: boolean, create: boolean, update: boolean}>}
   */
  get $specialProperties() {
    if (Utils.noValue(this._idPropertyName)) { return []; }

    return [{
      key: this._idPropertyName,
      read: true,
      create: true,
      update: false
    }];
  }

  /**
   * Check if the given edge ID is legal.
   *
   * Coding/decoding is used when the edge ID is not originally a string or a number.
   * An encoded edge ID is an ID for Linkurious (ID in input).
   * A decoded edge ID is an ID for the graph database (ID in output).
   *
   * @param {string}  key
   * @param {string}  id
   * @returns {any} The ID of the edge (encoded or not)
   * @throws {LkError} if the ID is not valid
   */
  $checkEdgeId(key, id) {
    Utils.check.string(key, id, true, true);
    try {
      const edge = this._utils.getEdgeFromId(id);
      const source = /**@type {string}*/ (edge.source);
      const target = /**@type {string}*/ (edge.target);
      this.$checkNodeId('edge.source', source);
      this.$checkNodeId('edge.target', target);
      Utils.check.string('edge.type', edge.type, true);
    } catch(e) {
      throw Errors.business('invalid_parameter', '"' + id + '" doesn\'t decode to a valid edge ' +
        '(' + e.message + ').');
    }
    return id;
  }

  /**
   * Check if the given node ID is legal.
   *
   * Coding/decoding is used when the node ID is not originally a string or a number.
   * An encoded node ID is an ID for Linkurious (ID in input).
   * A decoded node ID is an ID for the graph database (ID in output).
   *
   * @param {string}  key
   * @param {string}  id
   * @returns {any} the ID of the node (encoded or not)
   * @throws {LkError} if the ID is not valid
   */
  $checkNodeId(key, id) {
    Utils.check.string(key, id, true);
    if (this._utils.isURI(id) || this._utils.isBlankNode(id)) {
      return id;
    }

    throw Errors.business('invalid_parameter', '"' + key + '" must be a valid URI wrapped in ' +
      'angle brackets or a blank node.');
  }

  /**
   * List all edgeTypes, nodeCategories, edgeProperties, nodeProperties
   * that exist in the graph database.
   *
   * Additional notes:
   * This call may end up being really expensive.
   * It will timeout after GET_SIMPLE_SCHEMA_TIMEOUT and fallback to empty arrays.
   * The category predicate ('rdf:type' by default) is always included
   * in both `edgeTypes` and `nodeProperties`.
   *
   * @returns {Bluebird<{nodeCategories: string[], edgeTypes: string[], nodeProperties: string[], edgeProperties: string[]}>}
   */
  $getSimpleSchema() {
    const promises = {

      nodeCategories: this.connector.$doSparqlQuery(
        'select distinct ?class {?resource ' + this._categoryPredicate + ' ?class}',
        GET_SIMPLE_SCHEMA_TIMEOUT
      ).then(response => _.zip.apply(_, response)[0]).map(rawCategory => {
        return this._utils.parseCategoryValue(rawCategory);
      }).catch(() => {
        return []; // fallback to empty array
      }),

      // Note: rdf:type is include in edgeTypes (too expensive to remove it)
      edgeTypes: this.connector.$doSparqlQuery(
        'select distinct ?p {?s ?p ?o. filter isURI(?o)}',
        GET_SIMPLE_SCHEMA_TIMEOUT
      ).then(response => _.zip.apply(_, response)[0]).map(rawType => {
        return this._utils.fullURIToShortName(rawType);
      }).catch(() => {
        return [];
      }),

      // Note: rdf:type is include in nodeProperties (too expensive to remove it)
      nodeProperties: this.connector.$doSparqlQuery(
        'select distinct ?p {?s ?p ?o. filter isLiteral(?o)}',
        GET_SIMPLE_SCHEMA_TIMEOUT).then(response => {
        return _.zip.apply(_, response)[0];
      }).map(rawPropertyName => {
        return this._utils.fullURIToShortName(rawPropertyName);
      }).catch(() => {
        return [];
      }),

      edgeProperties: []
    };

    return Promise.props(promises);
  }

  /**
   * Get a node by ID.
   *
   * @param {object}  options
   * @param {any}     options.id              ID of the node (decoded for the graph database)
   * @param {boolean} [options.withEdges]     Whether to include adjacent edges
   * @param {string}  [options.alternativeId] The property to match `options.id` on (instead of the actual ID)
   * @returns {Bluebird<LkNode>} null if not found
   */
  $getNode(options) {
    return this.$getNodesByID({
      ids: [options.id],
      edges: options.withEdges ? 'all' : 'none'
    }).then(nodes => nodes[0]);
  }

  /**
   * Get a list of nodes by ID.
   *
   * Additional notes:
   * In additional to the options passed by the DAO we have the option visibleNodeIds
   * used internally in the driver.
   *
   * @param {object}   options
   * @param {any[]}    options.ids              List of IDs to read (decoded for the graph database)
   * @param {string}   options.edges            'all':    Include every adjacent edges and digest
   *                                            'strict': Include only edges with both ends in the result nodes
   *                                            'none':   Don't include any edges
   * @param {string[]} [options.visibleNodeIds] IDs of nodes already visible in the visualization
   *                                            We won't return them but we return edges to them
   * @returns {Bluebird<LkNode[]>}
   */
  $getNodesByID(options) {
    /**
     * Give me all "?s ?p ?o" where ?s is in 'options.ids'
     * (It means "give me all property, category and edge statements of nodes with these ids")
     *
     * PLUS give me all "?s ?p ?o" where ?o is in 'options.ids'
     * (It means "give me all edge statements where nodes with these ids appear as the target")
     */
    const idsSet = new Set(options.ids);
    const ids = Array.from(idsSet);

    if (ids.length === 0) {
      return Promise.resolve([]);
    }

    return this.connector.$getStatementsBySubjects(ids).then(statementsSubj => {
      return this.connector.$getStatementsByObjects(ids).then(statementsObj => {
        return _.uniqBy(statementsSubj.concat(statementsObj), item => item.join('|'));
      });
    }).then(statements => {
      // node statements are:
      //  - node with subj in idsSet &&
      //  - category statements || property statement (literal value)
      const partitionedStatements = _.partition(statements,
        s => idsSet.has(s[0]) && (s[1] === this._categoryPredicate || s[2].startsWith('"')));
      const nodeStatements = partitionedStatements[0];
      let edgeStatements = partitionedStatements[1];

      const nodeIdsSeenInEdges = new Set();
      _.forEach(edgeStatements, s => {
        nodeIdsSeenInEdges.add(s[0]);
        nodeIdsSeenInEdges.add(s[2]);
      });

      if (options.edges === 'strict' || options.edges === 'none') {
        let edgesToSet;

        if (options.visibleNodeIds) {
          edgesToSet = new Set(ids.concat(options.visibleNodeIds));
        } else {
          edgesToSet = new Set(ids);
        }
        edgeStatements = _.filter(edgeStatements,
          s => edgesToSet.has(s[0]) && edgesToSet.has(s[2]));
      } else if (options.edges === 'none') {
        edgeStatements = [];
      }

      const edges = _.map(edgeStatements, stmt => this._utils.parseStatementForEdge(stmt));

      const nodesMap = new Map();
      let node;

      // Here we create nodes with the result of node statements (properties and categories)
      _.forEach(_.groupBy(nodeStatements, s => s[0]), (value, key) => {
        if (idsSet.has(key)) {
          try {
            node = this._utils.parseStatementsForNode(value);
            if (node !== null) {
              nodesMap.set(key, node);
            }
          } catch(e) {
            Log.warn('While retrieving a node: ', e.message);
          }
        }
      });

      // Here we create the empty nodes that occurred only as a source or target of an edge
      nodeIdsSeenInEdges.forEach(nodeId => {
        if (idsSet.has(nodeId) && !nodesMap.has(nodeId)) {
          const data = {};

          // empty nodes can have the id property as well
          if (Utils.hasValue(this._idPropertyName)) {
            data.id = this._utils.fullURIToShortName(nodeId);
          }

          nodesMap.set(nodeId, {id: nodeId, data, categories: []});
        }
      });

      const nodes = Array.from(nodesMap.values());

      return DaoUtils.populateNodesWithEdges(nodes, edges, options.edges, options.visibleNodeIds);
    }).then(nodes => {
      // we ensure that the order on which nodes are returned is the same as they were asked
      return _.sortBy(nodes, node => {
        return options.ids.indexOf(node.id);
      });
    });
  }

  /**
   * Get a list of edges by ID.
   *
   * @param {object} options
   * @param {any[]}  options.ids             List of IDs to read (decoded for the graph database)
   * @param {string} [options.alternativeId] The property to match `options.ids` on (instead of the actual IDs)
   * @returns {Bluebird<LkEdge[]>}
   */
  $getEdgesByID(options) {
    return Promise.map(options.ids, id => {
      const statement = this._utils.formatEdgeToStatement(this._utils.getEdgeFromId(id));

      return this.connector.$checkStatement(
        statement[0], statement[1], statement[2]
      ).then(belongsToTripleStore => {
        if (belongsToTripleStore) {
          return statement;
        }
      });
    }).then(statements => {
      statements = statements.filter(Utils.hasValue);
      const edges = [];

      _.forEach(statements, value => {
        try {
          edges.push(this._utils.parseStatementForEdge(value));
        } catch(e) {
          Log.warn('Could not parse edge statement: ', e.message);
        }
      });

      return edges;
    });
  }

  /**
   * Generate a SPARQL query that returns a list of pairs where the first elements are node ids
   * and the second elements are their cardinality.
   * The nodesIds are the ids of the nodes adjacent to `nodeId`.
   * If `edgeFilter` is defined only edges of this type are taken into account.
   * If `nodeCategoryFilter` is defined, only adjacent nodes of this category are taken into account.
   * Special case for `nodeCategoryFilter` === "[no_category]" where only adjacent nodes
   * with no categories are taken into account.
   * The cardinality column is populated only if `limitType` !== "id".
   *
   * If nodeId is a blank node, we assume that blank node labels are supported.
   *
   * @param {string}   nodeId
   * @param {string}   limitType    "id", "lowestDegree" or "highestDegree"
   * @param {string[]} [categories] Exclusive list of node-categories to restrict the result
   * @param {string[]} [types]      Exclusive list of edge-type to restrict the result
   * @returns {string}
   * @private
   */
  _generateAdjNodeSparqlQuery(nodeId, limitType, categories, types) {
    if (this._utils.isBlankNode(nodeId)) {
      nodeId = '<' + nodeId + '>'; // wrap in angle bracket
    }

    let edgeTypeFilter = '';
    if (Utils.hasValue(types)) {
      const edgeTypes = types.map(t => this._utils.shortNameToFullURI(t));
      edgeTypeFilter = 'VALUES (?p) { ' + edgeTypes.map(id => '(' + id + ')').join(' ') + ' }.';
    }

    let nodeCategoryFilter = '';
    if (Utils.hasValue(categories)) {
      // we remove the special '[no_category]' case
      const nodeCategories = _.filter(categories,
        c => c !== DaoUtils.LABEL_NODES_WITH_NO_CATEGORY)
        .map(c => this._utils.formatCategoryValue(c));
      const joinedCategories = nodeCategories.map(id => '(' + id + ')').join(' ');

      nodeCategoryFilter = 'VALUES (?c) { ' + joinedCategories + ' }. ' +
        '?s ' + this._categoryPredicate + ' ?c.';

      if (categories.includes(DaoUtils.LABEL_NODES_WITH_NO_CATEGORY)) {
        nodeCategoryFilter = '{{' + nodeCategoryFilter + '} union ' +
          '{filter not exists {?s ' + this._categoryPredicate + ' ?c}}}.';
      }
    }

    if (limitType !== 'id') {
      // unfortunately (because it's expensive), we need the cardinality
      return 'select ?s (COUNT(*) AS ?count) {' +
        '{?s ?p ' + nodeId + '.}' +
        ' union ' +
        '{' + nodeId + ' ?p ?s. filter isURI(?s). ' +
        'filter not exists {' + nodeId + ' ' + this._categoryPredicate + ' ?s }.}. ' +
        '{?s ?p2 ?o2. filter isURI(?o2). ' +
        'filter not exists {?s ' + this._categoryPredicate + ' ?o2}.} union {?o2 ?p2 ?s.}.' +
        nodeCategoryFilter +
        edgeTypeFilter +
        '} ' +
        'group by ?s';
    } else {
      return 'select ?s {{?s ?p ' + nodeId + '}' +
        ' union {' + nodeId + ' ?p ?s. filter not exists {' + nodeId + ' ' +
        this._categoryPredicate + ' ?s}. filter isURI(?s).}.' +
        nodeCategoryFilter +
        edgeTypeFilter +
        '}';
    }
  }

  /**
   * Blank nodes can't be used in SPARQL queries (except if the driver support blank node labels)
   * so here we simulate the same request made for each node in $getAdjacentNodes.
   *
   * @param {string}   nodeId
   * @param {string}   [limitType]
   * @param {string[]} [categories] Exclusive list of node-categories to restrict the result
   * @param {string[]} [types]      Exclusive list of edge-type to restrict the result
   * @private
   */
  _getAdjacentNodesBlankNodes(nodeId, limitType, categories, types) {
    let neighbors = []; // nodeId

    const edgeTypeFilter = Utils.hasValue(types)
      ? types.map(type => this._utils.shortNameToFullURI(type)) : undefined;

    return this.connector.$getStatements([nodeId], edgeTypeFilter).then(statementsSubj => {
      _.forEach(statementsSubj, s => {
        if ((s[1] !== this._categoryPredicate && s[2].indexOf('"') !== 0)) {
          neighbors.push([s[2]]);
        }
      });

      return this.connector.$getStatements(undefined, edgeTypeFilter, [nodeId]);
    }).then(statementsObj => {
      _.forEach(statementsObj, s => {
        neighbors.push([s[0]]);
      });

      if (Utils.hasValue(categories)) {
        const noCategoryAllowed = categories.includes(DaoUtils.LABEL_NODES_WITH_NO_CATEGORY);

        // we remove the special LABEL_NODES_WITH_NO_CATEGORY case
        categories = _.filter(categories,
          c => c !== DaoUtils.LABEL_NODES_WITH_NO_CATEGORY)
          .map(category => this._utils.formatCategoryValue(category));

        const categoriesToRetrieve = _.uniqBy(neighbors, '0');
        return this.connector.$getStatements(categoriesToRetrieve, [this._categoryPredicate])
          .then(categoryStatements => {
            const categoryMap = new Map();

            _.forEach(categoryStatements, s => {
              if (!categoryMap.has(s[0])) {
                categoryMap.set(s[0], []);
              }
              categoryMap.get(s[0]).push(s[2]);
            });

            neighbors = _.filter(neighbors, n => {
              if (noCategoryAllowed && categoryMap.get(n[0]).length === 0) {
                return true;
              }
              return _.intersection(categoryMap.get(n[0]), categories).length > 0;
            });
          });
      }
    }).then(() => {
      if (Utils.noValue(limitType) || limitType === 'id') {
        return neighbors;
      } else {
        return Promise.map(neighbors, n => {
          return this._getNodesIndividualDegree([n[0]]).then(nodeDegree => {
            // we convert the cardinality to a literal value just to match the same result
            // of the equivalent SPARQL query in $getAdjacentNodes
            return [n[0], this._utils.toLiteral(nodeDegree.get(n[0]))];
          });
        });
      }
    });
  }

  /**
   * Get the neighbors of a subset of nodes.
   *
   * This method is responsible to check that all the source nodes have been found.
   *
   * @param {any[]}    nodeIds                IDs of the nodes to retrieve the neighbors for (decoded for the graph database)
   * @param {object}   options
   * @param {any[]}    options.ignoredNodeIds IDs of nodes we do not want in the results (decoded for the graph database)
   * @param {any[]}    options.visibleNodeIds IDs of nodes already visible in the visualization (decoded for the graph database)
   *                                          We won't return them but we return edges to them
   * @param {number}   [options.limit]        Max number of nodes in result
   * @param {string}   options.limitType      "id", "lowestDegree" or "highestDegree" to sort results before limiting
   * @param {string[]} [options.categories]   Exclusive list of node-categories to restrict the result
   * @param {string[]} [options.types]        Exclusive list of edge-type to restrict the result
   * @returns {Bluebird<LkNode[]>}
   */
  $getAdjacentNodes(nodeIds, options) {
    // 1) Retrieve the ids of all the adjacent nodes (and their cardinality if required)
    return Promise.map(nodeIds, nodeId => {
      if (!this.supportBlankNodeLabels && this._utils.isBlankNode(nodeId)) {
        // fallback to the most expensive solution for blank nodes
        return this._getAdjacentNodesBlankNodes(nodeId,
          options.limitType, options.categories, options.types);
      }

      // if there are no blank nodes or blank node labels are supported, we can use a SPARQL query
      return this.connector.$doSparqlQuery(this._generateAdjNodeSparqlQuery(
        nodeId, options.limitType, options.categories, options.types));
    }).then(adjacentNodesR => {
      let mergedAdjacentNodesR = [].concat.apply([], adjacentNodesR);

      if (options.limitType !== 'id') {
        // if the cardinality are returned, we convert them to numeric values
        mergedAdjacentNodesR = _.map(mergedAdjacentNodesR, r => [r[0],
          Number(r[1].slice(1, r[1].indexOf('^') - 1))]);
      }

      // adjacentNodesR[][0] is a nodeId of an adjacent node
      // adjacentNodesR[][1] is (optionally, if `options.limitType` !== "id") its cardinality

      const adjNodesCardinalityMap = new Map(); // if cardinality is undefined we just use this Map as a Set

      for (const pair of mergedAdjacentNodesR) {
        if (pair[0] !== null && pair[0] !== undefined) { // if edgeType was specified and the edgeType was not found, the pair [null, 0] is returned
          adjNodesCardinalityMap.set(pair[0], pair[1]);
        }
      }

      // 2) remove ignoredNodeIds
      for (const ignoredNodeId of options.ignoredNodeIds) {
        adjNodesCardinalityMap.delete(ignoredNodeId);
      }

      // 3) remove visibleNodeIds
      for (const visibleNodeId of options.visibleNodeIds) {
        adjNodesCardinalityMap.delete(visibleNodeId);
      }

      // 4) remove sourceNodeIds
      for (const sourceNodeId of nodeIds) {
        adjNodesCardinalityMap.delete(sourceNodeId);
      }

      // 5) decide which ones are the nodes to retrieve and will appear in the result
      let adjNodeIdsWithCardinality = Array.from(adjNodesCardinalityMap.entries());

      if (options.limitType === 'id') {
        // we sort the keys alphabetically
        adjNodeIdsWithCardinality = _.sortBy(adjNodeIdsWithCardinality, o => o[0]);
      } else if (options.limitType === 'highestDegree') {
        adjNodeIdsWithCardinality = _.sortBy(adjNodeIdsWithCardinality, o => -o[1]);
      } else { // lowestDegree
        adjNodeIdsWithCardinality = _.sortBy(adjNodeIdsWithCardinality, o => o[1]);
      }

      let adjNodeIds = _.map(adjNodeIdsWithCardinality.slice(0, options.limit), s => s[0]);

      adjNodeIds = adjNodeIds.concat(nodeIds);

      return this.$getNodesByID(
        {ids: adjNodeIds, edges: 'strict', visibleNodeIds: options.visibleNodeIds}
      ).then(nodes => {
        DaoUtils.checkMissing('node', adjNodeIds, nodes);
        return nodes;
      });
    });
  }

  /**
   * Blank nodes can't be used in SPARQL queries (except if the driver support blank node labels)
   * so here we simulate the same request made for each node in $getAdjacencyDigest.
   *
   * Given a blank node, return all the id of the neighbors, their edgeType and nodeCategory
   * (if more than one category returns a triple for each).
   *
   * @param {string} nodeId
   * @returns {Bluebird<string[][]>} triples nodeId, edgeType, nodeCategory
   * @private
   */
  _getAdjacencyDigestBlankNodes(nodeId) {
    /**@type {Array<[string, string]>}*/
    const pairs = []; // nodeId, edgeType
    return this.connector.$getStatements([nodeId]).then(statementsSubj => {
      _.forEach(statementsSubj, s => {
        if ((s[1] !== this._categoryPredicate && s[2].indexOf('"') !== 0)) {
          pairs.push([s[2], s[1]]);
        }
      });

      return this.connector.$getStatements(undefined, undefined, [nodeId]);
    }).then(statementsObj => {
      _.forEach(statementsObj, s => {
        pairs.push([s[0], s[1]]);
      });

      const categoriesToRetrieve = _.uniqBy(_.map(pairs, s => s[0]), _.identity);
      return this.connector.$getStatements(categoriesToRetrieve, [this._categoryPredicate]);
    }).then(categoryStatements => {
      const categoryMap = new Map();

      _.forEach(categoryStatements, s => {
        if (!categoryMap.has(s[0])) {
          categoryMap.set(s[0], []);
        }
        categoryMap.get(s[0]).push(s[2]);
      });

      const triples = [];
      _.forEach(pairs, s => {
        const nodeCategories = categoryMap.get(s[0]);
        _.forEach(nodeCategories, nodeCategory => {
          triples.push([s[0], s[1], nodeCategory]);
        });
      });

      return triples;
    });
  }

  /**
   * Provide a neighborhood digest of a specified subset of nodes.
   *
   * @param {any[]} nodeIds IDs of the nodes (decoded for the graph database)
   * @returns {Bluebird<LkDigestItem[]>}
   */
  $getAdjacencyDigest(nodeIds) {
    return Promise.map(nodeIds, nodeId => {
      if (!this.supportBlankNodeLabels && this._utils.isBlankNode(nodeId)) {
        // fallback to the most expensive solution for blank nodes
        return this._getAdjacencyDigestBlankNodes(nodeId);
      }

      if (this._utils.isBlankNode(nodeId)) {
        nodeId = '<' + nodeId + '>'; // wrap in angle bracket
      }

      // if there are no blank nodes or blank node labels are supported, we can use a SPARQL query
      return this.connector.$doSparqlQuery('select ?s ?p ?c {{?s ?p ' + nodeId + '}' +
        ' union {' + nodeId + ' ?p ?s. filter not exists {' + nodeId + ' ' +
        this._categoryPredicate + ' ?s}. filter isURI(?s).}. optional {?s ' +
        this._categoryPredicate + ' ?c}}');
    }).then(digestR => {
      // digestR is a string[][][], an array (1 entry per node) of array of statements (string[])

      /**@type {string[][]}*/
      const mergedDigestR = [].concat.apply([], digestR);
      // we merge all the triples nodeId, edgeType, nodeCategory in one array

      const result = new Map();
      const groupByEdge = _.groupBy(mergedDigestR, s => s[1]);
      for (const edgeType of _.keys(groupByEdge)) { // we group the statements by edgeType
        const edgeGroup = groupByEdge[edgeType];
        const subGroupByNodeId = _.groupBy(edgeGroup, s => s[0]); // this time we group the statements by nodeId

        for (const nodeId of _.keys(subGroupByNodeId)) {
          const nodeGroup = subGroupByNodeId[nodeId];
          let nodeCategories = _.sortBy(_.map(nodeGroup, s => s[2])); // categories for this nodeId
          // we have 1 node entry for the pair nodeCategories, edgeType
          // and as many edge entries as the number of duplicates nodeCategories
          let numberOfEdgeEntries = 1;
          if (nodeCategories.length >= 2 && nodeCategories[0] === nodeCategories[1]) {
            const originalLength = nodeCategories.length;
            nodeCategories = _.sortedUniq(nodeCategories);

            // every time a node appears x times in the digest it has the same node categories x times
            numberOfEdgeEntries = originalLength / nodeCategories.length;
          }
          const resultKey = '' + [edgeType].concat(nodeCategories);
          if (!result.has(resultKey)) {
            if (nodeCategories.indexOf(null) === 0 || nodeCategories.indexOf(undefined) === 0) {
              nodeCategories = [];
            } else {
              nodeCategories = _.map(nodeCategories, c => {
                return this._utils.parseCategoryValue(c);
              });
            }
            result.set(resultKey, {
              nodeCategories,
              edgeType: this._utils.fullURIToShortName(edgeType),
              nodes: 0,
              edges: 0
            });
          }
          const resultCount = result.get(resultKey);
          resultCount.nodes++;
          resultCount.edges += numberOfEdgeEntries;
        }
      }

      return Array.from(result.values());
    });
  }

  /**
   * Faster implementation of $getNodeDegree that use a SPARQL query.
   *
   * If there are blank nodes in nodeIds, we assume that blank node labels are supported.
   *
   * @param {string[]} nodeIds
   * @param {object}   options
   * @param {string[]} [options.readableCategories]
   * @param {string[]} [options.readableTypes]
   * @returns {Bluebird<number>}
   * @private
   */
  _getNodeDegree(nodeIds, options) {
    nodeIds = this._utils.wrapBlankNodesInAngleBrackets(nodeIds);

    const nodeIdsFilter = nodeIds.map(id => '(' + id + ')').join(' ');
    let edgeTypeFilter = '';
    let nodeCategoryFilter = '';

    if (Utils.hasValue(options.readableTypes)) {
      const edgeTypes = options.readableTypes.map(t => this._utils.shortNameToFullURI(t));
      edgeTypeFilter = 'VALUES (?p) { ' + edgeTypes.map(id => '(' + id + ')').join(' ') + ' }.';
    }

    if (Utils.hasValue(options.readableCategories)) {
      // we remove the special '[no_category]' case
      const nodeCategories = _.filter(options.readableCategories,
        c => c !== DaoUtils.LABEL_NODES_WITH_NO_CATEGORY)
        .map(c => this._utils.formatCategoryValue(c));
      const joinedCategories = nodeCategories.map(id => '(' + id + ')').join(' ');

      nodeCategoryFilter = 'VALUES (?c) { ' + joinedCategories + ' }. ' +
        '?s ' + this._categoryPredicate + ' ?c.';

      if (options.readableCategories.includes(DaoUtils.LABEL_NODES_WITH_NO_CATEGORY)) {
        nodeCategoryFilter = '{{' + nodeCategoryFilter + '} union ' +
          '{filter not exists {?s ' + this._categoryPredicate + ' ?c}}}';
      }
    }

    const degreeSparqlQuery = 'select (count(distinct ?s) as ?count) {' +
      'VALUES (?o) { ' + nodeIdsFilter + ' }.' +
      '{' + edgeTypeFilter +
      '{?s ?p ?o.} union {?o ?p ?s. ' +
      'filter not exists {?o ' + this._categoryPredicate + ' ?s}. ' +
      'filter isURI(?s).}.}.' +
      nodeCategoryFilter + '}';

    return this.connector.$doSparqlQuery(degreeSparqlQuery).then(degreeR => {
      return this._utils.revertLiteral(degreeR[0][0]);
    });
  }

  /**
   * Slower implementation of $getNodeDegree, too slow for super nodes but compatible with
   * blank nodes.
   *
   * @param {string[]} nodeIds
   * @param {object}   options
   * @param {string[]} [options.readableCategories]
   * @param {string[]} [options.readableTypes]
   * @returns {Bluebird<number>}
   * @private
   */
  _getNodeDegreeForBlankNodes(nodeIds, options) {
    return Promise.map(nodeIds, nodeId => {
      if (this._utils.isBlankNode(nodeId)) {
        return this._getAdjacencyDigestBlankNodes(nodeId);
      } else {
        return this.connector.$doSparqlQuery('select ?s ?p ?c {{?s ?p ' + nodeId + '}' +
          ' union {' + nodeId + ' ?p ?s. filter not exists {' + nodeId + ' ' +
          this._categoryPredicate + ' ?s}. filter isURI(?s).}. optional {?s ' +
          this._categoryPredicate + ' ?c}}');
      }
    }).then(digestR => {
      // digestR is a string[][][], an array (1 entry per node) of array of statements (string[])

      /**@type {string[][]}*/
      let mergedDigestR = [].concat.apply([], digestR);
      // we merge all the triples nodeId, edgeType, nodeCategory in one array
      // up to here the algorithm is the same of the digest response

      if (options.readableTypes) {
        const edgeTypes = options.readableTypes.map(t => this._utils.shortNameToFullURI(t));
        // remove all the statements where the edgeType is not included in readableTypes
        mergedDigestR = _.filter(mergedDigestR, stmt => edgeTypes.includes(stmt[1]));
      }

      if (options.readableCategories) {
        const nodeCategories = options.readableCategories.map(c => {
          if (c !== DaoUtils.LABEL_NODES_WITH_NO_CATEGORY) {
            return this._utils.formatCategoryValue(c);
          } else {
            return null; // null is the "no categories" category in digestR
          }
        });
        // remove all the statements where the nodeCategory is not included in readableCategories
        mergedDigestR = _.filter(mergedDigestR, stmt => nodeCategories.includes(stmt[2]));
      }

      return _.uniqBy(_.map(mergedDigestR, s => s[0]), _.identity).length;
    });
  }

  /**
   * Return the degree of the specified node if `nodeIds` has cardinality 1.
   * If multiple `nodeIds` are specified, return the cardinality of the intersection
   * of the neighbors of the nodes (not including the nodes in input themselves).
   *
   * @param {any[]}    nodeIds                      IDs of the nodes (decoded for the graph database)
   * @param {object}   options
   * @param {string[]} [options.readableCategories] Exclusive list of node-categories to restrict the result
   * @param {string[]} [options.readableTypes]      Exclusive list of edge-type to restrict the result
   * @returns {Bluebird<number>}
   */
  $getNodeDegree(nodeIds, options) {
    if (!this.supportBlankNodeLabels &&
      nodeIds.filter(nodeId => this._utils.isBlankNode(nodeId)).length !== 0) {
      // fallback to the most expensive solution for blank nodes
      return this._getNodeDegreeForBlankNodes(nodeIds, options);
    }

    // if there are no blank nodes or blank node labels are supported, we can use a SPARQL query
    return this._getNodeDegree(nodeIds, options);
  }

  /**
   * Create a node.
   *
   * @param {LkNodeAttributes} newNode
   * @returns {Bluebird<LkNode>}
   */
  $createNode(newNode) {
    const nodeWithId = Utils.clone(newNode);
    if (Utils.noValue(nodeWithId.id)) {
      if (Utils.hasValue(this._idPropertyName) &&
        Utils.hasValue(newNode.data[this._idPropertyName])) {
        // if the user has chosen an id, use it
        if (this._utils.isBlankNode(newNode.data[this._idPropertyName])) {
          // we cannot let the user create new blank nodes, id will change and mess the indexation
          return Errors.business('not_supported',
            'Creation of blank nodes is not supported by Linkurious.', true);
        }
        nodeWithId.id = this._utils.shortNameToFullURI(nodeWithId.data[this._idPropertyName]);
        delete nodeWithId.data[this._idPropertyName];
      } else {
        // if not, pick one randomly
        nodeWithId.id = this._utils.shortNameToFullURI(shortid.generate());
      }
    }

    return this.connector.$addStatements(
      this._utils.formatNodeToStatements(nodeWithId)
    ).return(nodeWithId);
  }

  /**
   * Update the properties and categories of a node.
   * Check if the node exists and fail if it doesn't.
   *
   * @param {any}      nodeId                       ID of the node to update (decoded for the graph database)
   * @param {object}   nodeUpdate
   * @param {any}      nodeUpdate.data              Properties to update
   * @param {string[]} nodeUpdate.deletedProperties Properties to delete
   * @param {string[]} nodeUpdate.addedCategories   Categories to add
   * @param {string[]} nodeUpdate.deletedCategories Categories to delete
   * @returns {Bluebird<LkNode>} null if not found
   */
  $updateNode(nodeId, nodeUpdate) {
    if (Utils.hasValue(this._idPropertyName) &&
      Utils.hasValue(nodeUpdate.data[this._idPropertyName])) {
      return Errors.business('not_supported', 'Updating the id is not supported in a triple store.',
        true);
    }

    const deleteArray = [];
    const newStatements = [];

    return this.$getNode({id: nodeId}).then(node => {
      if (Utils.noValue(node)) {
        return null;
      }

      const updatedProperties = [];
      for (const property in nodeUpdate.data) {
        if (nodeUpdate.data.hasOwnProperty(property) && node.data.hasOwnProperty(property)) {
          updatedProperties.push(property);
        }
      }

      let afterEditStatementsCount = this._utils.formatNodeToStatements(node).length;

      // 1) delete updated properties
      _.forEach(updatedProperties, property => {
        afterEditStatementsCount--;
        deleteArray.push({
          subject: nodeId,
          predicate: this._utils.shortNameToFullURI(property),
          object: undefined
        });
      });

      // 2) delete deleted properties
      _.forEach(nodeUpdate.deletedProperties, property => {
        afterEditStatementsCount--;
        deleteArray.push({
          subject: nodeId,
          predicate: this._utils.shortNameToFullURI(property),
          object: undefined
        });
      });

      // 3) delete deleted categories
      _.forEach(nodeUpdate.deletedCategories, category => {
        afterEditStatementsCount--;
        deleteArray.push({
          subject: nodeId,
          predicate: this._categoryPredicate,
          object: this._utils.formatCategoryValue(category)
        });
      });

      // 4) add new categories
      for (const category of nodeUpdate.addedCategories) {
        afterEditStatementsCount++;
        newStatements.push([
          nodeId,
          this._categoryPredicate,
          this._utils.formatCategoryValue(category)
        ]);
      }

      // 5) add new properties
      for (const property of Object.keys(nodeUpdate.data)) {
        afterEditStatementsCount++;
        newStatements.push([
          nodeId,
          this._utils.shortNameToFullURI(property),
          this._utils.toLiteral(nodeUpdate.data[property])
        ]);
      }

      if (afterEditStatementsCount === 0) {
        return Errors.business(
          'invalid_parameter',
          'A node must have at least one property or one category.',
          true
        );
      }

      return this.connector.$deleteMultipleStatements(deleteArray).then(() => {
        return this.connector.$addStatements(newStatements);
      }).then(() => {
        return this.$getNode({id: nodeId});
      });
    });
  }

  /**
   * Delete a node and all edges connected to it.
   *
   * @param {any} nodeId ID of the node to delete (decoded for the graph database)
   * @returns {Bluebird<boolean>} true if deleted
   */
  $deleteNode(nodeId) {
    return this.connector.$deleteStatements(undefined, undefined, nodeId).then(resultObj => {
      return this.connector.$deleteStatements(nodeId).then(resultSubj => {
        return resultObj || resultSubj;
      });
    });
  }

  /**
   * Return a map indexed by id populated with the degree of each node.
   *
   * @param {string[]} nodesIds
   * @returns {Bluebird<Map<string, number>>} degree
   * @private
   */
  _getNodesIndividualDegree(nodesIds) {
    const nodeDegreeMap = new Map();
    return Promise.map(nodesIds, nodeId => {
      return this.$getNodeDegree([nodeId], {}).then(degree => nodeDegreeMap.set(nodeId, degree));
    }).return(nodeDegreeMap);
  }

  /**
   * Slower implementation of $getAdjacentEdges, too slow for super nodes but compatible with
   * blank nodes.
   *
   * @param {object} options
   * @param {any}    options.nodeId       ID of the node (decoded for the graph database)
   * @param {string} options.orientation 'source', 'target' or 'both'
   * @param {string} [options.type]       An edge type to filter on (expand following only edges of this type)
   * @param {number} [options.skip]       For pagination
   * @param {number} [options.limit]      For pagination
   * @returns {Bluebird<LkEdge[]>}
   */
  _getAdjacentEdgesBlankNodes(options) {
    // 1) Retrieve the degrees of adjacent nodes that are necessary to sort the result
    const types = Utils.hasValue(options.type) ? [options.type] : undefined;

    return this.$getAdjacentNodes([options.nodeId], {ignoredNodeIds: [], visibleNodeIds: [],
      types: types, limitType: 'id'}).then(nodes => {
      return this._getNodesIndividualDegree(_.map(nodes, 'id')).then(nodeDegreeMap => {
        // 2) Retrieve the sourceNode, always contained in the result of $getAdjacentNodes
        const sourceNode = _.filter(nodes, node => node.id === options.nodeId)[0];

        /**@type{[number, LkEdge][]}*/
        let nodeEdgePair = []; // Pair of edges and node degree

        for (const edge of sourceNode.edges) {
          const oppositeOrientation = edge.source !== sourceNode.id ? 'source' : 'target';
          // options.orientation can be 'both', 'source' and 'target'
          // 'both' can never be equal to oppositeOrientation
          if (options.orientation === oppositeOrientation) {
            // we are not interested to this edge
            continue;
          }

          const oppositeNodeId = /**@type {string}*/ (edge[oppositeOrientation]);

          nodeEdgePair.push([nodeDegreeMap.get(oppositeNodeId), edge]);
        }

        // 3) Sort all the edges by node degree in descending order
        nodeEdgePair = _.orderBy(nodeEdgePair, ['0'], ['desc']);

        let edges = _.map(nodeEdgePair, pair => pair[1]);
        // 4) Enforce skip and limit if defined
        if (Utils.hasValue(options.skip)) {
          edges = edges.slice(options.skip);
        }

        if (Utils.hasValue(options.limit)) {
          edges = edges.slice(0, options.limit);
        }

        return edges;
      });
    });
  }

  /**
   * Faster implementation of $getAdjacentEdges that use a SPARQL query.
   *
   * If options.nodeId is a blank node, we assume that blank node labels are supported.
   *
   * @param {object} options
   * @param {any}    options.nodeId       ID of the node (decoded for the graph database)
   * @param {string} options.orientation 'source', 'target' or 'both'
   * @param {string} [options.type]       An edge type to filter on (expand following only edges of this type)
   * @param {number} [options.skip]       For pagination
   * @param {number} [options.limit]      For pagination
   * @returns {Bluebird<LkEdge[]>}
   */
  _getAdjacentEdges(options) {
    options = Utils.clone(options);
    if (this._utils.isBlankNode(options.nodeId)) {
      options.nodeId = '<' + options.nodeId + '>'; // wrap in angle bracket
    }

    const edgeFilter = Utils.noValue(options.type)
      ? '?p' : this._utils.shortNameToFullURI(options.type);

    // 1) Build a query with options.nodeId as the source and that returns triples containing the target, the type of the edge and the cardinality of the target
    const sparqlQuerySource = 'select (COUNT(*) AS ?count) ?s ?p {' +
      '{' + options.nodeId + ' ' + edgeFilter + ' ?s. filter isURI(?s). ' +
      'filter not exists {' + options.nodeId + ' ' + this._categoryPredicate + ' ?s }.}. ' +
      '{?s ?p2 ?o2. filter isURI(?o2). ' +
      'filter not exists {?s ' + this._categoryPredicate + ' ?o2}.} union {?o2 ?p2 ?s.}.} ' +
      'group by ?s ?p';

    // 2) Build a query with options.nodeId as the target and that returns triples containing the source, the type of the edge and the cardinality of the source
    const sparqlQueryTarget = 'select  (COUNT(*) AS ?count) ?s ?p {' +
      '{?s ' + edgeFilter + ' ' + options.nodeId + '.}. ' +
      '{?s ?p2 ?o2. filter isURI(?o2). ' +
      'filter not exists {?s ' + this._categoryPredicate + ' ?o2}.} union {?o2 ?p2 ?s.}.} ' +
      'group by ?s ?p';

    return Promise.resolve().then(() => {
      if (options.orientation !== 'target') {
        return this.connector.$doSparqlQuery(sparqlQuerySource);
      }
      return [];
    }).then(sourceAdjacentEdgesR => {
      return Promise.resolve().then(() => {
        if (options.orientation !== 'source') {
          return this.connector.$doSparqlQuery(sparqlQueryTarget);
        }
        return [];
      }).then(targetAdjacentEdgesR => {
        const sourceAdjacentEdgesWithDegree = _.map(sourceAdjacentEdgesR, s =>
          [Number(s[0].slice(1, s[0].indexOf('^') - 1)), undefined, s[2] || edgeFilter, s[1]]);
        // Number(s[0].slice(1, s[0].indexOf('^') - 1)) is a trick to avoid calling revertLiteral on s[0]
        const targetAdjacentEdgesWithDegree = _.map(targetAdjacentEdgesR, s =>
          [Number(s[0].slice(1, s[0].indexOf('^') - 1)), s[1], s[2] || edgeFilter, undefined]);

        let adjacentEdgesWithDegree =
          sourceAdjacentEdgesWithDegree.concat(targetAdjacentEdgesWithDegree);

        // 3) Sort all the edges by node degree in descending order
        adjacentEdgesWithDegree = _.sortBy(adjacentEdgesWithDegree, o => -o[0]);

        adjacentEdgesWithDegree = _.filter(adjacentEdgesWithDegree, o => o[0] !== 0);

        // 4) Enforce skip and limit if defined
        if (Utils.hasValue(options.skip)) {
          adjacentEdgesWithDegree = adjacentEdgesWithDegree.slice(options.skip);
        }

        if (Utils.hasValue(options.limit)) {
          adjacentEdgesWithDegree = adjacentEdgesWithDegree.slice(0, options.limit);
        }
        return adjacentEdgesWithDegree;
      });
    }).then(adjacentEdgesWithDegree => {
      return _.map(adjacentEdgesWithDegree, e => {
        if (e[1] === undefined) { // edge with options.nodeId as source
          return this._utils.parseStatementForEdge([options.nodeId, e[2], e[3]]);
        } else {
          return this._utils.parseStatementForEdge([e[1], e[2], options.nodeId]);
        }
      });
    });
  }

  /**
   * Get the adjacent edges of a node.
   * The adjacent, source and target options are mutually exclusive.
   *
   * @param {object} options
   * @param {any}    options.nodeId       ID of the node (decoded for the graph database)
   * @param {string} options.orientation 'source', 'target' or 'both'
   * @param {string} [options.type]       An edge type to filter on (expand following only edges of this type)
   * @param {number} [options.skip]       For pagination
   * @param {number} [options.limit]      For pagination
   * @returns {Bluebird<LkEdge[]>}
   */
  $getAdjacentEdges(options) {
    if (!this.supportBlankNodeLabels && this._utils.isBlankNode(options.nodeId)) {
      // fallback to the most expensive solution for blank nodes
      return this._getAdjacentEdgesBlankNodes(options);
    }

    // if there are no blank nodes or blank node labels are supported, we can use a SPARQL query
    return this._getAdjacentEdges(options);
  }

  /**
   * Get an edge by id.
   *
   * @param {object} options
   * @param {any}    options.id              ID of the edge (decoded for the graph database)
   * @param {string} [options.alternativeId] The property to match `options.id` on (instead of the actual ID)
   * @returns {Bluebird<LkEdge>} null if not found
   */
  $getEdge(options) {
    return this.$getEdgesByID({ids: [options.id]}).then(edges => edges[0]);
  }

  /**
   * Create an edge.
   *
   * This method is responsible to check that source and target nodes have been found.
   *
   * @param {LkEdgeAttributes} newEdge The edge to create
   * @returns {Bluebird<LkEdge>}
   */
  $createEdge(newEdge) {
    // first, verify that source and target exist
    return this.$getNodesByID(
      {ids: [newEdge.source, newEdge.target], edges: 'none'}
    ).then(nodes => {
      try {
        DaoUtils.checkMissing('node', [newEdge.source, newEdge.target], nodes);
      } catch(e) {
        return Errors.business('node_not_found', 'Source or target node not found.', true);
      }

      const edgeWithId = Utils.clone(newEdge);
      edgeWithId.id = this._utils.getIdFromEdge(newEdge);

      return this.connector.$addStatements(
        [this._utils.formatEdgeToStatement(edgeWithId)]
      ).return(edgeWithId);
    });
  }

  /**
   * Delete an edge.
   *
   * @param {any} edgeId ID of the edge (decoded for the graph database)
   * @returns {Bluebird<boolean>} true if deleted
   */
  $deleteEdge(edgeId) {
    const edge = this._utils.getEdgeFromId(edgeId);
    const edgeTriple = this._utils.formatEdgeToStatement(edge);

    // we forbid the edge deletion if the source and/or target nodes are empty
    return this.$getNodesByID({ids: [edge.source, edge.target], edges: 'none'}).then(nodes => {
      try {
        DaoUtils.checkMissing('node', [edge.source, edge.target], nodes);
      } catch(e) {
        return false;
      }

      if (this.$isEmptyNode(nodes[0]) || this.$isEmptyNode(nodes[1])) {
        return Errors.business(
          'not_supported',
          'Deleting an edge connected to an empty node is prohibited in a triple store',
          true
        );
      }
      return this.connector.$deleteStatements(edgeTriple[0], edgeTriple[1], edgeTriple[2]);
    });
  }

  /**
   * Run a raw query.
   *
   * If options.populated is true, return a Readable<QueryMatchPopulated>, otherwise a Readable<QueryMatch>.
   *
   * @param {object}  options
   * @param {string}  options.dialect   Supported graph query dialect
   * @param {string}  options.query     The graph query
   * @param {boolean} options.canWrite  Whether the query is allowed to alter the data
   * @param {boolean} options.populated Whether to return QueryMatchPopulated or QueryMatch
   * @param {number}  options.limit     Maximum number of matched subgraphs
   * @returns {Bluebird<Readable<(QueryMatch | QueryMatchPopulated)>>}
   */
  $rawQuery(options) {
    return this.connector.$doSparqlQuery(
      options.query,
      // TODO #938 sparql rawQuery, use a stream
      Config.get('advanced.rawQueryTimeout'),
      options.canWrite
    ).then(statements => {
      // 1) Create LkEdges from all the edge statements
      const edgeStatements = _.filter(statements,
        statement => (this._utils.statementIsATriple(statement) &&
            this._utils.statementIsAnEdge(statement))
      );
      let edges = _.map(edgeStatements, edgeStatement => {
        try {
          return this._utils.parseStatementForEdge(edgeStatement);
        } catch(e) {
          Log.warn('Could not parse edge statement: ', e.message);
          return undefined;
        }
      });

      edges = _.filter(edges, edge => Utils.hasValue(edge));

      // 2) Collect all the URI I can find
      const candidateNodeIds = [];
      for (const statement of statements) {
        for (const element of statement) {
          if (this._utils.isURI(element)) {
            candidateNodeIds.push(element);
          }
        }
      }

      // 3) Retrieve the nodes
      return this.$getNodesByID({ids: candidateNodeIds, edges: 'none'})
        .then(nodes => {
          // 4) Populate the nodes with the edges
          return DaoUtils.populateNodesWithEdges(nodes, edges, 'all');
        });
    }).then(nodes => {
      const stream = new MockStream();
      stream.end({
        nodes: nodes
      });

      return stream;
    });
  }

  /**
   * Return true if the node specified is empty.
   *
   * @param {LkNode | LkNodeAttributes} node
   * @returns {boolean}
   */
  $isEmptyNode(node) {
    let properties = Object.keys(node.data);
    if (Utils.hasValue(this._idPropertyName)) {
      // _idPropertyName is an artificial property not actually stored so it doesn't count
      properties = _.filter(properties, p => p !== this._idPropertyName);
    }
    // if it has no category and no property, it's empty
    return node.categories.length === 0 && properties.length === 0;
  }
}

module.exports = SparqlDriver;
