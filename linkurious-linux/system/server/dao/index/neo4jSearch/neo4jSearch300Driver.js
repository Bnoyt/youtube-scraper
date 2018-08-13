/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-10-09.
 */
'use strict';

// services
const LKE = require('../../../services');
const Errors = LKE.getErrors();

// locals
const Neo4jSearchDriver = require('./neo4jSearchDriver');

/**
 * In Neo4JSearch 3.0.0 the configuration keys were renamed, e.g:
 * "node_auto_indexing" got renamed to "dbms.auto_index.nodes.enabled"
 */
class Neo4jSearch300Driver extends Neo4jSearchDriver {

  /**
   * Called at the end of the connect phase for additional initializations.
   *
   * @returns {Bluebird<void>}
   */
  $onAfterConnect() {
    return this.connector.$queryJmx(
      'org.neo4j', 'instance=kernel#0,name=Configuration'
    ).then(configuration => {
      const autoIndexNode = configuration['dbms.auto_index.nodes.enabled'];
      const autoIndexEdges = configuration['dbms.auto_index.relationships.enabled'];

      if (autoIndexNode !== 'true') {
        return Errors.business(
          'source_action_needed',
          '"dbms.auto_index.nodes.enabled" must be set to "true".',
          true
        );
      }

      this.indexedNodePropertyKeys = this.$parseIndexedPropertyList(
        'dbms.auto_index.nodes.keys',
        configuration['dbms.auto_index.nodes.keys']
      );

      this.edgeIndexation = autoIndexEdges === 'true';

      if (this.edgeIndexation) {
        this.indexedEdgePropertyKeys = this.$parseIndexedPropertyList(
          'dbms.auto_index.relationships.keys',
          configuration['dbms.auto_index.relationships.keys']
        );
      } else {
        this.setIndexOption('skipEdgeIndexation', true);
      }
    });
  }
}

module.exports = Neo4jSearch300Driver;
