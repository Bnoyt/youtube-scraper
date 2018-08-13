/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-11-05.
 *
 * File: index.js
 * Description :
 */
'use strict';

// ext libs
const Promise = require('bluebird');
const _uniq = require('lodash/uniq');
const _uniqBy = require('lodash/uniqBy');
const _find = require('lodash/find');
const _pick = require('lodash/pick');
const _remove = require('lodash/remove');
const _ = require('lodash');

// services
const LKE = require('../index');
const Log = LKE.getLogger(__filename);
const DbModels = LKE.getSqlDb().models;
const Errors = LKE.getErrors();
const Config = LKE.getConfig();
const GraphSchemaDAO = LKE.getGraphSchemaDAO();
const Utils = LKE.getUtils();

// locals
const DataSource = require('./dataSource');

const DUMMY_VALUE_COUNT = 100000;

/**
 * @callback sourceAction
 * @param {DataSource} source
 * @returns {Promise}
 */

/**
 *
 * @class
 */
class DataService {
  constructor() {
    /**
     * @type {DataSource[]}
     */
    this.sources = [];
    this.loadSources();

    this.updateNodeMutex = Utils.semaphore(1);
    this.updateEdgeMutex = Utils.semaphore(1);

    /**
     * @type {string|null} key of the currently indexed data-source (or null)
     */
    this._indexedSource = null;

    /**
     * DataSources indexed by sourceKey
     * @type {object<DataSource>}
     * @private
     */
    this._sourceByKey = {};
  }

  loadSources() {
    const sources = [];
    Config.get('dataSources').forEach((config, sourceId) => {
      sources.push(new DataSource(sourceId, this));
    });
    if (sources.length === 0) {
      throw Errors.business('dataSource_unavailable', 'no data-source defined in configuration.');
    }
    this.sources = sources;
  }

  /**
   *
   * @param {string|number} sourceKeyOrConfigIndex
   * @param {boolean} willWrite Whether the source will be written to.
   * @param {function(source: DataSource): Bluebird} action
   * @returns {Bluebird<void>} the promise returned by `action`.
   */
  withSource(sourceKeyOrConfigIndex, willWrite, action) {
    const source = this.resolveSource(sourceKeyOrConfigIndex);
    if (willWrite && source.isReadOnly()) {
      return Errors.access('write_forbidden', 'The data-source is in read-only mode.', true);
    }
    return Promise.resolve().then(() => action(source)).catch(Errors.LkError, err => {
      if (err.key === 'dataSource_unavailable' && source.isConnected()) {
        Log.warn('Source failure: ' + JSON.stringify(err));
        source.indexConnected = false;
        source.graphConnected = false;
        source.connect(true);
      }
      return Promise.reject(err);
    });
  }

  /**
   * Resolve a data-source. To resolve a source that could be offline, resolve by configIndex.
   *
   * @param {string|number} sourceKeyOrConfigIndex a key or a config index of a data-source
   * @returns {DataSource} a connected DataSource
   * @throws {LkError} if the data-source was not found or resolving by key and source is offline.
   */
  resolveSource(sourceKeyOrConfigIndex) {
    if (Utils.noValue(sourceKeyOrConfigIndex)) {
      throw Errors.technical(
        'dataSource_unavailable', 'Neither sourceKey nor configIndex provided.');
    }
    let i, source;

    // resolve by configIndex (id):
    if (typeof sourceKeyOrConfigIndex === 'number') {
      for (i = 0; i < this.sources.length; ++i) {
        source = this.sources[i];
        if (source.sourceId === sourceKeyOrConfigIndex && !source.destroyed) {
          return source;
        }
      }
      throw Errors.business(
        'dataSource_unavailable', 'data-source #' + sourceKeyOrConfigIndex + ' was not found'
      );
    }

    // resolve by sourceKey:
    if (typeof sourceKeyOrConfigIndex !== 'string') {
      throw Errors.technical('bug', '"sourceKey" must be a string');
    }

    // from cache
    source = this._sourceByKey[sourceKeyOrConfigIndex];
    if (source) {
      if (!source.isConnected()) {
        throw Errors.business('dataSource_unavailable',
          'data-source "' + sourceKeyOrConfigIndex + '" is not connected'
        );
      }
      return source;
    }

    // slow version
    for (i = 0; i < this.sources.length; ++i) {
      if (!this.sources[i].isConnected()) {
        continue;
      }
      if (this.sources[i].getSourceKey() === sourceKeyOrConfigIndex) {
        source = this.sources[i];
        // add to cache
        this._sourceByKey[sourceKeyOrConfigIndex] = source;
        return source;
      }
    }

    throw Errors.business('dataSource_unavailable',
      'data-source "' + sourceKeyOrConfigIndex + '" was not found or is not connected.'
    );
  }

  /**
   * Get the current state of all configured data-sources
   *
   * @returns {Bluebird<Array<{name: string, configIndex: number, connected: boolean, key?: string, state: string, reason: string, error?: string, settings: object, features: DataSourceFeatures}>>}
   */
  getSourceStates() {
    return Promise.resolve(this.sources.map(s => {
      const state = s.getState();
      const response = {
        name: s.getDisplayName(),
        configIndex: s.sourceId,
        connected: s.isConnected(),
        key: s.isConnected() ? s.getSourceKey() : null,
        state: state.code,
        reason: state.reason,
        error: state.error,
        settings: {
          readOnly: !!s.isReadOnly()
        },
        features: s.features
      };

      if (Utils.hasValue(s.graph)) {
        response.settings.alternativeIds = {
          node: s.graph.options.alternativeNodeId,
          edge: s.graph.options.alternativeEdgeId
        };
        response.settings.latitudeProperty = s.graph.options.latitudeProperty;
        response.settings.longitudeProperty = s.graph.options.longitudeProperty;
        response.settings.specialProperties = s.graph.specialProperties;
      }

      if (Utils.hasValue(s.index)) {
        response.settings.skipEdgeIndexation = !!s.index.options.skipEdgeIndexation;
      }

      return response;
    }));
  }

  /**
   * @typedef {object} SourceInfo
   * @property {string} lastSeen Last seen date (ISO 8601)
   * @property {string} indexedDate Last indexation date (ISO 8601)
   * @property {string|null} key Key of the data-source (when is has been connected before)
   * @property {string} host Host of the data-source
   * @property {string} port Port of the data-source
   * @property {string|null} storeId Unique store identifier of the graph database (when it has been connected before)
   * @property {string} state State code if the data-source.
   * @property {number} visualizationCount Number of visualizations that exist for this data-source
   * @property {number|null} configIndex The index of the data-source's config (if the config still exists)
   */

