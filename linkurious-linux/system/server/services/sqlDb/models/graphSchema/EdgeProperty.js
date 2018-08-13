/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-10-08.
 *
 * File: EdgeProperty
 * Description: Property associated to an edgeType.
 */
'use strict';

module.exports = function(sequelize, DataTypes) {
  const edgeProperty = sequelize.define('edgeProperty', {
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
        // A property is uniquely linked to an edge type.
        // Different properties can have the same names but belong to different edge types
        models.edgeType.hasMany(edgeProperty, {foreignKey: 'typeId'});
      }
    }
  });

  return edgeProperty;
};
