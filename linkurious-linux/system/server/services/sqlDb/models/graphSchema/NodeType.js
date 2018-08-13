/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-10-08.
 *
 * File: NodeType
 * Description: This represents a type of node in the graph database (neo4j: labels).
 */
'use strict';

module.exports = function(sequelize, DataTypes) {
  const nodeType = sequelize.define('nodeType', {
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

  return nodeType;
};