  /**
   * Get the information for all sources, including:
   * - disconnected sources that have been seen in the past (source states).
   * - disconnected sources that have never been seen (source configs).
   * - connected sources (source configs with states).
   *
   * @returns {Promise.<SourceInfo[]>}
   */
  getAllSources() {
    const vizDAO = LKE.getVisualizationDAO();

    // copy the configured sources array
    const configuredSources = this.sources.slice(0);

    // fetch seen sources
    return DbModels.dataSourceState.findAll({where: {}}).map(seenSource => {
      seenSource = _pick(seenSource.get(), [
        'lastSeen', 'info', 'name', 'indexedDate', 'key'
      ]);

      // if the seen source matches a configured source, merge them
      const matches = _remove(configuredSources, s => s.getSourceKey(true) === seenSource.key);
      if (matches.length) {
        seenSource.state = matches[0].getState().code;
        seenSource.configIndex = matches[0].sourceId;
      } else {
        seenSource.state = 'offline';
        seenSource.configIndex = null;
      }

      // host + port
      const hostPortStore = seenSource.info.split(':');
      seenSource.host = hostPortStore[0];
      seenSource.port = hostPortStore[1];
      seenSource.storeId = hostPortStore.slice(2).join(':');
      seenSource.info = undefined;

      return vizDAO.getVisualizationCount(seenSource.key, true).then(c => {
        seenSource.visualizationCount = c;
        return seenSource;
      });
    }, {concurrency: 1}).then(seenSources => {

      // contains only sources that don't have a sourceKey (offline, connecting)
      const noKeySources = configuredSources.map(dataSource => {
        const hostPort = Utils.extractHostPort(dataSource.config.graphdb.url);
        return {
          lastSeen: null,
          host: hostPort.host,
          port: hostPort.port,
          storeId: null,
          name: dataSource.config.name || null,
          indexedDate: null,
          key: null,
          state: dataSource.getState().code,
          visualizationCount: 0,
          configIndex: dataSource.sourceId
        };
      });

      return seenSources.concat(noKeySources);
    });
  }

  /**
   * Create a new data-source
   *
   * @param {object} sourceConfig
   * @param {string} [sourceConfig.name] Name of the data-source.
   * @param {object} sourceConfig.graphdb The configuration options of the graph database.
   * @param {string} sourceConfig.graphdb.vendor The vendor of the graph database (`"neo4j"`, `"allegroGraph"`...).
   * @param {object} sourceConfig.index The configuration options of the full-text index.
   * @param {object} sourceConfig.index.vendor The vendor of the full-text index (`"elasticSearch"`).
   * @param {string} sourceConfig.index.host Host of the full-text index server.
   * @param {number} sourceConfig.index.port Port of the full-text index server.
   * @param {boolean} sourceConfig.index.forceReindex Whether to re-index this graph database at each start of Linkurious.
   * @param {boolean} sourceConfig.index.dynamicMapping Whether to enable automatic property-types detection for enhanced search.
   * @returns {Promise.<number>} the created source's configuration index
   */
  createSource(sourceConfig) {
    Utils.check.properties('config', sourceConfig, {
      graphdb: {
        required: true,
        properties: {
          vendor: {required: true, type: 'string'}
        },
        policy: 'inclusive'
      },
      index: {
        required: true,
        properties: {
          vendor: {required: true, type: 'string'}
        },
        policy: 'inclusive'
      },
      name: {type: 'string'}
    });

    return Config.add('dataSources', sourceConfig).then(configCount => {
      const configIndex = configCount - 1;
      const source = new DataSource(configIndex, this);
      this.sources.push(source);

      // don't wait for the connection to succeed (don't return this promise)
      source.connect(true);

      return configIndex;
    });
  }

  /**
   * Delete a data-source config
   *
   * @param {number} configIndex
   * @returns {Promise}
   */
  deleteSourceConfig(configIndex) {
    /**
     * @type DataSource
     */
    const source = _find(this.sources, {sourceId: configIndex});

    if (!source) {
      return Errors.business(
        'not_found', `Data-source with configuration index ${configIndex} was not found.`, true
      );
    }

    if (source.getState().code !== 'offline') {
      return Errors.business(
        'illegal_source_state', 'Data-source must be offline to be deleted.', true
      );
    }

    // the server cannot run with 0 sources
    if (this.sources.length === 1) {
      return Errors.business(
        'not_implemented', 'Cannot delete the only configured data-source.', true
      );
    }

    // prevent the source from doing anything
    source.destroy();

    // remove the source from the source array
    _remove(this.sources, {sourceId: configIndex});

    // remove the source from the configuration
    return Config.remove('dataSources', configIndex);
  }

  /**
   * Delete all data for a data-source.
   * - index data is deleted from ElasticSearch
   * - visualizations, access-rights and widgets get deleted
   * - optionally, visualizations and widgets get merged into
   *
   * @param {string} deletedSourceKey
   * @param {string} mergeTargetKey
   * @returns {Promise.<{migrated: boolean, affected: {visualizations: number, folders: number, alerts: number, matches: number}}>}
   */
  deleteSourceData(deletedSourceKey, mergeTargetKey) {
    /**
     * @type DataSource
     */
    const source = _find(this.sources, s => s.getSourceKey(true) === deletedSourceKey);

    const deleteConfigPromise = source
      ? this.deleteSourceConfig(source.sourceId)
      : Promise.resolve();

    // 1) delete existing configuration, if any (checks that the source is disconnected)
    let deletedSourceState;
    return deleteConfigPromise.then(() => {

      // 2) get sourceStates (deleted and mergeTarget)
      const sourceKeys = [deletedSourceKey];
      if (mergeTargetKey !== undefined) {
        sourceKeys.push(mergeTargetKey);
      }
      return DbModels.dataSourceState.findAll({where: {key: sourceKeys}});
    }).then(sourceStates => {

      // 3) check that the deleted sourceState exists
      deletedSourceState = _find(sourceStates, {key: deletedSourceKey});
      if (!deletedSourceState) {
        return Errors.business(
          'not_found', `Cannot delete data-source #${deletedSourceKey} (not found).`, true
        );
      }

      // 4) if merging, check that the mergeTarget sourceState exists
      const mergeTargetSourceState = _find(sourceStates, {key: mergeTargetKey});
      if (mergeTargetKey !== undefined) {
        if (mergeTargetSourceState === undefined) {
          return Errors.business(
            'not_found', `Cannot merge data into data-source #${deletedSourceKey} (not found).`,
            true
          );
        }
        if (mergeTargetKey === deletedSourceState) {
          return Errors.business(
            'invalid_parameter',
            `Cannot merge data data-source #${deletedSourceKey} into itself.`,
            true
          );
        }
      }

      // 5) merge or delete (widgets, visualizations, visualizationFolders)
      let mergeOrDeletePromise = Promise.resolve();
      const affected = {visualizations: 0, folders: 0};
      let merging = false;
      const where = {sourceKey: deletedSourceKey};

      if (mergeTargetKey !== undefined) {
        // 5.a) merge
        merging = true;

        // update parameters
        const values = {sourceKey: mergeTargetKey};
        const options = {
          // update only items from the deleted source
          where: where,
          // update only the sourceKey attribute
          fields: ['sourceKey'],
          // don't validate
          validate: false,
          // don't update the "updatedAt" field
          silent: true
        };

        const vizOptions = Utils.clone(options);
        vizOptions.where.sandbox = false;
        mergeOrDeletePromise = DbModels.visualization.update(values, vizOptions).spread(count => {
          affected.visualizations = count;
          return DbModels.visualizationFolder.update(values, options);
        }).spread(count => {
          affected.folders = count;

          // we only want to migrate non-builtin groups
          const updateNonBuiltinGroupOptions = Utils.clone(options);
          updateNonBuiltinGroupOptions.where.builtin = false;
          return DbModels.group.update(values, updateNonBuiltinGroupOptions);
        }).spread(count => {
          affected.groups = count;

          // and we want to delete the builtin ones
          const deleteBuiltinGroupWhere = Utils.clone(where);
          deleteBuiltinGroupWhere.builtin = true;
          return DbModels.group.destroy({where: deleteBuiltinGroupWhere});
        }).then(() => {
          return DbModels.alert.update(values, options);
        }).spread(count => {
          affected.alerts = count;
          return DbModels.match.update(values, options);
        }).spread(count => {
          affected.matches = count;
        });

      } else {
        // 5.b) delete
        merging = false;

        mergeOrDeletePromise = DbModels.visualization.destroy({where: where}).then(count => {
          affected.visualizations = count;
          return DbModels.visualizationFolder.destroy({where: where});
        }).then(count => {
          affected.folders = count;
          return DbModels.group.destroy({where: where});
        }).then(count => {
          affected.groups = count;
          return DbModels.alert.destroy({where: where});
        }).then(count => {
          affected.alerts = count;
          return DbModels.match.destroy({where: where});
        }).then(count => {
          affected.matches = count;
        });
      }

      // 6) delete access-rights
      // We don't migrate access-rights because we don't want to mess up the access-rights of the
      // merge target.
      return mergeOrDeletePromise.then(() => {
        // delete original access-rights
        return DbModels.accessRight.destroy({where: where});
      }).then(() => {

        // 7) delete the original source-state
        return deletedSourceState.destroy();
      }).then(() => {

        // 8) return a nice and clean result
        return {migrated: merging, affected: affected};
      });
    });
  }

