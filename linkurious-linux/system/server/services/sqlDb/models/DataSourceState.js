/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-01-22.
 */
'use strict';

const DBFields = require('./lib/DBFields');

module.exports = function(sequelize, DataTypes) {
  const dataSourceState = sequelize.define('dataSourceState', {
    /**
     * created by DataSource.computeSourceInfo
     * available here for easier debugging as this explicitly contains the graph server info.
     */
    info: {
      allowNull: false,
      type: DataTypes.STRING(200),
      unique: true
    },

    /**
     * created by DataSource.computeSourceKey
     */
    key: {
      allowNull: false,
      type: DataTypes.STRING(8),
      unique: true
    },

    /**
     * last time thus data-source was seen online
     */
    lastSeen: {
      allowNull: false,
      type: DataTypes.DATE()
    },

    /**
     * data-source human-readable name (copied from config.name)
     */
    name: {
      allowNull: true,
      type: DataTypes.STRING(200),
      defaultValue: null
    },

    /**
     * (Machine-readable) name of the last used Graph DAO vendor (copied from config.graphdb.vendor)
     */
    graphVendor: {
      allowNull: true,
      type: DataTypes.STRING(100),
      defaultValue: null
    },

    /**
     * (Machine-readable) name of the last used Index DAO vendor (copied from config.index.vendor)
     */
    indexVendor: {
      allowNull: true,
      type: DataTypes.STRING(100),
      defaultValue: null
    },

    /**
     * last time this data-source was fully indexed. Initially null or undefined.
     */
    indexedDate: {
      allowNull: true,
      type: DataTypes.DATE(),
      defaultValue: null
    },

    /**
     * Error message if the last indexation failed or we interrupted, null otherwise.
     */
    indexationError: {
      allowNull: true,
      type: DataTypes.TEXT(),
      defaultValue: null
    },

    /**
     * set true when one of the following fields changes:
     * - noIndexNodeProperties
     * - hiddenNodeProperties
     * - noIndexEdgeProperties
     * - hiddenEdgeProperties
     */
    needReindex: {
      allowNull: false,
      type: DataTypes.BOOLEAN(),
      defaultValue: false
    },

    noIndexNodeProperties: DBFields.generateJsonField('noIndexNodeProperties'),

    hiddenNodeProperties: DBFields.generateJsonField('hiddenNodeProperties'),

    noIndexEdgeProperties: DBFields.generateJsonField('noIndexEdgeProperties'),

    hiddenEdgeProperties: DBFields.generateJsonField('hiddenEdgeProperties')
  }, {
    charset: 'utf8'
  });

  return dataSourceState;
};
