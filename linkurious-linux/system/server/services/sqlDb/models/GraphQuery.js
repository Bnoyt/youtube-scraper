/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-06-11.
 */
'use strict';

/**
 * Graph Query
 *
 * @typedef {Object} GraphQuery
 * @property {String} query.dialect dialect in which the query is expressed (cypher, gremlin, etc.)
 * @property {String} query.content content of the query (actual script)
 * @property {String} [query.name]  optional name of the query
 * @property {Number} query.userId  id of the user the query belongs to
 * @property {Date} query.updatedAt query's last update date
 * @property {Date} query.createdAt query's creation date
 */

module.exports = function(sequelize, DataTypes) {
  const graphQuery = sequelize.define('graphQuery', {
    /**
     * Name of the query
     */
    name: {
      allowNull: true,
      type: DataTypes.STRING(200),
      unique: false
    },

    /**
     * Dialect in which the query is expressed (e.g.: 'cypher', 'gremlin')
     */
    dialect: {
      allowNull: false,
      type: DataTypes.STRING(20),
      unique: false
    },

    /**
     * The actual query content
     */
    content: {
      allowNull: false,
      type: DataTypes.TEXT
    }
  }, {
    charset: 'utf8',
    classMethods: {
      associate: models => {
        graphQuery.belongsTo(models.user, {foreignKey: 'userId'});
      }
    }
  });

  return graphQuery;
};
