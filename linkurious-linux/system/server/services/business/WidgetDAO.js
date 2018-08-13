/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-08-14.
 */
'use strict';

// ext libs
const _ = require('lodash');
// services
const LKE = require('../index');
const DbModels = LKE.getSqlDb().models;
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const Config = LKE.getConfig();

// locals
const VisualizationShareDAO = require('./VisualizationShareDAO');

// consts
const LEAFLET_LAYERS_MAP = new Map();
_.forEach(Config.get('leaflet', []), leaflet => {
  LEAFLET_LAYERS_MAP.set(leaflet.name, leaflet);
});

const PUBLIC_FIELDS = [
  'title', 'key', 'content', 'url', 'userId', 'visualizationId', 'updatedAt', 'createdAt'
];

const WidgetDAO = module.exports = {};

/**
 * Resolve the node caption.
 *
 * Original code from clientV1.
 *
 * @param {LkNode} node
 * @param {object} nodeCaptions Node captions by category name
 * @param {boolean} nodeCaptions.enabled Whether the caption is enabled.
 * @param {boolean} nodeCaptions.displayName Whether the category name should be included in the caption.
 * @param {string[]} nodeCaptions.properties List of properties to include in the caption.
 * @returns {String} text to display for the corresponding node.
 */
function _getNodeCaption(node, nodeCaptions) {
  const propertyNames = {}, text = [];
  let i, j,
    categoryName,
    propertyValue,
    caption;

  if (node.categories.length) {
    // The node has one or multiple categories
    for (i = 0; i < node.categories.length; i++) {
      categoryName = node.categories[i];
      caption = nodeCaptions[categoryName];

      if (!caption || !caption.active) {
        continue;
      }

      if (caption.displayName) {
        text.push(categoryName);
      }

      for (j = 0; j < caption.properties.length; j++) {
        // prevent to display a property twice on nodes with multiple categories:
        if (!propertyNames[caption.properties[j]]) {
          propertyNames[caption.properties[j]] = true;
          propertyValue = node.data[caption.properties[j]];

          if (propertyValue !== undefined && ('' + propertyValue !== '')) {
            text.push(propertyValue);
          }
        }
      }
    }
  } else {
    // The node has no category
    caption = nodeCaptions['No category'];

    if (caption && caption.active) {
      for (j = 0; j < caption.properties.length; j++) {
        propertyValue = node.data[caption.properties[j]];

        if (propertyValue !== undefined && ('' + propertyValue !== '')) {
          text.push(propertyValue);
        }
      }
    }
  }

  return text.join(' - ');
}

/**
 * Resolve the edge caption.
 *
 * Original code from clientV1.
 *
 * @param {LkEdge} edge
 * @param {object} edgeCaptions captions by edge type
 * @param {object} edgeCaptions.enabled Whether the caption is enabled.
 * @param {boolean} edgeCaptions.displayName Whether the type name should be included in the caption.
 * @param {string[]} edgeCaptions.properties List of properties to include in the caption.
 * @returns {String} text to display for the corresponding edge.
 */
function _getEdgeCaption(edge, edgeCaptions) {
  const text = [];
  let j,
    typeName,
    propertyValue,
    caption;

  if (edge.type !== undefined) {
    typeName = edge.type;
    caption = edgeCaptions[typeName];

    if (caption && caption.active) {
      if (caption.displayName) {
        text.push(typeName);
      }

      for (j = 0; j < caption.properties.length; j++) {
        propertyValue = edge.data[caption.properties[j]];

        if (propertyValue !== undefined && ('' + propertyValue !== '')) {
          text.push(propertyValue);
        }
      }
    }
  }

  return text.join(' - ');
}

/**
 * Return true if:
 * - 1) data doesn't contain propertyName
 * - 2) data.propertyName is contained in allowedPropertyValues
 * - 3) data.propertyName is a non-empty subset of allowedPropertyValues
 * Otherwise return false
 *
 * @param {object} data
 * @param {string} propertyName
 * @param {string[]} allowedPropertyValues
 * @returns {boolean}
 * @private
 */
