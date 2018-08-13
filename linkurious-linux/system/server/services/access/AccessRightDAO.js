/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-12-17.
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../index');
const Db = LKE.getSqlDb();
const Data = LKE.getData();
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();

// locals
const Actions = require('./actions');

class AccessRightDAO {
  /**
   * @type {AccessRightModel}
   */
  get model() {
    return Db.models.accessRight;
  }

  /**
   * @type {string}
   */
  get NO_CATEGORY_TARGET_NAME() {
    return '[no_category]';
  }

  /**
   * List all the possible right types.
   *
   * @returns {string[]}
   */
  listRightTypes() {
    return _.values(this.model.TYPES);
  }

  /**
   * List all the possible target types.
   *
   * @returns {string[]}
   */
  listTargetTypes() {
    return _.values(this.model.TARGET_TYPES);
  }

  /**
   * List all the possible actions for a custom group.
   *
   * @returns {string[]}
   */
  listActions() {
    return Actions.PUBLIC_ACTIONS;
  }

  /**
   * Validate the access rights that can be added to a custom group.
   * - No targetName "*" for targetType "nodeCategory" and "edgeType" (allowed for the builtin groups)
   * - No targetName "x" for targetType "nodeCategory" and "edgeType" if "x" is not in the schema and `validateAgainstSchema` is true
   *
   * @param {AccessRightAttributes[]} rights
   * @param {string}                  sourceKey
   * @param {boolean}                 [validateAgainstSchema] Whether the access rights will be checked to be of node categories or edge types in the schema
   * @returns {Bluebird<void>}
   */
  checkRights(rights, sourceKey, validateAgainstSchema) {

    const schemaPromise = validateAgainstSchema
      ? Promise.props({
        nodeCategories: Data.getSchemaNodeTypeNames(sourceKey),
        edgeTypes: Data.getSchemaEdgeTypeNames(sourceKey)
      })
      : Promise.resolve({nodeCategories: [], edgeTypes: []});

    return schemaPromise.then(schema => {
      const dataSource = Data.resolveSource(sourceKey);

      // if we allow nodes with no category
      if (validateAgainstSchema && dataSource.features.minNodeCategories === 0) {
        // we add the special category "[no_category]" to the possible access rights
        schema.nodeCategories.push(this.NO_CATEGORY_TARGET_NAME);
      }

      return Promise.map(rights, right => {
        Utils.check.properties('right', right, {
          type: {required: true, values: this.listRightTypes()},
          targetType: {required: true, values: this.listTargetTypes()},
          targetName: {required: true, check: 'nonEmpty'},
          sourceKey: {required: true, check: (key, value) => Utils.checkSourceKey(value)}
        });

        Utils.check.values('right.type', right.type,
          this.model.LEGAL_RIGHTS_BY_TARGET_TYPE.get(right.targetType)
        );

        if (right.targetType === 'action') {
          Utils.check.values('right.targetName', right.targetName,
            Actions.PUBLIC_ACTIONS
          );
        }

        if (right.targetType === 'nodeCategory' || right.targetType === 'edgeType') {
          if (right.targetName === '*') {
            return Errors.business('invalid_parameter',
              'It\'s not possible to set "*" as "targetName" in a schema access right.', true
            );
          }
        }

        if (validateAgainstSchema) {
          if (right.targetType === 'nodeCategory') {
            if (schema.nodeCategories.length === 0) {
              return Errors.business('invalid_parameter',
                'It\'s not possible to set "nodeCategory" as "targetType" ' +
                'if no node category is available in the schema.', true
              );
            }
            Utils.check.values('right.targetName', right.targetName, schema.nodeCategories);
          }

          if (right.targetType === 'edgeType') {
            if (schema.edgeTypes.length === 0) {
              return Errors.business('invalid_parameter',
                'It\'s not possible to set "edgeType" as "targetType" ' +
                'if no edge type is available in the schema.', true
              );
            }
            Utils.check.values('right.targetName', right.targetName, schema.edgeTypes);
          }
        }

      });
    }).return();
  }

  /**
   * Find a matching access right. An access right match with another one if their scopes
   * overlap (except wildcard "*").
   *
   * @param {number}                groupId ID of the group
   * @param {AccessRightAttributes} right   Access right to check
   * @returns {Bluebird<AccessRightInstance>}
   */
  findMatchingRight(groupId, right) {
    return this.model.findOne({
      where: {
        groupId: groupId,
        targetType: right.targetType,
        targetName: [right.targetName],
        sourceKey: right.sourceKey
      }
    });
  }

  /**
   * Get the list of target names (access rights) filtered by sourceKey, targetType and type.
   * If the type is "read" and on a given targetName the user has an higher type,
   * return that targetName in the result as well.
   * A returned value of `["*"]` means all the target names.
   *
   * If sourceKey is undefined it means *any* sourceKey. To not confuse with *all* sourceKey.
   *
   * @param {PublicUser} publicUser  A public user with groups and access rights
   * @param {string}     targetType  Type of the target ("edgeType", "nodeCategory", "action", etc.)
   * @param {string}     type        Type of the right ("read", "write", etc.)
   * @param {string}     [sourceKey] Key of the data-source
   * @returns {Bluebird<string[]>} Matching target names
   */
  getRights(publicUser, targetType, type, sourceKey) {
    // if the type is "read", we also look for "edit" access rights
    const types = Utils.hasValue(this.model.IMPLICIT_RIGHTS.get(type))
      ? this.model.IMPLICIT_RIGHTS.get(type)
      : [type];

    let targetNames = [];

    if (Utils.hasValue(publicUser.groups)) {
      publicUser.groups.forEach(group => {
        // process each access right for each group in the data-source (or the admin group)
        if (Utils.hasValue(group.accessRights) &&
          (group.sourceKey === sourceKey || group.sourceKey === '*' || Utils.noValue(sourceKey))) {
          group.accessRights.forEach(accessRight => {
            if (accessRight.targetType === targetType && types.includes(accessRight.type)) {
              targetNames.push(accessRight.targetName);
            }
          });
        }
      });
    }

    // if targetNames includes the wildcard, return only the wildcard
    targetNames = targetNames.includes('*') ? ['*'] : targetNames;

    return Promise.resolve(targetNames);
  }
}

module.exports = new AccessRightDAO();