  // Concurrency edition version

  /**
   *
   * @param {LkNode[]} [nodes]
   * @param {LkEdge[]} [edges]
   * @param {string} sourceKey
   * @returns {Promise}
   */
  setItemVersions(nodes, edges, sourceKey) {
    return this.withSource(sourceKey, false, source => source.index.setVersions(nodes, edges));
  }

  /**
   * Add version numbers to nodes and/or edges
   *
   * @param {*} result the value to resolve the promise with
   * @param {LkNode[]} [nodes]
   * @param {LkEdge[]} [edges]
   * @param {string} sourceKey
   * @returns {Promise.<*>}
   * @private
   */
  _addVersions(result, nodes, edges, sourceKey) {
    if (!nodes) {
      nodes = [];
    }
    if (!edges) {
      edges = [];
    }

    if (nodes.length && nodes[0].edges) {
      // add nodes.edges to edges
      nodes.forEach(node => {
        edges = edges.concat(node.edges);
      });
    }

    return this.setItemVersions(nodes, edges, sourceKey).return(result);
  }

  // Shortest path
  /**
   * Gets all the shortest path between 2 nodes.
   *
   * @param {Number} startNodeId - Node Id that will serve as the starting point to compute the shortest path
   * @param {Number} endNodeId - Node Id that will serve as the ending point to compute the shortest path
   * @param {object} options
   * @param {Number} [options.maxDepth] Maximum depth of the shortest path
   * @param {boolean} [options.withDigest=false] Whether to include the digest in the result.
   * @param {boolean} [options.withDegree=false] Whether to include the degree in the result.
   * @param {boolean} [options.withVersion=false] whether to include the version number in the result
   * @param {String} sourceKey - Key of the current data source
   * @returns {Promise.<LkNode[]>}
   */
  getAllShortestPaths(startNodeId, endNodeId, options, sourceKey) {
    return this.withSource(sourceKey, false, source => {
      return source.graph.getAllShortestPaths(startNodeId, endNodeId, options).then(paths => {

        if (options.withVersion) {
          return Promise.resolve(paths).map(pathNodes => {
            return this._addVersions(null, pathNodes, null, sourceKey);
          }).then(() => paths);
        }

        return paths;
      });
    });
  }

  // Graph nodes

  /**
   * @param {string} sourceKey key of a data-source
   * @param {boolean} [approximate] Whether to allow an approximated value
   * @returns {Promise.<Number>}
   */
  getNodeCount(sourceKey, approximate) {
    return this.withSource(sourceKey, false, source => {
      const stateCode = source.getState().code;

      // if we are indexing, the count is cached, use it
      if (stateCode === 'indexing' && source.nodeCountCache !== undefined) {
        return source.nodeCountCache;
      }

      // if the indexation is done (state=ready) and the index can count, use the index
      if (stateCode === 'ready' && source.index.features.canCount) {
        return source.index.getSize('node');
      }

      // if the graph can count, use the graph
      if (source.graph.features.canCount) {
        return source.graph.getNodeCount(
          (approximate || stateCode === 'indexing') && // approximate if indexation is ongoing
          !LKE.isTestMode() // don't approximate in test mode
        );
      }

      // TODO #948 remove dummy value
      return Promise.resolve(DUMMY_VALUE_COUNT);
    });
  }

  /**
   * Get a node from the database
   *
   * @param {object} options
   * @param {number} options.id ID of the node
   * @param {boolean} [options.withEdges=false] whether to include adjacent edges.
   * @param {boolean} [options.withDigest=false] Whether to include the digest in the result.
   * @param {boolean} [options.withDegree=false] Whether to include the degree in the result.
   * @param {boolean} [options.withVersion=false] whether to include the version number in the result
   * @param {string} options.sourceKey key fo a data-source
   * @returns {Promise.<LkNode>}
   */
  getNode(options) {
    return this.withSource(options.sourceKey, false, source => {
      return source.graph.getNode(options).then(node => {
        if (!options.withVersion) {
          return node;
        }
        return this._addVersions(node, [node], null, options.sourceKey);
      });
    });
  }

  /**
   * Get nodes by IDs
   *
   * @param {object} options
   * @param {string[]|number[]} options.ids Node IDs.
   * @param {string} options.sourceKey key of a data-source.
   * @param {boolean} [options.withDigest=false] Whether to include the digest in the result.
   * @param {boolean} [options.withDegree=false] Whether to include the degree in the result.
   * @param {boolean} [options.withVersion=false] whether to include node versions.
   * @param {string} [options.alternativeID] Node property used to math nodes instead of ID.
   * @param {boolean} [options.ignoreMissing=false] Don't check missing edges
   * @param {string} [options.edges="none"] "none"  : No edges at all.
   *                                         "strict": Only edges between result nodes
   *                                         "all"   : All edges with source or target in the result nodes.
   * @returns {Promise.<LkNode[]>}
   */
  getNodesByID(options) {
    return this.withSource(options.sourceKey, false, source => {
      return source.graph.getNodesByID(options).then(nodes => {
        if (!options.withVersion) {
          return nodes;
        }
        return this._addVersions(nodes, nodes, null, options.sourceKey);
      });
    });
  }

