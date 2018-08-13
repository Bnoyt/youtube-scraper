/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-10-08.
 *
 * File: NodeProperty
 * Description: Property associated to a nodeType.
 */
'use strict';

module.exports = function(sequelize, DataTypes) {
  const nodeProperty = sequelize.define('nodeProperty', {
    key: {
      type: DataTypes.STRING,
      allowNull: false
    },
    count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    sourceKey: {
      type: DataTypes.STRING(8),
      allowNull: false
    }
  }, {
    charset: 'utf8',
    timestamps: false,
    classMethods: {
      associate: models => {
        // A property is uniquely linked to a node type.
        // Different properties can have the same names but belong to different node types
        models.nodeType.hasMany(nodeProperty, {foreignKey: 'typeId'});
      }
    }
  });

  return nodeProperty;
};
