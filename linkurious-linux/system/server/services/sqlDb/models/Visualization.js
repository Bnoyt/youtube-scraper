/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-10-08.
 *
 * File: Visualization.js
 * Description: Model representing a visualization
 */
'use strict';

const DBFields = require('./lib/DBFields');

/**
 * Visualization
 *
 * @typedef {object} Visualization
 *
 * @property {string} visualization.title Title of the visualization.
 * @property {string} visualization.sourceKey Key of the data-sources containing the nodes/edges
 *                    in this visualization.
 * @property {boolean} visualization.sandbox Whether this visualization is a sandbox:
 *                     - it contains no nodes, edges, edgeFields, nodeFields, filters, identifiers;
 *                     - it contains only a design;
 *                     - all new created visualizations for this (user, data-source) are a copy of the sandbox.
 *
 * @property {VisualizationNode[]} visualization.nodes Nodes contained in this visualization.
 * @property {VisualizationEdge[]} visualization.edges Edges contained in this visualization.
 * @property {FieldsConfiguration} visualization.nodeFields Configuration of node tooltips and captions.
 * @property {FieldsConfiguration} visualization.edgeFields Configuration of edge tooltips and captions.
 * @property {object[]} visualization.filters
 * @property {Date} visualization.createdAt Creation date.
 * @property {Date} visualization.updatedAt Last update date.
 * @property {number} visualization.folder ID of the parent folder (`-1` for root).
 * @property {number} visualization.userId ID of owner.
 * @property {object} visualization.identifiers Alternative node/edge identifier configuration.
 *
 * @property {object} visualization.design
 * @property {object} visualization.design.styles Currently visualization styles.
 * @property {VisualizationStyle} visualization.design.styles.nodes Current node style.
 * @property {VisualizationStyle} visualization.design.styles.edges Current edge style.
 *
 * @property {object} visualization.design.palette
 *
 * @property {object}   visualization.design.palette.nodes Node palettes.
 * @property {object}   visualization.design.palette.nodes.qualitative Quantitative palettes (by name).
 * @property {object}   visualization.design.palette.nodes.qualitative.linkurious_def Palettes (by bin size).
 * @property {string[]} visualization.design.palette.nodes.qualitative.linkurious_def.* Hex colors in the palette.
 * @property {object}   visualization.design.palette.nodes.qualitative.categories Colors (by category).
 * @property {string}   visualization.design.palette.nodes.qualitative.categories.* Hex colors.
 * @property {object}   visualization.design.palette.nodes.sequential Palettes (by bin size).
 * @property {string[]} visualization.design.palette.nodes.sequential.* Hex colors in the palette.
 * @property {object}   visualization.design.palette.nodes.icons
 * @property {object}   visualization.design.palette.nodes.icons.categories Icon (by category)
 * @property {string}   visualization.design.palette.nodes.icons.categories.*.font Name of an icon font.
 * @property {number}   visualization.design.palette.nodes.icons.categories.*.scale Scale of the icon.
 * @property {string}   visualization.design.palette.nodes.icons.categories.*.color Hex color of the icon.
 * @property {string}   visualization.design.palette.nodes.icons.categories.*.content Displayed glyph.
 *
 * @property {object}   visualization.design.palette.edges Edges palettes.
 * @property {object}   visualization.design.palette.edges.qualitative Quantitative palettes (by name).
 * @property {object}   visualization.design.palette.edges.qualitative.linkurious_def Palettes (by bin size).
 * @property {string[]} visualization.design.palette.edges.qualitative.linkurious_def.* Hex colors in the palette.
 * @property {object}   visualization.design.palette.edges.qualitative.type Colors (by type).
 * @property {string}   visualization.design.palette.edges.qualitative.type.* Hex colors.
 * @property {object}   visualization.design.palette.edges.sequential Palettes by bin size.
 * @property {string[]} visualization.design.palette.edges.sequential.* Hex colors in the palette.
 * @property {string}   visualization.mode ("nodelink" or "geo")
 * @property {object}   visualization.layout Last used layout in current mode.
 * @property {string}   visualization.layout.algorithm "force" or "hierarchical".
 * @property {string}   visualization.layout.mode for "force": ["fast", "random", "best"],
 *                                                for "hierarchical": ["TB", "BT", "RL", "LR"].
 */

