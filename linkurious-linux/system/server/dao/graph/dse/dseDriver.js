/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-01.
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../../../services');
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();

// locals
const GremlinDriver = require('../gremlinDriver');
const GremlinUtils = require('../../utils/gremlinUtils');
const DseUtils = require('../../utils/dseUtils');

const MAX_CONCURRENT_GET_EDGES_BY_ID = 5;

class DseDriver extends GremlinDriver {

  /**
   * @param {Connector} connector     Connector used by the DAO
   * @param {any}       graphOptions  GraphDAO options
   * @param {any}       connectorData Data from the connector
   */
  constructor(connector, graphOptions, connectorData) {
    super(connector, graphOptions, connectorData, {
      manageTransactions: true
    });

    this._schemaInfo = {
      propertyTypes: {},
      nodeSchema: {},
      edgeSchema: {},
      searchIndices: {},
      indexedProperties: []
    };
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
   * @param {boolean} [skipDecoding=false] Skip the decoding (return id)
   * @returns {any} The ID of the edge (encoded or not)
   * @throws {LkError} if the ID is not valid
   */
  $checkEdgeId(key, id, skipDecoding) {
    Utils.check.string(key, id, true);
    if (skipDecoding) { return id; }
    try {
      return JSON.parse(Buffer.from(id + '', 'base64').toString('ascii'));
    } catch(e) {
      throw Errors.business(
        'invalid_parameter', `"${key}" must be a base64-encoded JSON string.`
      );
    }
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
   * @param {boolean} [skipDecoding=false] Skip the decoding (return id)
   * @returns {any} the ID of the node (encoded or not)
   * @throws {LkError} if the ID is not valid
   */
  $checkNodeId(key, id, skipDecoding) {
    Utils.check.string(key, id, true);
    if (skipDecoding) { return id; }
    try {
      return JSON.parse(Buffer.from(id + '', 'base64').toString('ascii'));
    } catch(e) {
      throw Errors.business(
        'invalid_parameter', `"${key}" must be a base64-encoded JSON string.`
      );
    }
  }

  /**
   * Encode a raw Node ID in an ID usable in an LkNode.
   *
   * @param {any} rawId
   * @returns {string}
   */
  $encodeNodeId(rawId) {
    // TODO DSE ids are dependent on the order of keys in rawId
    return Buffer.from(JSON.stringify(rawId), 'ascii').toString('base64');
  }

  /**
   * Encode a raw Edge ID in an ID usable in an LkEdge.
   *
   * @param {any} rawId
   * @returns {string}
   */
  $encodeEdgeId(rawId) {
    return Buffer.from(JSON.stringify(rawId), 'ascii').toString('base64');
  }

  /**
   * List all edgeTypes, nodeCategories, edgeProperties, nodeProperties
   * that exist in the graph database.
   *
   * @returns {Bluebird<{nodeCategories: string[], edgeTypes: string[], nodeProperties: string[], edgeProperties: string[]}>}
   */
  $getSimpleSchema() {
    return Promise.resolve().then(() => {
      const nodeCategories = _.keys(this._schemaInfo.nodeSchema);
      const edgeTypes = _.keys(this._schemaInfo.edgeSchema);
      const nodeProperties = _.uniq.apply(_, _.values(this._schemaInfo.nodeSchema));
      const edgeProperties = _.uniq.apply(_, _.values(this._schemaInfo.edgeSchema));

      return {
        nodeCategories: nodeCategories,
        edgeTypes: edgeTypes,
        nodeProperties: nodeProperties,
        edgeProperties: edgeProperties
      };
    });
  }

  /**
   * Provide a neighborhood digest of a specified subset of nodes.
   *
   * @param {any[]} nodeIds IDs of the nodes (decoded for the graph database)
   * @returns {Bluebird<LkDigestItem[]>}
   */
  $getAdjacencyDigest(nodeIds) {
    const query = `
      nodeIds = ${GremlinUtils.quote(nodeIds)};
      
      triples = [];
      
      for (sourceNodeId in nodeIds) {
        g.V(sourceNodeId)
        .bothE().as('edge')
        .otherV().as('other')
        .select('edge','other').each({entry -> 
          triples.push([entry.other.id(), entry.edge.label(), entry.other.label()]);
        });
      }
      
      computeDigest(triples);
    `;

    return this.connector.$doGremlinQuery(query);
  }

  /**
   * Called at the begin of the internal indexation phase for additional initializations.
   * Not called for external indices.
   *
   * @returns {Bluebird<void>}
   */
  $onInternalIndexation() {
    const q = `inject(
      scan: graph.schema().config().option('graph.allow_scan').get()
    )`;
    return this.connector.$doGremlinQuery(q).get('0').then(r => {
      if (r.scan !== true) {
        return Errors.business(
          'source_action_needed',
          '"graph.allow_scan" must be enabled to use DSE with internal indices.',
          true
        );
      }

      return this._refreshSchema();
    });
  }

  /**
   * Get an edge by id.
   *
   * @param {object} options
   * @param {any}    options.id ID of the edge (decoded for the graph database)
   * @returns {Bluebird<LkEdge>} null if not found
   */
  $getEdge(options) {
    // TODO #930 wait for a response from Datastax and find a fix for this. It could be optimized to a single query with a try catch in a loop
    return this.$getEdgesByID({ids: [options.id]}).then(edges => edges[0]);
  }

  /**
   * Get a list of edges by ID.
   *
   * @param {object} options
   * @param {any[]}  options.ids List of IDs to read (decoded for the graph database)
   * @returns {Bluebird<LkEdge[]>}
   */
  $getEdgesByID(options) {
    // TODO #930 wait for a response from Datastax and find a fix for this. It could be optimized to a single query with a try catch in a loop
    return /**@type {Bluebird<LkEdge[]>}*/ (Promise.map(options.ids, id => {
      // option `alternativeId` is ignored because only alternative node ids are supported in DSE
      return super.$getEdge({id: id}).catch(e => {
        if (e && e.message && e.message.includes('full scan')) {
          return; // a request for full scan occurs when the edge is not found
        }

        throw e;
      });
    }, {concurrency: MAX_CONCURRENT_GET_EDGES_BY_ID}).then(result => _.compact(result)));
  }

  /**
   * Refresh the schema info cached in the driver.
   *
   * @returns {Bluebird<void>}
   * @private
   */
  _refreshSchema() {
    return this.connector.$doGremlinQuery('schema.describe();').get('0').then(describeR => {
      this._schemaInfo = DseUtils.parseSchemaInfo(describeR);
    });
  }

  /**
   * Add definitions in the gremlin session and/or perform additional checks.
   *
   * @returns {Bluebird<void>}
   */
  $customInitGremlinSession() {
    const q = `inject(
      autostart: graph.schema().config().option('graph.tx_autostart').get()
    )`;
    return this.connector.$doGremlinQuery(q).get('0').then(r => {
      if (r.autostart !== true) {
        return Errors.business(
          'source_action_needed',
          '"graph.tx_autostart" must be enabled to use Linkurious with DSE.',
          true
        );
      }

      return this._refreshSchema();
    });
  }

  // TODO #930 wait for a response from Datastax and find a fix for this
  // /**
  //  * Resolve if alternative IDs are not in use or if there exist indices for the alternative IDs.
  //  *
  //  * @returns {Bluebird<void>}
  //  */
  // $checkAlternativeIdsIndices() {
  //   const altNodeId = this.getGraphOption('alternativeNodeId');
  //
  //   // DSE only supports alternativeNodeIds
  //   // g.E().has('name', 'David') can't use any index
  //
  //   return Promise.resolve().then(() => {
  //     if (Utils.hasValue(altNodeId) && !this._schemaInfo.indexedProperties.includes(altNodeId)) {
  //       return Errors.business('source_action_needed',
  //         `No secondary or materialized index found in DSE for node property "${altNodeId}". ` +
  //         'All vertex labels requires a specific index for this property.',
  //         true);
  //     }
  //   });
  // }
  //
  // /**
  //  * Create a node.
  //  *
  //  * @param {LkNodeAttributes} newNode
  //  * @returns {Bluebird<LkNode>}
  //  */
  // $createNode(newNode) {
  //   if (
  //     Utils.hasValue(this.getGraphOption('alternativeNodeId')) &&
  //     !_.keys(this._schemaInfo.nodeSchema).includes(newNode.categories[0])
  //   ) {
  //     // We would break alternative ids because the new category
  //     // wouldn't have the alternative node id indexed.
  //     return Errors.business('invalid_parameter',
  //       `Can't create a node with a new category "${newNode.categories[0]}" in DSE ` +
  //       'when alternative ids are enabled.',
  //       true);
  //   }
  //
  //   return super.$createNode(newNode);
  // }
}

module.exports = DseDriver;
