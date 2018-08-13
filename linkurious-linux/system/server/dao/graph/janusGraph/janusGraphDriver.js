/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-01.
 */
'use strict';

// external libs
const Promise = require('bluebird');

// services
const LKE = require('../../../services');
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();

// locals
const GremlinDriver = require('../gremlinDriver');
const GremlinUtils = require('../../utils/gremlinUtils');

/**
 * To build a composite index in Janus (for Alternative IDs):
 * > name = mgmt.makePropertyKey('name').dataType(String.class).make()
 * > mgmt.buildIndex('byNameComposite', Vertex.class).addKey(name).buildCompositeIndex()
 *
 * > altEdgeID = mgmt.makePropertyKey('altEdgeID').dataType(String.class).make()
 * > mgmt.buildIndex('byAltEdgeIDComposite', Edge.class).addKey(altEdgeID).buildCompositeIndex()
 *
 * To build a mixed index in Janus (for Search):
 * > title = mgmt.makePropertyKey('title').dataType(String.class).make()
 * > mgmt.buildIndex('byTitleAndNameMixed', Vertex.class).addKey(title, Mapping.TEXTSTRING.asParameter()).addKey(name, Mapping.TEXTSTRING.asParameter()).buildMixedIndex("search")
 *
 * To commit these changes:
 * > mgmt.commit()
 */
class JanusGraphDriver extends GremlinDriver {

  /**
   * @param {Connector} connector     Connector used by the DAO
   * @param {any}       graphOptions  GraphDAO options
   * @param {any}       connectorData Data from the connector
   */
  constructor(connector, graphOptions, connectorData) {
    super(connector, graphOptions, connectorData, {
      manageTransactions: false
    });
  }

  /**
   * Check if the given edge ID is legal.
   *
   * Coding/decoding is used when the edge ID is not originally a string or a number.
   * An encoded edge ID is an ID for Linkurious (ID in input).
   * A decoded edge ID is an ID for the graph database (ID in output).
   *
   * @param {string} key
   * @param {string} id
   * @returns {any} The ID of the edge (encoded or not)
   * @throws {LkError} if the ID is not valid
   */
  $checkEdgeId(key, id) {
    Utils.check.string(key, id, true, true);
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
   * @param {boolean} [skipDecoding=false] Skip the decoding (return id)
   * @returns {any} the ID of the node (encoded or not)
   * @throws {LkError} if the ID is not valid
   */
  $checkNodeId(key, id, skipDecoding) {
    const parsedId = Utils.tryParsePosInt(id, key);
    if (skipDecoding) { return id; }
    return parsedId;
  }

  /**
   * Encode a raw Node ID in an ID usable in an LkNode.
   *
   * @param {any} rawId
   * @returns {string}
   */
  $encodeNodeId(rawId) {
    return '' + rawId;
  }

  /**
   * Encode a raw Edge ID in an ID usable in an LkEdge.
   *
   * @param {any} rawId
   * @returns {string}
   */
  $encodeEdgeId(rawId) {
    return rawId;
  }

  /**
   * List all edgeTypes, nodeCategories, edgeProperties, nodeProperties
   * that exist in the graph database.
   *
   * @returns {Bluebird<{nodeCategories: string[], edgeTypes: string[], nodeProperties: string[], edgeProperties: string[]}>}
   */
  $getSimpleSchema() {
    // We manually add the default label for node with no category to the schema
    const q = `
      r = [:];
      mgmt = graph.openManagement();

      r.edgeTypes = [];
      mgmt.getRelationTypes(EdgeLabel).each({ r.edgeTypes.add(it.name()); });

      r.nodeCategories = [];
      mgmt.getVertexLabels().each({ r.nodeCategories.add(it.name()); });
      
      if (!r.nodeCategories.contains('vertex')) {
        r.nodeCategories.add('vertex');
      }

      r.nodeProperties = [];
      mgmt.getRelationTypes(PropertyKey).each({ r.nodeProperties.add(it.name()); });

      r.edgeProperties = r.nodeProperties;

      [r];
    `;

    return this.connector.$doGremlinQuery(q).get('0');
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
   * Resolve if alternative IDs are not in use or if there exist indices for the alternative IDs.
   *
   * @returns {Bluebird<void>}
   */
  $checkAlternativeIdsIndices() {
    const altNodeId = this.getGraphOption('alternativeNodeId');
    const altEdgeId = this.getGraphOption('alternativeEdgeId');

    const indexExistsQuery = (type, alternativeId) => `
      mgmt = graph.openManagement();

      for (index in mgmt.getGraphIndexes(${type}.class)) {
        if (index.isCompositeIndex() &&
          index.getFieldKeys()[0] &&
          index.getFieldKeys()[0].name() == '${alternativeId}'
        ) {
          return true;
        }
      }

      return false;
    `;

    return Promise.resolve().then(() => {
      if (Utils.hasValue(altNodeId)) {
        return this.connector.$doGremlinQuery(indexExistsQuery('Vertex', altNodeId)).get('0')
          .then(r => {
            if (!r) {
              return Errors.business('source_action_needed',
                `No composite index found in JanusGraph for node property "${altNodeId}".`, true);
            }
          });
      }
    }).then(() => {
      if (Utils.hasValue(altEdgeId)) {
        return this.connector.$doGremlinQuery(indexExistsQuery('Edge', altEdgeId)).get('0')
          .then(r => {
            if (!r) {
              return Errors.business('source_action_needed',
                `No composite index found in JanusGraph for edge property "${altEdgeId}".`, true);
            }
          });
      }
    });
  }
}

module.exports = JanusGraphDriver;