  /**
   * Read a list of edges
   *
   * @param {object} options options
   * @param {string} options.sourceKey Key of a data-source
   * @param {string[]|number[]} options.ids List of ids to read.
   * @param {boolean} [options.withVersion=false] Whether to include edge versions.
   * @param {string} [options.alternativeId] If defined, the edge property used to match nodes (instead of ID).
   * @param {boolean} [options.ignoreMissing=false] Don't check missing edges
   * @returns {Promise<LkEdge[]>}
   */
  getEdgesByID(options) {
    return this.withSource(options.sourceKey, false, source => {
      return source.graph.getEdgesByID(options).then(edges => {
        if (!options.withVersion) {
          return edges;
        }
        return this._addVersions(edges, null, edges, options.sourceKey);
      });
    });
  }

  /**
   * Get nodes by edge IDs
   *
   * @param {object} options
   * @param {string[]|number[]} options.edgeIds
   * @param {boolean} [options.withVersion=false]
   * @param {string} options.sourceKey
   * @returns {Promise.<LkNode[]>}
   */
  getNodesByEdgesID(options) {
    return this.withSource(options.sourceKey, false, source => {
      return source.graph.getNodesByEdgesID(options.edgeIds, options).then(nodes => {
        if (!options.withVersion) {
          return nodes;
        }
        return this._addVersions(nodes, nodes, null, options.sourceKey);
      });
    });
  }

  /**
   * Retrieves the Adjacent nodes in the database.
   *
   * @param {number[]|string[]} nodeIds IDs of the nodes to retrieve the neighbours from
   * @param {Object} options
   * @param {number[]|string[]} options.ignoredNodeIds IDs of nodes to skip in results
   * @param {number[]|string[]} options.visibleNodeIds IDs of visible nodes (will return secondary edges to them)
   * @param {string} [options.nodeCategory] a node category to filter on (only this category in results)
   *                                        '[no_category]' for nodes with  no categories.
   * @param {string} [options.edgeType] an edge category to filter on (only this type in results)
   * @param {number} [options.limit] maximum number of nodes in result
   * @param {string} [options.limitType] 'id', 'lowestDegree' or 'highestDegree' to sort neighbors before limiting
   * @param {boolean} [options.withDigest=false] Whether to include the digest in the result.
   * @param {boolean} [options.withDegree=false] Whether to include the degree in the result.
   * @param {boolean} [options.withVersion] include item versions in result
   * @param {string} sourceKey key of a data-source
   * @returns {Promise.<LkNode[]>}
   */
  getAdjacentNodes(nodeIds, options, sourceKey) {
    return this.withSource(sourceKey, false, source => {
      return source.graph.getAdjacentNodes(nodeIds, options).then(nodes => {
        if (!options.withVersion) {
          return nodes;
        }
        return this._addVersions(nodes, nodes, null, sourceKey);
      });
    });
  }

  /**
   * Get one or many nodes' neighborhood digest
   *
   * @param {string[]} ids node IDs
   * @param {string} sourceKey key of a data-source
   * @param {object} options
   * @param {boolean} [options.withDigest=false] Whether to include the digest in the result.
   * @param {boolean} [options.withDegree=false] Whether to include the degree in the result.
   * @returns {Bluebird<LkNodeStatistics>}
   */
  getStatistics(ids, sourceKey, options) {
    return this.withSource(sourceKey, false, source => {
      source.graph.checkNodeIds('ids', ids, 1);

      if (ids.length === 1) {
        return source.graph.getStatistics(ids[0], options);
      }

      const result = {};
      return Promise.map(ids, id => {
        return source.graph.isSuperNode(id);
      }).then(areAuperNodes => {
        if (areAuperNodes.includes(true)) {
          return Errors.business('invalid_parameter', 'You can\'t get aggregated statistics ' +
            'of a subset of nodes containing one or more supernodes.', true);
        }

        if (options.withDigest) {
          return source.graph.getAdjacencyDigest(ids).then(digest => {
            result.digest = digest;
          });
        }
      }).then(() => {
        if (options.withDegree) {
          return source.graph.getNodeDegree(ids, {
            readableCategories: options.readableCategories,
            readableTypes: options.readableTypes}
          ).then(degree => {
            result.degree = degree;
          });
        }
      }).return(result);
    });
  }

  /**
   * @param {object} newNode
   * @param {object} newNode.data
   * @param {string[]} newNode.categories
   * @param {string} sourceKey
   * @returns {Promise.<LkNode>}
   */
  createNode(newNode, sourceKey) {
    return this.withSource(sourceKey, true, source => {
      let createdNode;
      return source.graph.createNode(newNode).then(_createdNode => {
        // keep created node for index update
        createdNode = _createdNode;

        // update schema (will warn but not reject in case of failure)
        return Utils.neverReject(source.graphSchemaBuilder.nodeCreation(createdNode));
      }).then(() => {

        // update index (done last be cause this is the most likely to fail)
        return source.index.upsertEntry('node', source.filterNodeProperties(createdNode, true));
      }).then(version => {

        // set updated version in created node
        createdNode.version = version;
        return createdNode;
      });
    });
  }

  /**
   * Update a node
   *
   * @param {number} nodeId
   * @param {Object} nodeUpdate
   * @param {Object} nodeUpdate.data updated properties
   * @param {Object} nodeUpdate.deletedProperties properties to delete
   * @param {Object} nodeUpdate.version incremental node version
   * @param {string} sourceKey key of a data-source
   * @returns {Promise.<LkNode>}
   */
  updateNode(nodeId, nodeUpdate, sourceKey) {
    return this.withSource(sourceKey, true, source => {
      let currentNode, newNode;

      return this.updateNodeMutex.acquire().then(() => {

        // 1) get the node (check if it exists)
        return this.getNode({id: nodeId, withVersion: true, sourceKey: sourceKey});
      }).then(_node => {
        currentNode = _node;

        // 2) check any version conflict
        const serverVersion = currentNode.version;
        const clientVersion = Utils.tryParsePosInt(nodeUpdate.version, 'version');

        if (source.features.versions && serverVersion && serverVersion !== clientVersion) {
          return Errors.business('edit_conflict',
            `Node edit conflict. (client version: ${
              clientVersion}, server version: ${serverVersion})`,
            true
          );
        }
      }).then(() => {

        // 3) update the node in the graph
        return source.graph.updateNode(nodeId, nodeUpdate);
      }).then(_newNode => {
        newNode = _newNode;

        // 5) update the graph schema
        return Utils.neverReject(source.graphSchemaBuilder.nodeUpdate(currentNode, newNode));
      }).then(() => {

        // 4) update the node in the index (done last be cause this is the most likely to fail)
        newNode.version = nodeUpdate.version;
        return source.index.upsertEntry('node', source.filterNodeProperties(newNode, true));
      }).then(version => {
        newNode.version = version;

        return newNode;
      }).finally(() => {
        this.updateNodeMutex.release();
      });
    });
  }