function _matchesFilter(data, propertyName, allowedPropertyValues) {
  return Utils.noValue(data[propertyName]) || // 1)
    allowedPropertyValues.indexOf(data[propertyName]) >= 0 || // 2)
    Array.isArray(data[propertyName]) && allowedPropertyValues.filter(p => {
      return data[propertyName].indexOf(p) !== -1;
    }).length > 0; // 3)
}

/**
 * Create or updates a widget from visualization.
 * Updating a widget preserves the existing key.
 *
 * @param {number} visualizationId id of the visualization used to create this widget
 * @param {Object<boolean>} [options] Toolbar options of the widget
 * @param {boolean} [options.layout=false]
 * @param {boolean} [options.search=false]
 * @param {boolean} [options.share=false]
 * @param {boolean} [options.fullscreen=false]
 * @param {boolean} [options.zoom=false]
 * @param {boolean} [options.legend=false]
 * @param {boolean} [options.geo=false]
 * @param {string} [options.password=null] Optional password to access the widget
 * @param {boolean} [forceOverwrite=false] replace the widget if it already exists
 * @param {WrappedUser} currentUser current connected user (will be owner of the widget)
 * @returns {Promise.<string>} the key of the created/updated widget
 */
WidgetDAO.createWidget = function(visualizationId, options, forceOverwrite, currentUser) {
  Utils.check.exist('currentUser', currentUser);
  Utils.check.posInt('visualizationId', visualizationId);
  Utils.check.properties('options', options, {
    search: {type: 'boolean'},
    share: {type: 'boolean'},
    layout: {type: 'boolean'},
    fullscreen: {type: 'boolean'},
    zoom: {type: 'boolean'},
    legend: {type: 'boolean'},
    geo: {type: 'boolean'},
    password: {check: 'nonEmpty'}
  });

  const uiOptions = _.omit(options, ['password']);
  let visualization;

  // check that the current user owns the visualization
  const VisualizationDAO = LKE.getVisualizationDAO();
  return VisualizationDAO.getById(visualizationId, true, currentUser).then(_visualization => {
    visualization = _visualization;
    return VisualizationShareDAO.getRight(visualization, currentUser.id);
  }).then(right => {
    if (right !== 'owner') {
      return Errors.access(
        'forbidden', 'You must be the owner of a visualization to create a widget for it.', true
      );
    }

    // check if a widget already exists for that visualization
    return _find('visualizationId', visualizationId, true, false);
  }).then(widget => {

    // if a widget already exists and override is not enabled, fail
    if (widget && !forceOverwrite) {
      return Errors.business('widget_exists', null, true);
    }
    const existingWidgetOptions = widget && widget.ui ? widget.ui : {};

    const widgetContent = {
      graph: {},
      palette: visualization.design.palette,
      styles: visualization.design.styles,
      mode: 'nodelink', // TODO #909/ClientV1 re-enable geo widgets
      mapLayers: _.map(visualization.geo.layers, layerName => LEAFLET_LAYERS_MAP.get(layerName)),
      ui: _.defaults(uiOptions, existingWidgetOptions, {
        search: false,
        share: false,
        fullscreen: false,
        layout: false,
        zoom: false,
        legend: false,
        geo: false
      })
    };

    // if widgetContent.mapLayers is empty because visualization.geo.layers is empty
    // we populate widgetContent.mapLayers with the first layer with overlay != true

    if (widgetContent.mapLayers.length === 0) {
      const leafletsNoOverlay = _.filter(Config.get('leaflet', []), leaflet => !leaflet.overlay);
      widgetContent.mapLayers = leafletsNoOverlay.length > 0 ? [leafletsNoOverlay[0]] : [];
    }

    // list visible node/edge properties (from visualization Tooltips) to filter content
    const PROP_PREFIX = 'data.properties.';
    let nodeProperties = visualization.nodeFields.fields.filter(f => f.active).map(f => f.name);
    let edgeProperties = visualization.edgeFields.fields.filter(f => f.active).map(f => f.name);
    if (visualization.design.styles) {
      const nodeStyleProperties = _.map(visualization.design.styles.nodes, style => {
        return style.by.startsWith(PROP_PREFIX) ? style.by.substr(PROP_PREFIX.length) : null;
      }).filter(p => p !== null);
      nodeProperties = _.uniq(nodeProperties.concat(nodeStyleProperties));

      const edgeStyleProperties = _.map(visualization.design.styles.edges, style => {
        return style.by.startsWith(PROP_PREFIX) ? style.by.substr(PROP_PREFIX.length) : null;
      }).filter(p => p !== null);
      edgeProperties = _.uniq(edgeProperties.concat(edgeStyleProperties));
    }

    // TODO #795 migrate widget to ogma, prune widget content to minimum, lat, lng, x, y are duplicate data of geo and nodelink
    // This behaviour is consistent to the widgets produced by the client

    // apply the filters to the graph
    let filteredNodes = visualization.nodes;
    let filteredEdges = visualization.edges;
    if (visualization.filters) {
      _.forEach(visualization.filters, filter => {
        if (Utils.isNEString(filter.key)) {
          // compute allowedValues (the keys of filter.options.values with value == true)
          if (filter.key.startsWith('node')) { // if false it's an edge filter
            if (filter.key === 'node.data.categories') {
              // filtering on node categories
              filteredNodes = _.filter(filteredNodes, node => {
                return _matchesFilter(node, 'categories', filter.values);
              });
            } else {
              // we uses 'node.data.properties.' as prefix that's why we remove the first 21 chars
              // filtering on node properties
              const propertyName = filter.key.slice(21);
              filteredNodes = _.filter(filteredNodes, node => {
                return _matchesFilter(node.data, propertyName, filter.values);
              });
            }
          } else if (filter.key.startsWith('edge')) {
            if (filter.key === 'edge.data.type') {
              // filtering on edge type
              filteredEdges = _.filter(filteredEdges, edge => {
                return _matchesFilter(edge, 'type', filter.values);
              });
            } else {
              // filtering on edge properties
              const propertyName = filter.key.slice(21);
              filteredEdges = _.filter(filteredEdges, edge => {
                return _matchesFilter(edge.data, propertyName, filter.values);
              });
            }
          } else if (filter.key === 'geo-coordinates') {
            // filtering on geo coordinates
            filteredNodes = _.filter(filteredNodes, node => Utils.hasValue(node.geo) &&
              Utils.hasValue(node.geo.latitude) && Utils.hasValue(node.geo.longitude)
            );
          }
        }
      });

      const inWidgetNodeIDs = _.map(filteredNodes, 'id');

      // now we have to clean up edges that were left without one among source or target
      filteredEdges = _.filter(filteredEdges, edge => {
        return inWidgetNodeIDs.indexOf(edge.source) >= 0 &&
          inWidgetNodeIDs.indexOf(edge.target) >= 0;
      });
    }

    widgetContent.graph.nodes = _.map(filteredNodes, node => {
      return {
        active: !!node.selected,
        data: {
          properties: _.pick(node.data, nodeProperties),
          categories: node.categories
        },
        geo: node.geo,
        lat: node.geo.latitude,
        lng: node.geo.longitude,
        id: node.id,
        nodelink: node.nodelink,
        label: _getNodeCaption(node, visualization.nodeFields.captions),
        x: node.nodelink.x,
        y: node.nodelink.y
      };
    });

    widgetContent.graph.edges = _.map(filteredEdges, edge => {
      return {
        active: !!edge.selected,
        data: {
          properties: _.pick(edge.data, edgeProperties),
          type: edge.type
        },
        id: edge.id,
        label: _getEdgeCaption(edge, visualization.edgeFields.captions),
        source: edge.source,
        target: edge.target
      };
    });

    const widgetUpdate = {
      title: visualization.title,
      content: widgetContent,
      visualizationId: visualizationId,
      userId: currentUser.id
    };

    // don't reset the password when the widget had a password but is wasn't updated
    if (options.password !== undefined) {
      widgetUpdate.password = options.password;
    }

    if (widget) {
      // the widget already exists, update it (we preserve the same key)
      return widget.update(widgetUpdate);

    } else {
      // the widget did not exist, create it
      widgetUpdate.key = Utils.randomHex8();
      return DbModels.widget.create(widgetUpdate);
    }

  }).then(widget => widget.key);
};

