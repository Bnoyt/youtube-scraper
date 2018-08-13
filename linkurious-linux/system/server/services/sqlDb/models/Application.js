/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-11-02.
 */
'use strict';

// external libs
const _ = require('lodash');

// locals
const DBFields = require('./lib/DBFields');

const PUBLIC_FIELDS = [
  'id', 'enabled', 'apiKey', 'name', 'rights', 'createdAt', 'updatedAt'
];

const APP_ACTIONS = [
  // visualization actions
  'visualization.read',
  'visualization.create',
  'visualization.edit',
  'visualization.delete',
  'visualization.list',

  // visualization folder actions
  'visualizationFolder.create',
  'visualizationFolder.edit',
  'visualizationFolder.delete',

  // visualization share actions
  'visualizationShare.read',
  'visualizationShare.create',
  'visualizationShare.delete',

  // search action
  'sandbox',

  // widget actions
  'widget.read',
  'widget.create',
  'widget.edit',
  'widget.delete',

  // graph item actions
  'graphItem.read',
  'graphItem.create',
  'graphItem.edit',
  'graphItem.delete',

  // search action
  'graphItem.search',

  // saved graph query actions
  'savedGraphQuery.read',
  'savedGraphQuery.create',
  'savedGraphQuery.edit',
  'savedGraphQuery.delete',

  // graph query actions
  'graph.rawRead',
  'graph.rawWrite',

  // shortest path action
  'graph.shortestPath',

  // alert actions
  'alert.read',
  'alert.doAction',

  // schema action,
  'schema'
];

module.exports = function(sequelize, DataTypes) {

  const application = sequelize.define('application', {
    // application name
    name: {
      type: DataTypes.STRING(),
      allowNull: false
    },
    // whether this app is allowed to authenticate
    enabled: {
      type: DataTypes.BOOLEAN(),
      allowNull: false
    },
    // access token to authenticate the application
    apiKey: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    // array of allowed APP_ACTIONS
    rights: DBFields.generateJsonField('rights', [], false, sequelize.options.dialect)
  }, {
    charset: 'utf8',
    classMethods: {
      associate: models => {
        application.belongsToMany(models.group, {through: 'applicationGroups'});
      },
      instanceToPublicAttributes: instanceToPublicAttributes
    }
  });

  application.APP_ACTIONS = APP_ACTIONS;
  application.PUBLIC_FIELDS = PUBLIC_FIELDS;

  return application;
};

/**
 * @param {ApplicationInstance} appInstance
 * @returns {PublicApplication}
 */
function instanceToPublicAttributes(appInstance) {
  return /**@type {PublicApplication}*/ (_.pick(appInstance, PUBLIC_FIELDS));
}
