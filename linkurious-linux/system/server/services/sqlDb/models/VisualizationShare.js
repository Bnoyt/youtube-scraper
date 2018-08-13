/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-02-23.
 */
'use strict';

module.exports = function(sequelize, DataTypes) {

  const rights = ['read', 'write', 'owner'];

  const visualizationShare = sequelize.define('visualizationShare', {

    right: {
      type: DataTypes.STRING(20),
      values: rights
    }

  }, {
    charset: 'utf8',
    classMethods: {
      associate: models => {
        visualizationShare.belongsTo(models.visualization, {foreignKey: 'visualizationId'});
        visualizationShare.belongsTo(models.user, {foreignKey: 'userId'});
      }
    }
  });

  visualizationShare.RIGHTS = rights;

  return visualizationShare;
};
