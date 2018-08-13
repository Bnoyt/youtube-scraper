/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-05-18.
 */
'use strict';

// external libs
const _ = require('lodash');

// services
const LKE = require('../../index');
const Utils = LKE.getUtils();

// locals
const DBFields = require('./lib/DBFields');

const PUBLIC_FIELDS = ['id', 'sourceKey', 'alertId', 'hash',
  'status', 'expirationDate', 'nodes', 'edges', 'createdAt', 'updatedAt']; // 'columns' as well as virtual field

/**
 * Match
 *
 * @property {number}                 id             Id of the match (added by sequelize)
 * @property {string}                 sourceKey      Key of the data-source that contains this match (copied from its alert)
 * @property {number}                 alertId        Alert that created the match
 * @property {string}                 hash           Hash used to remove duplicate matches
 * @property {string}                 status         Status of the match according to the action that were performed on it
 * @property {object}                 user           User that changed the status last
 * @property {object[]}               viewers        Users that viewed the match
 * @property {string}                 expirationDate Date when the match is going to be deleted
 * @property {string}                 nodes          Ids of the nodes of the match encoded as a JSON
 * @property {string}                 edges          Ids of the edges of the match encoded as a JSON
 * @property {Array<string | number>} columns        Scalar value for a given column by index defined in the alert
 * @property {number}                 version        Version of the match (a match is updated lazily on retrieval to the latest version)
 * @property {string}                 createdAt      Creation date (added by sequelize)
 * @property {string}                 updatedAt      Update date (added by sequelize)
 */

module.exports = function(sequelize, DataTypes) {
  const STATUS_VALUES = ['unconfirmed', 'confirmed', 'dismissed'];

  const match = sequelize.define('match', {
    sourceKey: {
      allowNull: false,
      type: DataTypes.STRING(8)
    },
    hash: {
      allowNull: false,
      type: DataTypes.STRING(200),
      unique: true
    },

    // @backward-compatibility score field was deprecated by allowing more columns
    score: {
      allowNull: true,
      type: DataTypes.INTEGER
    },
    status: {
      allowNull: false,
      type: DataTypes.STRING(20)
    },
    expirationDate: DBFields.generateIntegerDateField('expirationDate', false),
    nodes: DBFields.generateJsonField('nodes'),
    edges: DBFields.generateJsonField('edges'),

    columnString0: {
      allowNull: true,
      type: DataTypes.STRING
    },
    columnNumber0: {
      allowNull: true,
      type: DataTypes.DOUBLE
    },
    columnString1: {
      allowNull: true,
      type: DataTypes.STRING
    },
    columnNumber1: {
      allowNull: true,
      type: DataTypes.DOUBLE
    },
    columnString2: {
      allowNull: true,
      type: DataTypes.STRING
    },
    columnNumber2: {
      allowNull: true,
      type: DataTypes.DOUBLE
    },
    columnString3: {
      allowNull: true,
      type: DataTypes.STRING
    },
    columnNumber3: {
      allowNull: true,
      type: DataTypes.DOUBLE
    },
    columnString4: {
      allowNull: true,
      type: DataTypes.STRING
    },
    columnNumber4: {
      allowNull: true,
      type: DataTypes.DOUBLE
    },
    version: {
      allowNull: false,
      type: DataTypes.INTEGER
    }
  }, {
    charset: 'utf8',
    classMethods: {
      associate: models => {
        models.match.hasMany(models.matchAction, {foreignKey: 'matchId', onDelete: 'cascade'});
        models.match.belongsTo(models.alert, {foreignKey: 'alertId'});
        models.match.belongsTo(models.user, {foreignKey: 'statusUserId'});
      },
      instanceToPublicAttributes: instanceToPublicAttributes
    }
  });

  match.STATUS_VALUES = STATUS_VALUES;

  return match;
};

/**
 * Configure a virtual `columns` field based on the `columnsDescription` of its alert.
 *
 * @param {MatchInstance} matchInstance
 * @param {Array<{type: string, columnName: string, columnTitle: string}>} [columnsDescription]
 * @returns {Partial<PublicMatch>} only missing viewers
 */
function instanceToPublicAttributes(matchInstance, columnsDescription) {
  const publicMatch = /**@type {Partial<PublicMatch>}*/ (_.pick(matchInstance, PUBLIC_FIELDS));

  if (Utils.noValue(columnsDescription)) {
    return publicMatch;
  }

  publicMatch.columns = [];
  columnsDescription.forEach((column, idx) => {
    let rawFieldName;
    if (column.type === 'number') {
      rawFieldName = 'columnNumber' + idx;
    } else { // string
      rawFieldName = 'columnString' + idx;
    }

    publicMatch.columns.push(matchInstance[rawFieldName]);
  });

  return publicMatch;
}