  /**
   * Delete a node by ID
   *
   * @param {string} nodeId
   * @param {string} sourceKey
   * @returns {Promise}
   */
  deleteNode(nodeId, sourceKey) {
    return this.withSource(sourceKey, true, source => {
      let nodeToDelete;
      return source.graph.getNode({id: nodeId, withEdges: true}).then(nodeWithEdges => {
        nodeToDelete = nodeWithEdges;
        return Promise.map(nodeWithEdges.edges, edge => {
          // TODO isn't this redundant?
          return this.deleteEdge(edge.id, sourceKey).catch(err => {
            /*
             * In case of concurrent node deletion,
             * an edge attached to this node may
             * already have been deleted.
             * We just ignore this error in this case.
             */
            if (err.key !== 'edge_not_found') {
              return Promise.reject(err);
            }
          });
        });
      }).then(() => source.graph.deleteNode(nodeId))
        .then(() => source.index.deleteEntry(nodeId, 'node', true))
        .then(() => Utils.neverReject(source.graphSchemaBuilder.nodeDeletion(nodeToDelete)))
        .return(undefined);
    });
  }

  /**
   * Get a subgraph based on a raw query.
   *
   * The dialect must be supported by the underlying database of the source identified by `sourceKey`.
   * By default the dialect is the first dialect among the available dialects for the data-source.
   *
   * @param {object}  options
   * @param {string}  options.sourceKey     The key of a data-source
   * @param {string}  options.query         The graph query
   * @param {string}  [options.dialect]     Supported graph query dialect
   * @param {boolean} [options.canWrite]    Whether the query is allowed to alter the data
   * @param {number}  [options.limit]       Maximum number of matched subgraphs (before the result is grouped)
   * @param {number}  [options.timeout]     Query maximum execution time (in milliseconds)
   * @param {boolean} [options.withDigest]  Whether to include an adjacency digest in the result
   * @param {boolean} [options.withDegree]  Whether to include the degree in the result
   * @param {boolean} [options.withVersion] Whether to return nodes/edges with their version number
   * @returns {Bluebird<LkNode[]>}
   */
  rawQuery(options) {
    Utils.check.exist('options', options);
    let timeout;

    return this.withSource(options.sourceKey, false, source => {
      // We don't know in advance if the script contains a write statement.
      // All we can do is disable write (canWrite=false) and let the Graph DAO enforce it
      options.canWrite = options.canWrite && !source.isReadOnly();

      const maxLimit = Config.get('advanced.searchAddAllThreshold');

      // set the default value for limit and timeout
      const rawQueryOptions = _.defaults(options, {limit: maxLimit});
      Utils.check.integer('options.limit', rawQueryOptions.limit, 1, maxLimit);

      const maxTimeout = Config.get('advanced.rawQueryTimeout');
      timeout = options.timeout || maxTimeout;
      Utils.check.integer('options.timeout', timeout, 1, maxTimeout);

      return source.graph.rawQuery(rawQueryOptions);
    }).then(readableStream => Utils.mergeReadable(readableStream, timeout)).then(merged => {
      if (merged.timeout) {
        Log.warn(`Raw Query "${options.query}" timed out after ${timeout} ms.`);
      }

      // merge + deduplicate nodes
      const nodes = new Map();
      merged.result.forEach(r => {
        r.nodes.forEach(n => {
          const node = nodes.get(n.id);
          if (node) {
            // if the node was already seen, append edges
            node.edges = node.edges.concat(n.edges);
          } else {
            nodes.set(n.id, n);
          }
        });
      });
      // deduplicate edges on each node
      return Array.from(nodes.values()).map(n => {
        n.edges = _uniqBy(n.edges, 'id');
        return n;
      });
    }).then(nodes => {
      if (options.withVersion) {
        return this._addVersions(nodes, nodes, null, options.sourceKey);
      }
      return nodes;
    });
  }

  /**
   * Get an array of populated matches based on a raw query.
   *
   * The dialect must be supported by the underlying database of the source identified by `sourceKey`.
   * By default the dialect is the first dialect among the available dialects for the data-source.
   *
   * @param {object}   options
   * @param {string}   options.sourceKey           The key of a data-source
   * @param {string}   [options.dialect]           Supported graph query dialect
   * @param {string}   options.query               The graph query
   * @param {object[]} [options.columns]           Columns among the returned values of the query to return as scalar values
   * @param {string}   options.columns.type        Type of the column ("number", "string")
   * @param {string}   options.columns.columnName  Name of the column in the query
   * @param {string}   options.columns.columnTitle Name of the column for the UI
   * @param {number}   [options.limit]             Maximum number of matched subgraphs
   * @param {number}   [options.timeout]           Query maximum execution time (in milliseconds)
   * @param {boolean}  [options.withDigest]        Whether to include an adjacency digest in the result
   * @param {boolean}  [options.withDegree]        Whether to include the degree in the result
   * @param {boolean}  [options.withVersion]       Whether to return nodes/edges with their version number
   * @returns {Bluebird<Array<{nodes: LkNode[], columns: Array<string | number>}>>}
   */
  alertPreviewQuery(options) {
    Utils.check.exist('options', options);
    let timeout;

    return this.withSource(options.sourceKey, false, source => {
      const maxLimit = Config.get('alerts.maxMatchesLimit');

      // set the default value for limit and timeout
      const rawQueryOptions = _.defaults(options, {limit: maxLimit});
      Utils.check.integer('options.limit', rawQueryOptions.limit, 1, maxLimit);

      const maxTimeout = Config.get('alerts.maxRuntimeLimit');
      timeout = options.timeout || maxTimeout;
      Utils.check.integer('options.timeout', timeout, 1, maxTimeout);

      return source.graph.rawQuery(rawQueryOptions);
    }).then(readableStream => Utils.mergeReadable(readableStream, timeout)).then(mergedStream => {
      if (mergedStream.timeout) {
        Log.warn(`Query "${options.query}" timedout after ${timeout} ms.`);
      }

      const matchesToCreate = [];

      for (const match of mergedStream.result) {
        const matchAttributes = {
          nodes: match.nodes,
          columns: []
        };

        if (Utils.hasValue(options.columns)) {
          options.columns.forEach(column => {
            const scalarValue = match.properties[column.columnName];

            // we apply the same rule as in createMatchesInBulk
            if (column.type === 'number' && typeof scalarValue === 'number' ||
              column.type === 'string' && Utils.isNEString(scalarValue)) {
              matchAttributes.columns.push(scalarValue);
            } else {
              // else we silently ignore that the scalar value is undefined or of an incorrect type
              matchAttributes.columns.push(null);
            }
          });
        }

        matchesToCreate.push(matchAttributes);
      }

      return matchesToCreate;
    }).map(match => {
      if (options.withVersion) {
        return this._addVersions(match, match.nodes, null, options.sourceKey);
      }

      return match;
    });
  }

