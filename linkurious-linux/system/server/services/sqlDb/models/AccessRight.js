/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 */
'use strict';

// external libs
const _ = require('lodash');

const PUBLIC_FIELDS = ['type', 'targetType', 'targetName'];

const TYPES = {
  READ: 'read',
  WRITE: 'write', // read + edit + delete
  EDIT: 'edit',
  NONE: 'none',
  DO: 'do'
};

const TARGET_TYPES = {
  NODE_CATEGORY: 'nodeCategory',
  EDGE_TYPE: 'edgeType',
  ACTION: 'action',
  ALERT: 'alert'
};

/**@type {Map<string, string[]>}*/
const LEGAL_RIGHTS_BY_TARGET_TYPE = new Map();
LEGAL_RIGHTS_BY_TARGET_TYPE.set('nodeCategory', ['read', 'write', 'edit', 'none']);
LEGAL_RIGHTS_BY_TARGET_TYPE.set('edgeType', ['read', 'write', 'edit', 'none']);
LEGAL_RIGHTS_BY_TARGET_TYPE.set('action', ['do', 'none']);
LEGAL_RIGHTS_BY_TARGET_TYPE.set('alert', ['read', 'none']);

/**@type {Map<string, string[]>}*/
const IMPLICIT_RIGHTS = new Map();
// you can read if you can read, edit or write
IMPLICIT_RIGHTS.set('read', ['read', 'edit', 'write']);
// you can edit if you can edit or write
IMPLICIT_RIGHTS.set('edit', ['edit', 'write']);

module.exports = function(sequelize, DataTypes) {

  const accessRightModel = sequelize.define('accessRight', {
    type: {
      allowNull: false,
      type: DataTypes.STRING
    },
    targetType: {
      allowNull: false,
      type: DataTypes.STRING
    },
    targetName: {
      allowNull: false,
      type: DataTypes.STRING
    },
    sourceKey: {
      type: DataTypes.STRING(8),
      allowNull: false
    }
  }, {
    charset: 'utf8',
    classMethods: {
      associate: models => {
        models.group.hasMany(accessRightModel);
      },
      instanceToPublicAttributes: instanceToPublicAttributes
    }
  });

  accessRightModel.TYPES = TYPES;
  accessRightModel.TARGET_TYPES = TARGET_TYPES;
  accessRightModel.PUBLIC_FIELDS = PUBLIC_FIELDS;
  accessRightModel.LEGAL_RIGHTS_BY_TARGET_TYPE = LEGAL_RIGHTS_BY_TARGET_TYPE;
  accessRightModel.IMPLICIT_RIGHTS = IMPLICIT_RIGHTS;

  return accessRightModel;
};

/**
 * @param {AccessRightInstance} accessRightInstance
 * @param {boolean}             [withSourceKey]
 * @returns {PublicAccessRight}
 */
function instanceToPublicAttributes(accessRightInstance, withSourceKey) {
  let fields = PUBLIC_FIELDS;
  if (withSourceKey) {
    fields = fields.concat(['sourceKey']);
  }

  return /**@type {PublicAccessRight}*/ (_.pick(accessRightInstance, fields));
}
