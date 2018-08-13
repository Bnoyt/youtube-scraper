/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../../index');
const Db = LKE.getSqlDb();
const Utils = LKE.getUtils();

// locals
const DBFields = require('./lib/DBFields');

const PUBLIC_FIELDS = ['id', 'name', 'builtin', 'sourceKey'];
const ADMIN_GROUP_NAME = 'admin';
const READ_ONLY_GROUP_NAME = 'read only';
const READ_GROUP_NAME = 'read';
const READ_AND_EDIT_GROUP_NAME = 'read and edit';
const READ_EDIT_AND_DELETE_GROUP_NAME = 'read, edit and delete';
const SOURCE_MANAGER_GROUP_NAME = 'source manager';

module.exports = function(sequelize, DataTypes) {

  const groupModel = sequelize.define('group', {
    name: DBFields.generateStringFieldInUnique('name'),
    builtin: {
      allowNull: false,
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sourceKey: {
      type: DataTypes.STRING(8),
      allowNull: false
    }
  }, {
    charset: 'utf8',
    classMethods: {
      associate: models => {
        models.user.belongsToMany(groupModel, {through: 'userGroups'});
      },
      initialValues: () => {
        return _ensureBuiltinGroup(ADMIN_GROUP_NAME, '*')
          .then(adminGroup => {
            groupModel.ADMIN_GROUP = adminGroup;
          });
      },
      findAllByName: (name, builtin) => {
        // the field containing the name may not contain only the name
        // but also the suffix for removing the unique constraint
        const searchOptions = {where: {
          $or: [
            {
              name: {
                $like: name + DBFields.DEUNIQUE_SUFFIX
              }
            },
            {
              // @backward-compatibility for old group names not updated
              name: name
            }
          ]
        }};
        if (Utils.hasValue(builtin)) {
          searchOptions.where.builtin = builtin;
        }
        return groupModel.findAll(searchOptions);
      },
      instanceToPublicAttributes: instanceToPublicAttributes,
      ensureBuiltins: ensureBuiltins
    }
  });

  groupModel.PUBLIC_FIELDS = PUBLIC_FIELDS;
  groupModel.ADMIN_GROUP_NAME = ADMIN_GROUP_NAME;
  groupModel.READ_ONLY_GROUP_NAME = READ_ONLY_GROUP_NAME;
  groupModel.READ_GROUP_NAME = READ_GROUP_NAME;
  groupModel.READ_AND_EDIT_GROUP_NAME = READ_AND_EDIT_GROUP_NAME;
  groupModel.READ_EDIT_AND_DELETE_GROUP_NAME = READ_EDIT_AND_DELETE_GROUP_NAME;
  groupModel.SOURCE_MANAGER_GROUP_NAME = SOURCE_MANAGER_GROUP_NAME;

  return groupModel;
};

/**
 * @param {GroupInstance} groupInstance
 * @param {boolean}       [withDates]   Whether to populate the creation and update dates
 * @returns {PublicGroup}
 */
function instanceToPublicAttributes(groupInstance, withDates) {
  let fields = PUBLIC_FIELDS;
  if (withDates) {
    fields = fields.concat(['createdAt', 'updatedAt']);
  }

  return /**@type {PublicGroup}*/ (_.pick(groupInstance, fields));
}

/**
 * @param {string}                  name
 * @param {string}                  sourceKey
 * @returns {Bluebird<GroupInstance>}
 * @private
 */
function _ensureBuiltinGroup(name, sourceKey) {
  const findCreate = {
    where: {
      sourceKey: sourceKey,
      $or: [
        {
          name: {
            $like: name + DBFields.DEUNIQUE_SUFFIX
          }
        },
        {
          name: name // for old names not updated
        }
      ]
    },
    defaults: {name: name, builtin: true, sourceKey: sourceKey}
  };
  return Db.models.group.findOrCreate(findCreate).spread(group => {
    return group;
  });
}

/**
 * Check that the built-in groups `read`, `read and edit`, `read, edit and delete` and
 * `source manager` exist for this data-source.
 *
 * @param {string} sourceKey
 * @returns {Bluebird<void>}
 */
function ensureBuiltins(sourceKey) {
  return Promise.map([
    READ_ONLY_GROUP_NAME,
    READ_GROUP_NAME,
    READ_AND_EDIT_GROUP_NAME,
    READ_EDIT_AND_DELETE_GROUP_NAME,
    SOURCE_MANAGER_GROUP_NAME
  ], groupName => {
    return _ensureBuiltinGroup(groupName, sourceKey);
  }, {concurrency: 1}).return();
}