/**
 * Find a widget by visualization ID.
 * Does not reject if the widget is not found, just resolves to undefined.
 *
 * @param {number} visualizationId
 * @returns {Promise.<widget|undefined>}
 */
WidgetDAO.getByVisualizationId = function(visualizationId) {
  Utils.check.posInt('visualizationId', visualizationId);
  return _find('visualizationId', visualizationId, true, true);
};

/**
 * Find a widget by key.
 *
 * @param {string} key
 * @param {object} [credentials]
 * @param {string} [credentials.password]
 * @returns {Promise.<widget>}
 */
WidgetDAO.getByKey = function(key, credentials) {
  Utils.check.nonEmpty('key', key);
  if (Utils.hasValue(credentials)) {
    Utils.check.objectKeys('credentials', credentials, ['password']);
  }
  return _find('key', key, false, true, credentials);
};

/**
 * Destroy a widget by key
 *
 * @param {string} key a widget key
 * @param {WrappedUser} currentUser
 * @returns {Promise.<undefined>}
 */
WidgetDAO.deleteByKey = function(key, currentUser) {
  return _find('key', key, false, false).then(widget => {
    if (widget.userId !== currentUser.id) {
      return Errors.access('forbidden', 'You must be the owner of a widget to delete it.', true);
    }
    return widget.destroy();
  });
};

