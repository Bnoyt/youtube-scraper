/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-10-08.
 *
 * File: VisualizationFolder.js
 * Description: Model representing a folder in the visualization dashboard
 */
'use strict';

module.exports = function(sequelize, DataTypes) {

  const visualizationFolder = sequelize.define('visualizationFolder', {
    // name of this folder
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // key of the data-sources containing this folder
    sourceKey: {
      type: DataTypes.STRING(8),
      allowNull: false
    },
    // user id (can be negative IDs for specials users), no integrity check
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    charset: 'utf8',
    classMethods: {
      associate: () => {
        // no constrains: -1 is legal for root folder
        visualizationFolder.belongsTo(visualizationFolder, {
          foreignKey: 'parent', constraints: false
        });
      }
    }
  });

  return visualizationFolder;
};
