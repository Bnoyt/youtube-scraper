/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-07.
 */
'use strict';

// external libs
const Promise = require('bluebird');

// services
const LKE = require('../../services');
const Errors = LKE.getErrors();

// locals
const GremlinConnector = require('./gremlinConnector');

class DseConnector extends GremlinConnector {

  /**
   * @param {any} graphOptions   GraphDAO options
   * @param {any} [indexOptions] IndexDAO options (only if the type of the DAO is 'Index')
   * @constructor
   */
  constructor(graphOptions, indexOptions) {
    super(graphOptions, indexOptions, {
      manageTransactions: true,
      httpPathGremlinServer: '/gremlin'
    });
  }

  /**
   * Add definitions in the gremlin session and/or perform additional checks.
   *
   * @returns {Bluebird<void>}
   */
  $initGremlinSession() {
    const sName = JSON.stringify(this.getGraphOption('graphName'));
    const gremlinQuery = `
      builder = system.graph(${sName});
      if (builder.exists()) {
        return 'already_exist';
      } else if (${!!this.getGraphOption('create')}) {
        builder.create();
        return 'created';
      } else {
        return 'cant_create';
      }
    `;

    return this.$doGremlinQuery(gremlinQuery).get('0').then(state => {
      if (state === 'cant_create') {
        return Errors.technical(
          'graph_unreachable',
          `The graph database ${sName} does not exist and auto-creation is disabled` +
          ' ("create" option is false).',
          true
        );
      }

      this.$setAliases({
        g: `${this.getGraphOption('graphName')}.g`,
        graph: `${this.getGraphOption('graphName')}.graph`
      });

      if (state === 'created') {
        // We always allow_scan on created graphs (mostly because of testing)
        // Plus, we don't really mind, since the graph was created by us
        return this.$doGremlinQuery(`
          graph.schema().config().option('graph.allow_scan').set('true');
          graph.schema().config().option('graph.tx_autostart').set('true');
        `);
      }
    });
  }

  /**
   * Get the SemVer of the remote server.
   *
   * @returns {Bluebird<string>} resolved with the SemVer version of the remote server
   */
  $getVersion() {
    const q = 'inject(gremlin:Gremlin.version())'; // The gremlin version, not the DSE version
    return this.$doGremlinQuery(q).get('0').get('gremlin').then(version => version.split('-')[0]);
  }

  /**
   * Detect the current store ID.
   *
   * A store ID is the name of the current database (if the graph server is multi-tenant)
   * otherwise the vendor name.
   *
   * @returns {Bluebird<string>}
   */
  $getStoreId() {
    return Promise.resolve(this.getGraphOption('graphName'));
  }
}

module.exports = DseConnector;
