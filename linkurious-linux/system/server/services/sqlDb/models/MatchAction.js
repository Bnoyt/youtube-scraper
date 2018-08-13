/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-05-23.
 */
'use strict';

// external libs
const _ = require('lodash');

const PUBLIC_FIELDS = ['id', 'matchId', 'action', 'createdAt', 'updatedAt'];

/**
 * MatchAction
 *
 * @property {number} id        Id of the match (added by sequelize)
 * @property {number} matchId   Match on which the action is performed
 * @property {object} user      The user that did the action
 * @property {string} action    The action name ("open", "confirm", "dismiss")
 * @property {string} createdAt Creation date (added by sequelize)
 * @property {string} updatedAt Update date (added by sequelize)
 */

module.exports = function(sequelize, DataTypes) {
  const ACTION_VALUES = ['open', 'confirm', 'unconfirm', 'dismiss'];

  const matchAction = sequelize.define('matchAction', {
    action: {
      allowNull: false,
      type: DataTypes.STRING(20)
    }
  }, {
    charset: 'utf8',
    classMethods: {
      associate: models => {
        models.matchAction.belongsTo(models.match, {foreignKey: 'matchId'});
        models.matchAction.belongsTo(models.user, {foreignKey: 'userId'});
      },
      instanceToPublicAttributes: instanceToPublicAttributes
    }
  });

  matchAction.ACTION_VALUES = ACTION_VALUES;

  return matchAction;
};

/**
 * @param {MatchActionInstance} matchActionInstance
 * @returns {PublicMatchAction}
 */
function instanceToPublicAttributes(matchActionInstance) {
  return /**@type {PublicMatchAction}*/ (_.pick(matchActionInstance, PUBLIC_FIELDS));
}