/**
 * Visualization Node
 *
 * @typedef {object} VisualizationNode
 * @property {string|number} node.id Identifier of the node
 * @property {number} node.nodelink.x X coordinate of the node in "nodelink" mode
 * @property {number} node.nodelink.y Y coordinate of the node in "nodelink" mode
 * @property {number} node.nodelink.fixed Whether the node's position is locked (not affected by layout).
 * @property {number} node.geo.latitude Latitude of the node in "geo" mode
 * @property {number} node.geo.longitude Longitude of the node in "geo" mode
 * @property {number} node.selected Whether the node is selected
 */

/**
 * Visualization Edge
 *
 * @typedef {object} VisualizationEdge
 * @property {string|number} edge.id Identifier of the edge.
 * @property {boolean} edge.selected Whether the edge is selected
 */

/**
 * Fields Configuration
 * Captions and tooltips configuration for Nodes/Edges in a visualization.
 *
 * @typedef {object} FieldsConfiguration
 * @property {object}   fields Configuration of node fields and captions for this visualization.
 *
 * @property {object[]} fields.fields Tooltip properties in display order.
 * @property {string}   fields.fields.name  Name of the property.
 * @property {boolean}  fields.fields.active Whether this property is enabled in tooltips.
 *
 * @property {object}   fields.captions Captions by node category / edge type.
 * @property {number}   fields.captions.*.id
 * @property {boolean}  fields.captions.*.active
 * @property {boolean}  fields.captions.*.displayName
 * @property {string[]} fields.captions.*.properties Properties to include in this caption.
 */

/**
 * Visualization Style definition
 *
 * @typedef {object} VisualizationStyle
 *
 * @property {object} [style.icon] Current icon style.
 * @property {string} style.icon.by Path of the property to distinguish on.
 * @property {string} style.icon.scheme Path of a scheme in the palette.
 * @property {boolean} style.icon.active
 *
 * @property {object} [style.color] Current icon style.
 * @property {string} styles.color.by Path of the property to distinguish on.
 * @property {string} styles.color.scheme Path of a scheme in the palette.
 * @property {number} styles.color.bins Number of distinct values required in the scheme.
 * @property {boolean} styles.color.active
 */

module.exports = function(sequelize, DataTypes) {
  const visualization = sequelize.define('visualization', {
    // name of the visualization
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    // key of the data-sources containing the nodes/edges in this visualization
    sourceKey: {
      type: DataTypes.STRING(8),
      allowNull: false
    },
    sandbox: {
      type: DataTypes.BOOLEAN(),
      allowNull: false
    },
    nodes: DBFields.generateJsonField('nodes', [], true, sequelize.options.dialect),
    edges: DBFields.generateJsonField('edges', [], true, sequelize.options.dialect),
    nodeFields: DBFields.generateJsonField('nodeFields'),
    edgeFields: DBFields.generateJsonField('edgeFields'),
    design: DBFields.generateJsonField('design'),
    filters: DBFields.generateJsonField('filters'),
    alternativeIds: DBFields.generateJsonField('alternativeIds', {}),
    mode: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: 'nodelink'
    },
    layout: DBFields.generateJsonField('layout'),
    geo: DBFields.generateJsonField('geo'),
    version: {
      allowNull: false,
      type: DataTypes.INTEGER
    }
  }, {
    charset: 'utf8',
    classMethods: {
      associate: models => {
        // no constrains: -1 is legal for root folder
        visualization.belongsTo(models.visualizationFolder, {
          foreignKey: 'folder', constraints: false
        });
        visualization.belongsTo(models.user, {foreignKey: 'userId'});
        visualization.hasMany(models.visualizationShare, {foreignKey: 'visualizationId'});
      }
    }
  });

  return visualization;
};
