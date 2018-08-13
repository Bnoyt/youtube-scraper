/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-02-23.
 */
'use strict';

const DBFields = require('./lib/DBFields');

module.exports = function(sequelize, DataTypes) {

  const widget = sequelize.define('widget', {

    title: {
      type: DataTypes.STRING(),
      allowNull: false
    },

    key: {
      type: DataTypes.STRING(8),
      allowNull: false
    },

    salt: {
      type: DataTypes.STRING(24),
      allowNull: true
    },
    password: {
      type: DataTypes.STRING(512),
      allowNull: true,
      set: function(password) {
        DBFields.storePassword(this, password);
      }
    },

    content: DBFields.generateJsonField('content', {}, true, sequelize.options.dialect)

  }, {
    charset: 'utf8',
    classMethods: {
      associate: function(models) {
        models.visualization.hasOne(widget, {
          foreignKey: 'visualizationId',
          onDelete: 'cascade'
        });
        widget.belongsTo(models.user, {foreignKey: 'userId'});
      }
    },

    instanceMethods: {
      /**
       * @param {string} password
       * @returns {boolean}
       */
      checkPassword: function(password) {
        return DBFields.checkPassword(this, password);
      }
    }
  });

  return widget;
};