  /**
   * Get a stream of subgraphs based on a raw query.
   *
   * The dialect must be supported by the underlying database of the source identified by `sourceKey`.
   * By default the dialect is the first dialect among the available dialects for the data-source.
   *
   * @param {object} options
   * @param {string} options.sourceKey The key of a data-source
   * @param {string} [options.dialect] Supported graph query dialect
   * @param {string} options.query     The graph query
   * @param {number} [options.limit]   Maximum number of matched subgraphs
   * @returns {Bluebird<Readable<QueryMatch>>}
   */
  alertQuery(options) {
    Utils.check.exist('options', options);
    return this.withSource(options.sourceKey, false, source => {
      const maxLimit = Config.get('alerts.maxMatchesLimit');

      // set the default value for limit
      let alertQueryOptions = _.defaults(options, {limit: maxLimit});
      Utils.check.integer('options.limit', alertQueryOptions.limit, 1, maxLimit);

      // set populated to false, we don't need the data to create matches
      alertQueryOptions = _.merge(alertQueryOptions, {populated: false});
      return source.graph.rawQuery(alertQueryOptions);
    });
  }

  // Graph edges

  /**
   * @param {string} sourceKey key of a data-source
   * @param {boolean} [approximate] Whether to allow approximated values
   * @returns {Promise.<Number>}
   */
  getEdgeCount(sourceKey, approximate) {
    return this.withSource(sourceKey, false, source => {
      const stateCode = source.getState().code;

      // if we are indexing, the count is cached, use it
      if (stateCode === 'indexing' && source.edgeCountCache !== undefined) {
        return source.edgeCountCache;
      }

      // if the indexation is done (state=ready) and the index can count, use the index
      if (stateCode === 'ready' && source.index.features.canCount) {
        return source.index.getSize('edge');
      }

      // if the graph can count, use the graph
      if (source.graph.features.canCount) {
        return source.graph.getEdgeCount(
          (approximate || stateCode === 'indexing') && // approximate if indexation is ongoing
          !LKE.isTestMode() // don't approximate in test mode
        );
      }

      return Promise.resolve(DUMMY_VALUE_COUNT);
    });
  }

  /**
   * @param {Object} options (adjacent/source/target are EXCLUSIVE)
   * @param {Number} [options.adjacent] node id (for in AND out edges)
   * @param {Number} [options.source] node id (for out edges ONLY)
   * @param {Number} [options.target] node id (for in edges ONLY)
   * @param {String} [options.type] filter on only this type of edge
   * @param {Number} [options.skip] for pagination
   * @param {Number} [options.limit] for pagination
   * @param {boolean} [options.withVersion=false] whether to include version number for egdes
   * @param {string} sourceKey ID of a data-source
   * @returns {Promise.<LkEdge[]>}
   */
  getAdjacentEdges(options, sourceKey) {
    return this.withSource(sourceKey, false, source => {
      return source.graph.getAdjacentEdges(options).then(edges => {
        if (options.withVersion) {
          return this._addVersions(edges, null, edges, sourceKey);
        }
        return edges;
      });
    });
  }

  /**
   * @param {object} options
   * @param {string|number} options.id ID of an edge
   * @param {boolean} [options.withVersion=false] whether to include the edge version in the result
   * @param {string} options.sourceKey key of a data-source
   * @param {string} [options.alternativeId] property to use instead of native ID
   * @returns {Promise.<LkEdge>}
   */
  getEdge(options) {
    return this.withSource(options.sourceKey, false, source => {
      return source.graph.getEdge(options).then(edge => {
        if (!options.withVersion) {
          return edge;
        }
        return this._addVersions(edge, null, [edge], options.sourceKey);
      });
    });
  }

  /**
   *
   * @param {LkEdge} edge An LkEdge without an ID
   * @param {number} edge.version Version of the updated edge (for conflict detection)
   * @param {string} sourceKey key of a data-source
   * @returns {Promise.<LkEdge>}
   */
  createEdge(edge, sourceKey) {
    return this.withSource(sourceKey, true, source => {
      let newEdge;
      return source.graph.createEdge(edge).then(_newEdge => {
        newEdge = _newEdge;
        return source.index.upsertEntry('edge', source.filterEdgeProperties(newEdge, true));
      }).then(version => {
        newEdge.version = version;
        return Utils.neverReject(source.graphSchemaBuilder.edgeCreation(newEdge));
      }).then(() => newEdge);
    });
  }

  /**
   *
   * @param {number|string} edgeId edge ID
   * @param {Object} edgeUpdate
   * @param {Object} edgeUpdate.data properties update
   * @param {string[]} edgeUpdate.deletedProperties deleted properties
   * @param {number} edgeUpdate.version
   * @param {string} sourceKey key of a data-source
   * @returns {Promise.<LkEdge>}
   */
  updateEdge(edgeId, edgeUpdate, sourceKey) {
    return this.withSource(sourceKey, true, source => {
      let currentEdge, newEdge;

      return this.updateEdgeMutex.acquire().then(() => {
        // 1) check if the edge exists
        return this.getEdge({id: edgeId, withVersion: true, sourceKey: sourceKey}).then(_edge => {
          currentEdge = _edge;
        });
      }).then(() => {
        // 2) check for version conflicts
        const serverVersion = currentEdge.version;
        const clientVersion = Utils.tryParsePosInt(edgeUpdate.version, 'version');

        if (source.features.versions && serverVersion && serverVersion !== clientVersion) {
          return Errors.business('edit_conflict',
            'Edge edit conflict. ' +
            '(client version: ' + clientVersion + ', server version: ' + serverVersion + ')',
            true
          );
        }
      }).then(() => {
        // 3) update the edge in the graph
        return source.graph.updateEdge(edgeId, edgeUpdate).then(_newEdge => {
          newEdge = _newEdge;
        });
      }).then(() => {
        // 4) update the edge in the index
        newEdge.version = edgeUpdate.version;
        return source.index.upsertEntry('edge', source.filterEdgeProperties(newEdge, true));
      }).then(version => {
        newEdge.version = version;

        // 5) update the schema
        return Utils.neverReject(source.graphSchemaBuilder.edgeUpdate(currentEdge, newEdge));
      }).then(() => newEdge).finally(
        () => this.updateEdgeMutex.release()
      );
    });
  }

  /**
   * @param {String} id edge id
   * @param {string} sourceKey key of a data-source
   * @returns {Promise}
   */
  deleteEdge(id, sourceKey) {
    return this.withSource(sourceKey, true, source => {
      let edgeToDelete;
      return source.graph.getEdge({id: id}).then(edge => {
        edgeToDelete = edge;
        return source.graph.deleteEdge(id);
      }).then(() => source.index.deleteEntry(id, 'edge', true))
        .then(() => Utils.neverReject(source.graphSchemaBuilder.edgeDeletion(edgeToDelete)))
        .return(undefined);
    });
  }

  // Search

