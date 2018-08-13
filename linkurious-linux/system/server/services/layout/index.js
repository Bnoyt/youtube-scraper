/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-03-03.
 */
'use strict';

// ext libs
const _ = require('lodash');

// our libs
const ClusterManager = require('../../../lib/cluster-manager');

// services
const LKE = require('../index');
const Log = LKE.getLogger(__filename);
const Config = LKE.getConfig();

class LayoutCluster {
  constructor() {
    // get layout
    let forceLink;
    try {
      // try to get the minified/fast version
      forceLink = require('./forceLink.min');
    } catch(e) {
      Log.warn('Falling back to slow layout (minified version not found)');
      // fallback to development version
      forceLink = require('./forceLink');
    }

    this.cluster = new ClusterManager([
      new ClusterManager.Task('layout', ['nodes', 'edges', 'config'], p => {
        forceLink(p.nodes, p.edges, p.config);
        return p.nodes;
      })
    ], {
      info: message => Log.info(message),
      warn: message => Log.warn(message),
      error: message => Log.error(message)
    });
  }

  /**
   * Start the cluster
   */
  startCluster() {
    let workers = Config.get('advanced.layoutWorkers', 0);
    // don't use worked in starter edition
    if (!LKE.isEnterprise()) { workers = 0; }
    this.cluster.startMaster(workers);
  }

  startWorker() {
    this.cluster.startWorker();
  }

  /**
   * @returns {boolean}
   */
  get isMaster() {
    return this.cluster.isMaster;
  }

  /**
   * @param {object} visualization
   * @param {object[]} visualization.nodes
   * @param {string|number} visualization.nodes.id
   * @param {object[]} visualization.edges
   * @param {string|number} visualization.edges.source
   * @param {string|number} visualization.edges.target
   * @returns {Promise.<object>} The original graph object given as parameter, with layout applied.
   */
  layout(visualization) {
    const params = {
      nodes: _.map(visualization.nodes, node => {
        node = _.pick(node, ['id']);
        node.degree = _.reduce(
          visualization.edges,
          (degree, e) => degree + (e.source === node.id ? 1 : 0) + (e.target === node.id ? 1 : 0),
          0
        );
        return node;
      }),
      edges: _.map(visualization.edges, edge => _.pick(edge, ['source', 'target'])),
      config: {
        randomize: 'globally',
        defaultSize: 10,
        scalingRatio: 25
      }
    };
    //console.log(JSON.stringify(params));
    return this.cluster.startJob('layout', params).then(nodes => {
      for (let i = 0, l = nodes.length; i < l; ++i) {
        visualization.nodes[i].nodelink.x = nodes[i].x;
        visualization.nodes[i].nodelink.y = nodes[i].y;
      }
    }).return(visualization);
  }
}

module.exports = new LayoutCluster();
