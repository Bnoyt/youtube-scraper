/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-05-11.
 */
'use strict';

// external libs
const _ = require('lodash');

// locals
const DBFields = require('./lib/DBFields');

const PUBLIC_FIELDS = ['id', 'title', 'sourceKey', 'query',
  'dialect', 'enabled', 'columns', 'cron', 'matchTTL',
  'lastRun', 'lastRunProblem', 'maxMatches',
  'userId', 'createdAt', 'updatedAt'
];

/**
 * Alert
 *
 * @property {number}   id                     Id of the alert (added by sequelize)
 * @property {string}   title                  Title of the alert
 * @property {string}   sourceKey              Key of the data-source containing the nodes and edges
 * @property {string}   query                  The query that will periodically run
 * @property {string}   dialect                The dialect of the query
 * @property {boolean}  enabled                Boolean that indicates if the query will run periodically or not
 * @property {object[]} [columns]              Columns among the returned values of the query to save in a match as scalar values
 * @property {string}   columns.type           Type of the column ("number", "string")
 * @property {string}   columns.columnName     Name of the column
 * @property {string}   cron                   CRON expression representing the frequency with which the query runs
 * @property {number}   matchTTL               Time (in days) after which the matches of this alert are going to be deleted
 * @property {number}   userId                 ID of the user that created the alert
 * @property {string}   lastRun                Last time the query was executed
 * @property {{error?:  string, partial?: boolean} | undefined} lastRunProblem
 * @property {string}   lastRunProblem.error   Error that identifies the last run problem
 * @property {boolean}  lastRunProblem.partial Boolean that represents if the last run was at least partially executed
 * @property {number}   maxMatches             Maximum number of matches after which new matches are discarded
 * @property {string}   createdAt              Creation date (added by sequelize)
 * @property {string}   updatedAt              Update date (added by sequelize)
 * @property {string}   nextRun                Date of the future scheduled run (added by the alert service)
 */

module.exports = function(sequelize, DataTypes) {

  const alert = sequelize.define('alert', {
    title: {
      allowNull: false,
      type: DataTypes.STRING(200)
    },
    sourceKey: {
      allowNull: false,
      type: DataTypes.STRING(8)
    },
    query: {
      allowNull: false,
      type: DataTypes.TEXT
    },
    dialect: {
      allowNull: false,
      type: DataTypes.STRING(20)
    },
    enabled: {
      allowNull: false,
      type: DataTypes.BOOLEAN
    },
    columns: DBFields.generateJsonField('columns'),
    cron: {
      allowNull: false,
      type: DataTypes.STRING(50)
    },
    // time to live of a match (in days)
    matchTTL: {
      allowNull: false,
      type: DataTypes.INTEGER
    },
    // @backward-compatibility scoreColumn field was deprecated by allowing more columns
    scoreColumn: {
      allowNull: true,
      type: DataTypes.STRING(200)
    },
    // @backward-compatibility sortDirection field was deprecated by allowing more columns
    sortDirection: {
      allowNull: false,
      type: DataTypes.STRING(20),
      defaultValue: '' // null is not allowed, so we leave a default value
    },
    lastRun: DBFields.generateIntegerDateField('lastRun', true),
    lastRunProblem: DBFields.generateJsonField('lastRunProblem'),
    maxMatches: {
      allowNull: false,
      type: DataTypes.INTEGER
    },
    // @backward-compatibility maxRuntime field was deprecated, global alerts.maxRuntimeLimit is used
    maxRuntime: {
      allowNull: false,
      type: DataTypes.INTEGER,
      defaultValue: 0 // null is not allowed, so we leave a default value
    }
  }, {
    charset: 'utf8',
    classMethods: {
      associate: models => {
        models.alert.hasMany(models.match, {foreignKey: 'alertId', onDelete: 'cascade'});
        models.alert.belongsTo(models.user, {foreignKey: 'userId'});
      },
      instanceToPublicAttributes: instanceToPublicAttributes
    }
  });

  return alert;
};

/**
 * @param {AlertInstance} alertInstance
 * @returns {PublicAlert}
 */
function instanceToPublicAttributes(alertInstance) {
  return /**@type {PublicAlert}*/ (_.pick(alertInstance, PUBLIC_FIELDS));
}