function checkCredentials(widgetInstance, credentials) {
  // widget not found, pass along
  if (!widgetInstance) { return; }

  // widget without password, pass along
  if (Utils.noValue(widgetInstance.password)) {
    return;
  }

  // incorrect password
  if (!widgetInstance.checkPassword(credentials.password)) {
    throw Errors.access('forbidden', 'Invalid widget password.');
  }
}

/**
 * @param {string} filterField
 * @param {*} filterValue
 * @param {boolean} [resolveIfNotFound=false]
 * @param {boolean} [filterFields=false] filter to keep only public fields
 * @param {object} [credentials]
 * @param {string} [credentials.password]
 * @returns {Promise.<widget|undefined>}
 * @private
 */
function _find(filterField, filterValue, resolveIfNotFound, filterFields, credentials) {
  const where = {
    [filterField]: filterValue
  };
  return DbModels.widget.find({where: where}).then(widgetInstance => {
    if (credentials) {
      checkCredentials(widgetInstance, credentials);
    }

    if (widgetInstance) {
      return _filterWidget(widgetInstance, filterFields);
    }

    if (resolveIfNotFound) {
      return undefined;
    }

    return Errors.business(
      'not_found',
      'No widget found for ' + filterField + ' #' + filterValue,
      true
    );
  });
}

/**
 * Unwrap and filter a Widget object from sequelize.
 * Adds an `url` property.
 *
 * @param {widget} widget
 * @param {boolean} [filterFields=false] whether unwrap and filter the widget
 * @returns {{
 *   title: string,
 *   key: string,
 *   content: object,
 *   url: string,
 *   userId: number,
 *   visualizationId: number,
 *   updatedAt: number,
 *   createdAt: number,
 *   password: boolean
 * }} widget
 * @private
 */
function _filterWidget(widget, filterFields) {
  let widgetAfter;

  if (filterFields) {
    widgetAfter = _.pick(widget.get(), PUBLIC_FIELDS);
    widgetAfter.password = Utils.hasValue(widget.password);
  } else {
    widgetAfter = widget;
  }

  widgetAfter.url = LKE.getBaseURL('/widget/' + widget.key);
  return widgetAfter;
}
