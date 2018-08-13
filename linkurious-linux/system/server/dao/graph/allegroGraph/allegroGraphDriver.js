/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-08-21.
 */
'use strict';

// external libs
const through = require('through');

// our libs
const JsonStream = require('../../../../lib/JsonStream');

// services
const LKE = require('../../../services');
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();
const Log = LKE.getLogger(__filename);

// locals
const SparqlDriver = require('../sparqlDriver');

class AllegroGraphDriver extends SparqlDriver {

  constructor(connector, graphOptions, connectorData) {
    super(connector, graphOptions, connectorData, {
      supportBlankNodeLabels: false,
      implementGetStatements: true
    });

    // we use the LkRequest object directly to get the node and edge stream
    this.request = connector.$request;
  }

  /**
   * Create the spogi index in AllegroGraph if it doesn't exit and optimize all the indices.
   * The optimization step will put statements with the same subject next to each other.
   * Only creating the index is not enough. This behaviour, anyway, is undocumented.
   *
   * @returns {Bluebird<void>}
   * @private
   */
  _createSpogiAndOptimize() {
    return this.request.get('/indices').then(indicesR => {
      if (indicesR.statusCode !== 200) {
        return Errors.technical(
          'critical',
          'Could not list indices (HTTP ' + indicesR.statusCode + '): ' + indicesR.body,
          true
        );
      }

      // SPOGI index already present
      if (indicesR.body.indexOf('spogi') >= 0) {
        return;
      }

      // we need to create SPOGI index
      return this.request.put('/indices/spogi').then(spogiR => {
        if (spogiR.statusCode === 204) { return; }

        return Errors.technical(
          'critical',
          'Could not create the SPOGI index (HTTP ' + spogiR.statusCode + '): ' + spogiR.body,
          true
        );
      });
    }).then(() => {
      // optimize indices
      return this.request.post('/indices/optimize?wait=true').then(optimizeR => {
        if (optimizeR.statusCode === 204) { return; }

        return Errors.technical(
          'critical',
          'Could not optimize indices (HTTP ' + optimizeR.statusCode + '): ' + optimizeR.body,
          true
        );
      });
    }).return();
  }

  /**
   * Get a stream of all nodes.
   *
   * @param {object} options
   * @param {number} [options.chunkSize]
   * @param {number} [options.offset=0]
   * @returns {Bluebird<Readable<LkNode>>}
   */
  $getNodeStream(options) {
    let offset = options.offset || 0;
    Utils.check.integer('offset', offset, 0);

    const self = this;

    return this._createSpogiAndOptimize().then(() => {
      let lastNodeIdSeen;
      let lastNodeStatements = [];

      return this.request.getStream('/statements', 'get', undefined, [200]).then(stream => {
        stream.resume();
        return Utils.safePipe(
          stream,
          JsonStream.parse(['*']),
          through(
            function(data) { // data is a rdf statement (string[])
              if (data[0] === lastNodeIdSeen) {
                lastNodeStatements.push(data);
              } else {
                if (Utils.hasValue(lastNodeIdSeen)) {
                  if (offset === 0) {
                    try {
                      const node = self._utils.parseStatementsForNode(lastNodeStatements);
                      if (node !== null) {
                        this.queue(node);
                      }
                    } catch(e) {
                      Log.warn('While indexing: ', e.message);
                    }
                  } else {
                    --offset;
                  }
                }
                lastNodeIdSeen = data[0];
                lastNodeStatements = [data];
              }

            },
            function() {
              if (Utils.hasValue(lastNodeIdSeen)) {
                try {
                  const node = self._utils.parseStatementsForNode(lastNodeStatements);
                  if (node !== null) {
                    this.queue(node);
                  }
                } catch(e) {
                  Log.warn('While indexing: ', e.message);
                }
              }
              this.queue(null);
            }
          ));
      });
    });
  }

  /**
   * Get a stream of all edges.
   *
   * @param {object} options
   * @param {number} [options.chunkSize]
   * @param {number} [options.offset=0]
   * @returns {Bluebird<Readable<LkEdge>>}
   */
  $getEdgeStream(options) {
    let offset = options.offset || 0;
    Utils.check.integer('offset', offset, 0);

    const self = this;

    return this.request.getStream('/statements', 'get', undefined, [200]).then(stream => {
      stream.resume();
      return Utils.safePipe(stream,
        JsonStream.parse(['*']),
        through(
          function(data) { // data is a rdf statement (string[])
            if (self._utils.statementIsAnEdge(data)) {
              if (offset === 0) {
                try {
                  this.queue(self._utils.parseStatementForEdge(data));
                } catch(e) {
                  Log.warn('While indexing: ', e.message);
                }
              } else {
                --offset;
              }
            }
          },
          function() {
            this.queue(null);
          }
        )
      );
    });
  }
}

module.exports = AllegroGraphDriver;