  /**
   * `results` will be a string[] if `options.idOnly` is true.
   *
   * @param {String} type 'node' or 'edge'
   * @param {String} searchString
   * @param {LkSearchOptions} options
   * @param {string} sourceKey key of a data-source
   * @returns {Promise.<{
   *   type: string,
   *   totalHits: number | undefined,
   *   moreResults: boolean | undefined,
   *   results:Object[] | string[]
   * }>}
   */
  searchIndex(type, searchString, options, sourceKey) {
    Utils.check.values('type', type, ['node', 'edge']);

    if (Utils.hasValue(options.size) && options.size > Config.get('advanced.searchThreshold')) {
      return Errors.business(
        'invalid_parameter',
        'Illegal search option (size): "' + options.size + '" must be smaller than ' +
        'Configuration.advanced.searchThreshold',
        true
      );
    }

    return this.withSource(sourceKey, false, source => {
      return source.index.search(type, searchString, options).then(response => {
        // let the graph DAO parse node/edge IDs
        if (options.idOnly) {
          response.results = response.results.map(id => {
            if (type === 'node') {
              return source.graph.checkNodeId('id', id, true);
            } else {
              return source.graph.checkEdgeId('id', id, true);
            }
          });
        } else {
          response.results.forEach(result => {
            result.children.forEach(item => {
              item.id = response.type === 'node'
                ? source.graph.checkNodeId('id', item.id, true)
                : source.graph.checkEdgeId('id', item.id, true);
            });
          });
        }
        return response;
      });
    });
  }

  /**
   * Search full graph items.
   * - If type='node', searches for nodes and returns then (with all adjacent edges).
   * - If type='edge', searches for edge and returns them inside
   * Results includes nodes/edges versions.
   *
   * @param {string} type 'node' or 'edge'
   * @param {string} searchString the search string
   * @param {LkSearchOptions} searchOptions the search options
   * @param {string} sourceKey key of a data-source
   * @param {boolean} [strictAdjacency=false] whether to include only edges have both ends in the
   *                                          result nodes (if `type === "node"`).
   * @param {object} options Other options
   * @param {boolean} options.withDigest Whether to include the digest in the result.
   * @param {boolean} options.withDegree Whether to include the degree in the result.
   * @returns {Promise.<LkNode[]>} full LkNodes, including edges
   */
  searchFull(type, searchString, searchOptions, sourceKey, strictAdjacency, options) {
    searchOptions.idOnly = true;
    return this.searchIndex(type, searchString, searchOptions, sourceKey).then(r => {
      const ids = _uniq(r.results);

      if (type === 'node') {
        const edges = strictAdjacency ? 'strict' : 'all';
        return this.getNodesByID(_.merge(options,
          {ids: ids, sourceKey: sourceKey, edges: edges, withVersion: true}));
      } else {
        return this.getNodesByEdgesID(_.merge(options,
          {edgeIds: ids, sourceKey: sourceKey, withVersion: true}));
      }
    });
  }

  // Schema

  /**
   * Get a simple schema description before first indexation.
   *
   * @param {string} sourceKey key of a data-source
   * @returns {Promise.<{
   *   nodeCategories:string[],
   *   edgeTypes:string[],
   *   nodeProperties:string[],
   *   edgeProperties:string[]
   * }>}
   */
  getSimpleSchema(sourceKey) {
    return this.withSource(sourceKey, false, source => source.graph.getSimpleSchema());
  }

  /**
   * List all node-categories (by name) found by SchemaBuilder.
   * For sources that do not provide a schema, "not_implemented" errors are ignored and `[]` is returned.
   *
   * @param {string} sourceKey key of a data-source
   * @returns {Promise.<string[]>}
   */
  getSchemaNodeTypeNames(sourceKey) {
    return this.getSchemaNodeTypes({
      sourceKey: sourceKey, omitProperties: true, omitInferred: true
    }).map(type => type.name).catch(Utils.catchKey('not_implemented', []));
  }

  /**
   * Get edge-types (by name) from SchemaBuilder
   * For sources that do not provide a schema, "not_implemented" errors are ignored and `[]` is returned.
   *
   * @param {string} sourceKey key of a data-source
   * @returns {Promise.<string[]>}
   */
  getSchemaEdgeTypeNames(sourceKey) {
    return this.getSchemaEdgeTypes({
      sourceKey: sourceKey, omitProperties: true
    }).map(type => type.name).catch(Utils.catchKey('not_implemented', []));
  }

  /**
   * List all schema nodeTypes (includes property keys, counts and types).
   * Data from Schema (type+property list) and Index (property types).
   * Property types are: "string", "boolean", "long", "integer", "double", "float", "date".
   *
   * @param {Object} options options
   * @param {string} options.sourceKey key of a data-source
   * @param {boolean} [options.includeType=false] whether to include detected property types (from index)
   * @param {boolean} [options.omitInferred=false] whether to omit inferred node types
   * @param {boolean} [options.omitProperties=false] whether to omit properties
   *
   * @returns {Promise.<{
   *   name:string,
   *   count?:number,
   *   properties?:{key:string, count?:number, type?:string}[]
   * }[]>}
   */
  getSchemaNodeTypes(options) {
    return this.withSource(options.sourceKey, false, source => {

      return Promise.resolve().then(() => {
        return GraphSchemaDAO.getAllNodeTypes(
          options.sourceKey, options.omitInferred, options.omitProperties
        );
      }).then(nodeTypes => {
        // no property type to needed?
        if (options.omitProperties || !options.includeType) {
          return nodeTypes;
        }

        // populate type from index mapping
        return _populatePropertyTypes(source, 'node', nodeTypes);
      });
    });
  }

  /**
   * List all schema edgeType (includes property keys, counts and types)
   * Data from Schema (type+property list) and Index (property types).
   *
   * @param {Object} options options
   * @param {string} options.sourceKey key of a data-source
   * @param {boolean} [options.includeType=false] whether to include detected property types (from index)
   * @param {boolean} [options.omitProperties=false] whether to omit properties
   *
   * @returns {Promise.<{
   *   name:string,
   *   count?:number,
   *   properties:{key:string, count?:number, type?:string}[]
   * }[]>}
   */
  getSchemaEdgeTypes(options) {
    return this.withSource(options.sourceKey, false, source => {

      // todo: rethink when we do #918
      if (source.config.index.skipEdgeIndexation && source.graph.vendor === 'neo4j') {
        return this.getSimpleSchema(source.getSourceKey(true)).then(schema => {
          return schema.edgeTypes.map(type => ({
            name: type,
            count: 1,
            properties: []
          }));
        });
      }

      return Promise.resolve().then(() => {
        return GraphSchemaDAO.getAllEdgeTypes(options.sourceKey, options.omitProperties);
      }).then(edgeTypes => {
        // no property type to needed?
        if (options.omitProperties || !options.includeType) {
          return edgeTypes;
        }

        // populate type from index mapping
        return _populatePropertyTypes(source, 'edge', edgeTypes);
      });
    });
  }

  /**
   * List all schema NodeProperties.
   * Data from Schema (property list) and Index (property types).
   *
   * @param {Object} options options
   * @param {string} options.sourceKey key of a data-source
   * @param {boolean} [options.includeType=false] whether to include detected property types (from index)
   * @param {boolean} [options.omitNoIndex=false] whether to omit no-index properties
   *
   * @returns {Promise.<{key:string, count?:number, type?:string}[]>}
   */
  getSchemaNodeProperties(options) {
    // omitNoIndex is implemented in data proxy

    return this.withSource(options.sourceKey, false, source => {

      return Promise.resolve().then(() => {
        return GraphSchemaDAO.getAllNodeProperties(options.sourceKey);
      }).then(props => {
        // type not required
        if (!options.includeType) {
          return props;
        }

        // populate types using the index mapping
        return _populatePropertyTypes(source, 'node', [{properties: props}]).return(props);
      });
    });
  }

