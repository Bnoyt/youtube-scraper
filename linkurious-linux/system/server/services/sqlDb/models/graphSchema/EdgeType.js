/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-10-08.
 *
 * File: EdgeType
 * Description: An edgeType has a key name, a source nodeType and a target nodeType.
 */
'use strict';

module.exports = function(sequelize, DataTypes) {
  const edgeType = sequelize.define('edgeType', {
    name: {
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
    timestamps: false
  });

  return edgeType;
};
