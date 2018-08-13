/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-12-17.
 */
'use strict';

// ext libs
const Promise = require('bluebird');

// services
const LKE = require('../../../index');
const Utils = LKE.getUtils();
const Data = LKE.getData();
const Access = LKE.getAccess();
const VisualizationDAO = LKE.getVisualizationDAO();

// locals
const api = require('../../api');

module.exports = function(app) {

  // source reconnect

  /**
   * @api {post} /api/admin/source/:dataSourceIndex/connect Connect a disconnected data-source
   * @apiName ReconnectSource
   * @apiGroup DataSources
   * @apiVersion 1.0.0
   * @apiPermission action:admin.connect
   * @apiDescription Connect a disconnected data-source
   * @apiParam {string} dataSourceIndex config-index of a data-source
   */
  app.post('/api/admin/source/:dataSourceIndex/connect', api.respond(req => {
    return Access.hasAction(req, 'admin.connect').then(() => {
      // we don't wait for the data-source to connect
      Data.resolveSource(
        Utils.tryParsePosInt(req.param('dataSourceIndex'), 'dataSourceIndex')
      ).connect(true);
    });
  }));

  // reset sandboxes

  /**
   * @api {post} /api/admin/source/:dataSource/resetDefaults Reset settings for new visualizations
   * @apiName ResetSourceStyles
   * @apiGroup DataSources
   * @apiVersion 1.0.0
   * @apiPermission action:admin.resetDefaults
   * @apiDescription Reset design and/or captions of all sandboxes of the given data-source to configuration-file values.
   * If `design` is true, set the `design.palette` and `design.styles` to current `palette` and `defaultStyles` configuration values.
   * If `captions` is true, set `nodeFields.captions` and `edgeFields.captions` to current `defaultCaptions.nodes` and `defaultCaptions.edges` configuration values.
   *
   * @apiParam {string} dataSource Key of a data-source
   * @apiParam {boolean} design Whether to reset default design to configuration-file values.
   * @apiParam {boolean} captions Whether to reset default captions to configuration-file values.
   */
  app.post('/api/admin/source/:dataSource/resetDefaults', api.respond(req => {
    return Access.hasAction(req, 'admin.resetDefaults', req.param('dataSource')).then(() => {
      return VisualizationDAO.resetSandboxes(
        req.param('dataSource'),
        {
          design: Utils.parseBoolean(req.param('design')),
          captions: Utils.parseBoolean(req.param('captions'))
        }
      );
    });
  }, 204));

  // all the other APIs other than connect needs "admin.config"
  app.all('/api/admin/source*', api.proxy(req => {
    return Access.hasAction(req, 'admin.config');
  }));

  // source index-mapping

  /**
   * @api {get} /api/admin/source/:dataSource/hidden/nodeProperties Get hidden node-properties
   * @apiName getHiddenNodeProperties
   * @apiGroup DataSources
   * @apiVersion 1.0.0
   * @apiPermission action:admin.config
   * @apiDescription Get the list of node-properties hidden for the given data-source.
   * @apiParam {string} dataSource Key of a dataSource
   */
  app.get('/api/admin/source/:dataSource/hidden/nodeProperties', api.respond(req => {
    return Promise.resolve(Data.resolveSource(req.param('dataSource')).getHiddenNodeProperties());
  }));

  /**
   * @api {get} /api/admin/source/:dataSource/hidden/edgeProperties Get hidden edge-properties
   * @apiName getHiddenEdgeProperties
   * @apiGroup DataSources
   * @apiVersion 1.0.0
   * @apiPermission action:admin.config
   * @apiDescription Get the list of edge-properties hidden for the given data-source.
   * @apiParam {string} dataSource Key of a dataSource
   */
  app.get('/api/admin/source/:dataSource/hidden/edgeProperties', api.respond(req => {
    return Promise.resolve(Data.resolveSource(req.param('dataSource')).getHiddenEdgeProperties());
  }));

  /**
   * @api {get} /api/admin/source/:dataSource/noIndex/nodeProperties Get non-indexed node-properties
   * @apiName getNoIndexNodeProperties
   * @apiGroup DataSources
   * @apiVersion 1.0.0
   * @apiPermission action:admin.config
   * @apiDescription Get the list of node-properties that are not indexed for the given data-source.
   * @apiParam {string} dataSource Key of a dataSource
   */
  app.get('/api/admin/source/:dataSource/noIndex/nodeProperties', api.respond(req => {
    return Promise.resolve(Data.resolveSource(req.param('dataSource')).getNoIndexNodeProperties());
  }));

  /**
   * @api {get} /api/admin/source/:dataSource/noIndex/edgeProperties Get non-indexed edge-properties
   * @apiName getNoIndexEdgeProperties
   * @apiGroup DataSources
   * @apiVersion 1.0.0
   * @apiPermission action:admin.config
   * @apiDescription Get the list of edge-properties that re not indexed for the given data-source.
   * @apiParam {string} dataSource Key of a dataSource
   */
  app.get('/api/admin/source/:dataSource/noIndex/edgeProperties', api.respond(req => {
    return Promise.resolve(Data.resolveSource(req.param('dataSource')).getNoIndexEdgeProperties());
  }));

  /**
   * @api {put} /api/admin/source/:dataSource/hidden/nodeProperties Set hidden node-properties
   * @apiName setHiddenNodeProperties
   * @apiGroup DataSources
   * @apiVersion 1.0.0
   * @apiPermission action:admin.config
   * @apiDescription Set the list of node-properties that are hidden for the given data-source.
   * @apiParam {string} dataSource Key of a dataSource
   * @apiParam {string[]} properties List of property names
   */
  app.put('/api/admin/source/:dataSource/hidden/nodeProperties', api.respond(req => {
    return Data.resolveSource(req.param('dataSource')).setHiddenNodeProperties(
      req.param('properties', [])
    );
  }));

  /**
   * @api {put} /api/admin/source/:dataSource/hidden/edgeProperties Set hidden edge-properties
   * @apiName setHiddenEdgeProperties
   * @apiGroup DataSources
   * @apiVersion 1.0.0
   * @apiPermission action:admin.config
   * @apiDescription Set the list of edge-properties that are hidden for the given data-source.
   * @apiParam {string} dataSource Key of a dataSource
   * @apiParam {string[]} properties List of property names
   */
  app.put('/api/admin/source/:dataSource/hidden/edgeProperties', api.respond(req => {
    return Data.resolveSource(req.param('dataSource')).setHiddenEdgeProperties(
      req.param('properties', [])
    );
  }));

  /**
   * @api {put} /api/admin/source/:dataSource/noIndex/nodeProperties Set non-indexed node-properties
   * @apiName setNoIndexNodeProperties
   * @apiGroup DataSources
   * @apiVersion 1.0.0
   * @apiPermission action:admin.config
   * @apiDescription Set the list of node-properties that are not indexed for the given data-source.
   * @apiParam {string} dataSource Key of a dataSource
   * @apiParam {string[]} properties List of property names
   */
  app.put('/api/admin/source/:dataSource/noIndex/nodeProperties', api.respond(req => {
    return Data.resolveSource(req.param('dataSource')).setNoIndexNodeProperties(
      req.param('properties', [])
    );
  }));

  /**
   * @api {put} /api/admin/source/:dataSource/noIndex/edgeProperties Set non-indexed edge-properties
   * @apiName setNoIndexEdgeProperties
   * @apiGroup DataSources
   * @apiVersion 1.0.0
   * @apiPermission action:admin.config
   * @apiDescription Set the list of edge-properties that are not indexed for the given data-source.
   * @apiParam {string} dataSource Key of a dataSource
   * @apiParam {string[]} properties List of property names
   */
  app.put('/api/admin/source/:dataSource/noIndex/edgeProperties', api.respond(req => {
    return Data.resolveSource(req.param('dataSource')).setNoIndexEdgeProperties(
      req.param('properties', [])
    );
  }));

  /**
   * @api {get} /api/admin/sources Get all data-sources information
   * @apiName getAllSourceInfo
   * @apiGroup DataSources
   * @apiVersion 1.0.0
   * @apiPermission action:admin.config
   * @apiDescription Get information for all data-source, including data-sources that do not exist online.
   *
   * @apiSuccess {object[]} sources Data-source information.
   * @apiSuccess {string} sources.lastSeen Last time this data-source was seen online (ISO-8601 date)
   * @apiSuccess {string} sources.indexedDate Last time this data-source was indexed (ISO-8601 date)
   * @apiSuccess {string} sources.key Key of the data-source (when is has been connected before, `null` otherwise)
   * @apiSuccess {string} sources.host Host of the data-source
   * @apiSuccess {string} sources.port Port of the data-source
   * @apiSuccess {string} sources.storeId Unique store identifier of the graph database (when it has been connected before, `null` otherwise)
   * @apiSuccess {string} sources.state State code if the data-source (`"ready"` , `"offline"` ...).
   * @apiSuccess {number} sources.visualizationCount Number of visualizations that exist for this data-source
   * @apiSuccess {number} sources.configIndex The index of the data-source's config (if the config still exists, `null` otherwise)
   */
  app.get('/api/admin/sources', api.respond(() => {
    return Data.getAllSources();
  }));

  /**
   * @api {post} /api/admin/sources/config Create a new data-source configuration
   * @apiName createSourceConfig
   * @apiGroup DataSources
   * @apiVersion 1.0.0
   * @apiPermission action:admin.config
   * @apiDescription Create a new data-source configuration (contains a graph database configuration and an index configuration).
   *
   * @apiParam {string} name Name of the data-source.
   * @apiParam {object} graphDb The configuration options of the graph database.
   * @apiParam {string} graphDb.vendor The vendor of the graph database (`"neo4j"`, `"allegroGraph"`...).
   * @apiParam {object} index The configuration options of the full-text index.
   * @apiParam {object} index.vendor The vendor of the full-text index (`"elasticSearch"`).
   * @apiParam {string} index.host Host of the full-text index server.
   * @apiParam {number} index.port Port of the full-text index server.
   * @apiParam {boolean} index.forceReindex Whether to re-index this graph database at each start of Linkurious.
   * @apiParam {boolean} index.dynamicMapping Whether to enable automatic property-types detection for enhanced search.
   */
  app.post('/api/admin/sources/config', api.respond(req => {
    return Data.createSource({
      name: req.param('name'),
      graphdb: req.param('graphDb') || req.param('graphdb'),
      index: req.param('index')
    });
  }, 201));

  /**
   * @api {delete} /api/admin/sources/config/:configIndex Delete a data-source configuration
   * @apiName deleteSourceConfig
   * @apiGroup DataSources
   * @apiVersion 1.0.0
   * @apiPermission action:admin.config
   * @apiDescription Delete a data-source configuration that has currently no connected data-source.
   *
   * @apiParam {number} configIndex Index of a data-source configuration
   */
  app.delete('/api/admin/sources/config/:configIndex', api.respond(req => {
    return Data.deleteSourceConfig(
      Utils.tryParsePosInt(req.param('configIndex'), 'configIndex', false)
    );
  }, 204));

  /**
   * @api {delete} /api/admin/sources/data/:sourceKey Delete all data-source data
   * @apiName deleteSourceData
   * @apiGroup DataSources
   * @apiVersion 1.0.0
   * @apiPermission action:admin.config
   * @apiDescription Delete all data of data-source (visualizations, access rights, widgets, full-text indexes).
   *                 Optionally merge visualizations and widgets into another data-source instead of deleting them.
   *                 Warning: when merging into another data-source, visualizations may break if node and edge IDs are not the same in to target data-source.
   *
   * @apiParam {string} sourceKey Key of a disconnected data-source which data must be deleted.
   * @apiParam {string} merge_into Key of a data-source to merge visualizations and widgets into.
   *
   * @apiSuccess {boolean} migrated True if the affected items have been migrated to another data-source, false if they have been deleted.
   * @apiSuccess {object} affected Affected object counts.
   * @apiSuccess {number} affected.visualizations Number of migrated/deleted visualizations (with their widgets).
   * @apiSuccess {number} affected.folders Number of migrated/deleted visualization folders.
   * @apiSuccess {number} affected.alerts Number of migrated/deleted alerts.
   * @apiSuccess {number} affected.matches Number of migrated/deleted matches.
   */
  app.delete('/api/admin/sources/data/:sourceKey', api.respond(req => {
    const sourceKey = req.param('sourceKey');
    Utils.checkSourceKey(sourceKey);

    const mergeInto = req.param('merge_into');
    Utils.checkSourceKey(mergeInto, 'mergeInto', true);

    return Data.deleteSourceData(sourceKey, mergeInto);
  }, 200));
};