  /**
   * List all schema EdgeProperties.
   * Data from Schema (property list) and Index (property types).
   *
   * @param {Object} options options
   * @param {string} options.sourceKey key of a data-source
   * @param {boolean} [options.includeType=false] whether to include detected property types (from index)
   * @param {boolean} [options.omitNoIndex=false] whether to omit no-index properties
   *
   * @returns {Promise.<{key:string, count?:number, type?:string}[]>}
   */
  getSchemaEdgeProperties(options) {
    // omitNoIndex is implemented in data proxy

    return this.withSource(options.sourceKey, false, source => {

      return Promise.resolve().then(() => {
        return GraphSchemaDAO.getAllEdgeProperties(options.sourceKey);
      }).then(props => {
        // type not required
        if (!options.includeType) {
          return props;
        }

        // populate types using the index mapping
        return _populatePropertyTypes(source, 'edge', [{properties: props}]).return(props);
      });
    });
  }

  // Indexation

  /**
   * Connects to the graph database, connects to index
   *
   * @returns {Promise}
   */
  connectSources() {
    let connectedDataSources = 0;
    return Promise.each(this.sources, source => {
      return source.connect(true).then(() => {
        if (source.isConnected()) {
          connectedDataSources++;
        }
      });
    }).then(() => {
      LKE.getStateMachine().set(
        'DataService',
        'up',
        `${connectedDataSources}/${this.sources.length} data-sources connected.`
      );
    });
  }

  /**
   * @param {boolean} [isStartup=false] whether this is called from APP startup
   * @returns {Promise}
   */
  indexSources(isStartup) {
    return Promise.each(this.sources, source => {
      if (!source.isConnected()) {
        return Promise.resolve();
      }

      // skip index at startup if ((foreReindex != true) OR (indexMapping is not configured))
      if (isStartup && (source.needConfig() || source.config.index.forceReindex !== true)) {
        return Promise.resolve();
      }

      return this.indexSource(source.getSourceKey()).catch(error => {
        Log.error('Indexation of data-source #' + source.sourceId + ' failed.', error);
      });
    });
  }

  /**
   * SourceKey of currently indexed data-source
   *
   * @returns {null|string}
   */
  getIndexedSource() {
    return this._indexedSource;
  }

  /**
   * Start indexing a source
   *
   * @param {string} sourceKey
   * @returns {Promise} returned if the source can index
   */
  asyncIndexSource(sourceKey) {
    /** @type {DataSource} */
    const source = this.resolveSource(sourceKey);

    const indexedSource = this.getIndexedSource();
    if (indexedSource !== null) {
      if (indexedSource === sourceKey) {
        return Errors.business(
          'illegal_source_state',
          `Data-source #${source.sourceId} is already indexing.`,
          true
        );
      }
      return Errors.business(
        'illegal_source_state',
        `Cannot index data-source #${source.sourceId}: another data-source is indexing.`,
        true
      );
    }

    // note: we don't wait for the indexation to finish, we don't return this promise on purpose
    this.indexSource(sourceKey).catch(() => {
      // ignore the rejection in this non-returned promise
    });
  }

  /**
   * @param {string} sourceKey the key of a data-source
   * @returns {Promise}
   */
  indexSource(sourceKey) {
    // ensure that the source is connected
    const source = this.resolveSource(sourceKey);
    if (!source.isConnected()) {
      return Promise.resolve();
    }

    // if we are already indexing, don't go further
    if (LKE.getStateMachine().get('DataService').name === 'indexing') {
      return Promise.resolve();
    }
    LKE.getStateMachine().set('DataService', 'indexing');

    // set currently indexing source
    this._indexedSource = sourceKey;

    return source.indexSource().finally(() => {
      this._indexedSource = null;
      LKE.getStateMachine().set('DataService', 'up');
    }).catch(e => {
      Log.error('Indexation failed: ', e.stack ? e.stack : e);
      return Promise.reject(e);
    });
  }

  /**
   * Disconnect all data-sources
   */
  disconnectAll() {
    this.sources.forEach(source => source.disconnect());
  }
}

/**
 * Add type information to properties a nodeType or eEdgeType array based on information from
 * the index mapping.
 * Add a `"type"` field at schemaType.properties.type containing the property type, when available.
 * Property types are: "string", "boolean", "long", "integer", "double", "float", "date".
 *
 * @param {DataSource} source
 * @param {string} itemType "node" or "edge"
 * @param {Object[]} schemaTypes
 * @param {string} schemaTypes.name Name of the (node/edge) type
 * @param {number} schemaTypes.count number of instance of the type
 * @param {object[]} schemaTypes.properties Properties of the type
 * @param {string} schemaTypes.properties.key Name of the type property
 * @param {number} schemaTypes.properties.count Number of instances of the property for this type
 *
 * @returns {Promise.<Object[]>}
 * @private
 */
function _populatePropertyTypes(source, itemType, schemaTypes) {
  source.assertReady();
  return source.index.getPropertyTypes(itemType).then(mapping => {
    schemaTypes.forEach(type => {
      type.properties.forEach(property => {
        property.type = mapping[property.key];
      });
    });
  }).return(schemaTypes);
}

// /**
//  * @param {Stream} stream
//  * @param {string} eventName
//  * @param {function} handler
//  * @param {number} bufferSize
//  * @param {function} errHandler
//  * @constructor
//  */
// function Promise$stream(stream, eventName, handler, bufferSize, errHandler) {
//   if (bufferSize === undefined) { bufferSize = 1; }
//   var buffer = [];
//   handler = Promise.method(handler);
//
//   return new Promise((resolve, reject) => {
//     var chain = Promise.resolve();
//
//     const consumeBuffer = function() {
//       var s = Date.now();
//       console.log('before buffer consume');
//       return Promise.each(buffer, handler).then(() => {
//         console.log('after buffer consume (' + (Date.now() - s) + 'ms)');
//         buffer = [];
//       }, errHandler);
//     };
//
//     stream.on(eventName, item => {
//       buffer.push(item);
//
//       // buffer not full: keep on buffering
//       if (buffer.length < bufferSize) {
//         return;
//       }
//
//       // buffer full: pause/consume/resume
//       stream.pause();
//       chain = chain
//         .then(consumeBuffer, error => reject(error))
//         .then(() => stream.resume());
//
//     }).on('end', () => {
//       // stream end: consume partial buffer and resolve
//       chain.then(consumeBuffer).then(() => resolve());
//     }).on('error', error => {
//       // stream error: consume partial buffer and reject
//       chain.then(consumeBuffer).then(() => reject(error));
//     });
//   });
// }

module.exports = new DataService();
