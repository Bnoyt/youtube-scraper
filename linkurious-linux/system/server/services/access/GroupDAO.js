/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-12-05.
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../index');
const Db = LKE.getSqlDb();
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const Data = LKE.getData();
const AccessRightDAO = LKE.getAccessRightDAO();

// locals
const UserCache = require('./UserCache');
const builtinGroups = require('../../../server/services/access/builtinGroups');

class GroupDAO {
  /**
   * @type {GroupModel}
   */
  get model() {
    return Db.models.group;
  }

  /**
   * Given a subset of access rights, the targetType and the node categories or the edge types
   * in the schema, produce the complete access rights set for the targetType:
   * - we expand `*` based on the schema information
   * - we set to `none` everything not in the access rights but in the schema
   *
   * @param {string}              targetType        'nodeCategory' or 'edgeType'
   * @param {PublicAccessRight[]} accessRights      Explicit access rights of a group
   * @param {string[]}            categoriesOrTypes List of node categories or edge types in the schema
   * @returns {PublicAccessRight[]}
   * @private
   */
  _expandAccessRights(targetType, accessRights, categoriesOrTypes) {
    // first we look for the wildcard access right, if present
    // 0 or 1 wildcards can be in the list
    let wildcardValue = Db.models.accessRight.TYPES.NONE;
    for (let i = 0; i < accessRights.length; ++i) {
      const currentRight = accessRights[i];
      if (currentRight.targetName === '*') {
        wildcardValue = currentRight.type;
        accessRights.splice(i, 1); // we remove the wildcard access right
        break;
      }
    }

    // now we set everything in the schema with the wildcardValue
    const missingAccessRightsTargetNames = _.difference(
      categoriesOrTypes,
      _.map(accessRights, 'targetName')
    );

    [].push.apply(accessRights, missingAccessRightsTargetNames.map(targetName => {
      return {
        type: wildcardValue,
        targetType: targetType,
        targetName: targetName
      };
    }));

    return accessRights;
  }

  /**
   * Return the proper access rights for a builtin group based on its name.
   *
   * @param {PublicGroup} group
   * @returns {PublicAccessRight[]}
   * @private
   */
  _getBuiltinAccessRights(group) {
    if (group.builtin) {
      switch (group.name) {
        case Db.models.group.READ_ONLY_GROUP_NAME:
          return builtinGroups.READ_ONLY_ACCESS_RIGHTS;
        case Db.models.group.READ_GROUP_NAME:
          return builtinGroups.READ_ACCESS_RIGHTS;
        case Db.models.group.READ_AND_EDIT_GROUP_NAME:
          return builtinGroups.READ_EDIT_ACCESS_RIGHTS;
        case Db.models.group.READ_EDIT_AND_DELETE_GROUP_NAME:
          return builtinGroups.READ_EDIT_DELETE_ACCESS_RIGHTS;
        case Db.models.group.SOURCE_MANAGER_GROUP_NAME:
          return builtinGroups.SOURCE_MANAGER_ACCESS_RIGHTS;
        case Db.models.group.ADMIN_GROUP_NAME:
          return builtinGroups.ADMIN_ACCESS_RIGHTS;
      }
    }
  }

  /**
   * In this function we do the following:
   * - we turn the groupInstance into group attributes
   * - we add the user-count to the group
   * - if `withAccessRights` we add the access rights for the group
   * - if `expandRights` is true
   *  - we expand `*` based on the schema information
   *  - we set to `none` everything not in the access rights but in the schema
   *
   * @param {GroupInstance} groupInstance               Group instance
   * @param {object}        [options]
   * @param {boolean}       [options.withAccessRights]  Whether to populate the accessRights
   * @param {boolean}       [options.withUserCount]     Whether to populate the userCount
   * @param {boolean}       [options.withDates]         Whether to populate the creation and update dates
   * @param {string}        [options.sourceKey]         Override sourceKey of the groupInstance (used to expand categories on the admin group)
   * @param {boolean}       [options.expandRights=true] Whether to expand the wildcard value on schema access rights
   * @returns {Bluebird<PublicGroup>}
   */
  formatToPublicGroup(groupInstance, options) {
    const group = this.model.instanceToPublicAttributes(groupInstance, options.withDates);
    let publicAccessRights;
    let sourceKey;
    const expandRights = options.expandRights !== false;

    return Promise.resolve().then(() => {
      if (!options.withUserCount) {
        return;
      }

      return Db.models.user.count({
        where: {id: {'$notIn': [Db.models.user.UNIQUE_USER_ID]}},
        include: [{
          model: Db.models.group, where: {id: groupInstance.id}
        }]
      }).then(count => {
        group.userCount = count;
      });
    }).then(() => {
      if (!options.withAccessRights) {
        return group;
      }

      // if we format the admin group, the sourceKey is '*' but we want to format it
      // correctly for a given data-source
      sourceKey = Utils.hasValue(options.sourceKey) ? options.sourceKey : groupInstance.sourceKey;

      // order of the statements is important because the admin group could have accessRights
      // saved in the sql db before the upgrade
      publicAccessRights = this._getBuiltinAccessRights(group);

      if (Utils.noValue(publicAccessRights)) {
        if (Utils.hasValue(groupInstance.accessRights)) {
          publicAccessRights = groupInstance.accessRights.map(right => {
            return Db.models.accessRight.instanceToPublicAttributes(right);
          });
        } else {
          publicAccessRights = [];
        }
      }

      // in LKS we return the access rights for the admin group so the actions of the unique user are populated
      if (!expandRights || !LKE.isEnterprise()) {
        group.accessRights = publicAccessRights;

        return group;
      }

      return Promise.all([
        Data.getSchemaNodeTypeNames(sourceKey),
        Data.getSchemaEdgeTypeNames(sourceKey)
      ]).spread((nodeCategories, edgeTypes) => {
        // we add to the possible node categories the special category "[no_category]"
        const dataSource = Data.resolveSource(sourceKey);

        if (dataSource.features.minNodeCategories === 0) {
          nodeCategories.push(AccessRightDAO.NO_CATEGORY_TARGET_NAME);
        }

        // we partition the access rights in schema related and non
        const [schemaAccessRights, otherAccessRights] = _.partition(publicAccessRights,
          right => right.targetType === Db.models.accessRight.TARGET_TYPES.NODE_CATEGORY ||
          right.targetType === Db.models.accessRight.TARGET_TYPES.EDGE_TYPE);

        group.accessRights = otherAccessRights;

        // all the schema-related access rights will be expanded to the whole schema
        // first we expand the wildcard `*`, then we fill the voids for the missing access rights

        // we partition them again in node category and edge type
        const [nodeAccessRights, edgeAccessRights] = _.partition(schemaAccessRights,
          right => right.targetType === Db.models.accessRight.TARGET_TYPES.NODE_CATEGORY);

        [].push.apply(group.accessRights, this._expandAccessRights(
          Db.models.accessRight.TARGET_TYPES.NODE_CATEGORY, nodeAccessRights, nodeCategories));

        [].push.apply(group.accessRights, this._expandAccessRights(
          Db.models.accessRight.TARGET_TYPES.EDGE_TYPE, edgeAccessRights, edgeTypes));

        return group;
      });
    });
  }

  /**
   * Get multiple group instances by id.
   *
   * @param {number[]} groupIds           IDs of the groups
   * @param {boolean}  [withAccessRights] Whether to include the access rights
   * @returns {Bluebird<GroupInstance[]>}
   */
  getGroupInstances(groupIds, withAccessRights) {
    Utils.check.intArray('groupIds', groupIds);

    const query = {where: {id: groupIds}};
    if (withAccessRights) {
      query.include = [Db.models.accessRight];
    }

    return this.model.findAll(query).then(groups => {
      if (groups.length !== groupIds.length) {
        const missing = _.difference(groupIds, groups.map(g => g.id));
        if (missing.length > 0) {
          return Errors.business('not_found', `Group #${missing[0]} was not found.`, true);
        }
      }

      return groups;
    });
  }

  /**
   * Retrieve a group instance by ID.
   * Return a rejected promise if the group wasn't found or if the sourceKey don't match.
   *
   * @param {number} groupId   ID of the group
   * @param {string} sourceKey Key of the data-source
   * @returns {Bluebird<GroupInstance>}
   * @private
   */
  _getGroupInstance(groupId, sourceKey) {
    Utils.check.posInt('groupId', groupId);

    // check if the source exists and connected
    Data.resolveSource(sourceKey);

    return this.getGroupInstances([groupId], true).then(groupInstances => {
      // unwrap it from the array
      const group = groupInstances[0];

      if (group.sourceKey !== sourceKey) {
        return Errors.access(
          'forbidden',
          `Group #${groupId} doesn't belong to data-source "${sourceKey}".`,
          true
        );
      }
      return group;
    });
  }

  /**
   * Get a group by id.
   *
   * @param {number} groupId   ID of the group
   * @param {string} sourceKey Key of the data-source
   * @returns {Bluebird<PublicGroup>}
   */
  getGroup(groupId, sourceKey) {
    // it's possible to get also the admin group
    if (groupId === this.model.ADMIN_GROUP.id) {
      return this.formatToPublicGroup(this.model.ADMIN_GROUP, {
        withAccessRights: true,
        withUserCount: true,
        withDates: true,
        sourceKey: sourceKey
      });
    }

    return this._getGroupInstance(groupId, sourceKey).then(groupInstance => {
      return this.formatToPublicGroup(groupInstance, {
        withAccessRights: true,
        withUserCount: true,
        withDates: true
      });
    });
  }

  /**
   * Get all groups within a data-source.
   *
   * @param {string}  sourceKey          Key of the data-source
   * @param {boolean} [withAccessRights] Whether to include the access rights
   *
   * @returns {Bluebird<PublicGroup[]>}
   */
  getGroups(sourceKey, withAccessRights) {
    Data.resolveSource(sourceKey);

    const query = {where: {sourceKey: [sourceKey, '*']}};
    if (withAccessRights) {
      query.include = [Db.models.accessRight];
    }

    return this.model.findAll(query).map(groupInstance => {
      return this.formatToPublicGroup(groupInstance, {
        withAccessRights: withAccessRights,
        withUserCount: true,
        withDates: true,
        sourceKey: sourceKey
      });
    });
  }

  /**
   * Create a group.
   *
   * @param {string} groupName Name of the group
   * @param {string} sourceKey Key of the data-source
   * @returns {Bluebird<PublicGroup>}
   */
  createGroup(groupName, sourceKey) {
    if (!LKE.isEnterprise()) {
      return Errors.business('not_implemented', undefined, true);
    }

    // check if the group name is legal
    Utils.check.nonEmpty('groupName', groupName);

    Data.resolveSource(sourceKey);

    return this.model.findOrCreate({where: {name: groupName, sourceKey: sourceKey}})
      .spread((groupInstance, created) => {
        if (!created) {
          return Errors.business('group_exists', 'The group already exists', true);
        }

        return this.formatToPublicGroup(groupInstance, {
          withAccessRights: true,
          withUserCount: true,
          withDates: true
        });
      });
  }

  /**
   * Rename a group.
   *
   * @param {number} groupId   ID of the group
   * @param {string} sourceKey Key of the data-source
   * @param {string} name      New name of the group
   * @returns {Bluebird<PublicGroup>}
   */
  renameGroup(groupId, sourceKey, name) {
    if (!LKE.isEnterprise()) {
      return Errors.business('not_implemented', undefined, true);
    }

    // check if the group name is legal
    Utils.check.nonEmpty('name', name);

    return this._getGroupInstance(groupId, sourceKey).then(groupInstance => {
      if (groupInstance.builtin) {
        return Errors.access('forbidden', 'You can\'t rename a builtin group.', true);
      }

      groupInstance.name = name;

      return groupInstance.save().then(() => {
        UserCache.emptyCache();
        return this.formatToPublicGroup(groupInstance, {
          withAccessRights: true,
          withUserCount: true,
          withDates: true
        });
      });
    });
  }

  /**
   * Delete a group and all the rights linked to that group.
   *
   * @param {number} groupId   ID of the group to delete
   * @param {string} sourceKey Key of the data-source
   * @returns {Bluebird<void>}
   */
  deleteGroup(groupId, sourceKey) {
    if (!LKE.isEnterprise()) {
      return Errors.business('not_implemented', undefined, true);
    }

    return this._getGroupInstance(groupId, sourceKey).then(groupInstance => {
      if (groupInstance.builtin) {
        return Errors.access(
          'forbidden', 'You can\'t delete a builtin group.', true
        );
      }

      // we delete the access rights associated to the group
      return Db.models.accessRight.destroy({where: {groupId: groupId}}).then(() => {
        UserCache.emptyCache();
        return groupInstance.destroy();
      });
    });
  }

  /**
   * Set an array of access rights on a group.
   *
   * @param {number}                  groupId                 ID of the group
   * @param {string}                  sourceKey               Key of the data-source
   * @param {AccessRightAttributes[]} rights                  Access rights to set
   * @param {boolean}                 [validateAgainstSchema] Whether the access rights will be checked to be of node categories or edge types in the schema
   * @returns {Bluebird<void>}
   */
  setRightsOnGroup(groupId, sourceKey, rights, validateAgainstSchema) {
    if (!LKE.isEnterprise()) {
      return Errors.business('not_implemented', undefined, true);
    }

    rights = rights.map(right => {
      right.sourceKey = sourceKey;
      return right;
    });

    Utils.check.array('rights', rights, 1);

    Data.resolveSource(sourceKey);

    // check that all the access rights are legit
    return AccessRightDAO.checkRights(rights, sourceKey, validateAgainstSchema).then(() => {
      return this._getGroupInstance(groupId, sourceKey);
    }).then(groupInstance => {
      if (groupInstance.builtin) {
        return Errors.access(
          'forbidden', 'Cannot set access rights for builtin groups.', true
        );
      }

      return Promise.map(rights, right => {
        // we look for an existing access right with the same scope
        return AccessRightDAO.findMatchingRight(groupInstance.id, right).then(existingRight => {

          // matching access rights exist
          if (Utils.hasValue(existingRight)) {

            // update the existing access right
            existingRight.type = right.type;
            return existingRight.save().return();
          }

          // no matching access right found, create a new one
          return Db.models.accessRight.create(right).then(rightInstance => {
            return groupInstance.addAccessRight(rightInstance);
          }).return();
        });
      }, {concurrency: 1});
    }).then(() => {
      UserCache.emptyCache();
    });
  }

  /**
   * Delete an access right from a group.
   *
   * @param {number} groupId    ID of the group
   * @param {string} sourceKey  Key of the data-source
   * @param {string} targetType Type of the target of the access rights to delete
   * @param {string} targetName Name of the target of the access rights to delete
   * @returns {Bluebird<void>}
   */
  deleteRightOnGroup(groupId, sourceKey, targetType, targetName) {
    if (!LKE.isEnterprise()) {
      return Errors.business('not_implemented', undefined, true);
    }

    // we check if the group exists and the sourceKey is valid
    return this._getGroupInstance(groupId, sourceKey).then(groupInstance => {
      if (groupInstance.builtin) {
        return Errors.access(
          'forbidden', 'Cannot set access rights for builtin groups.', true
        );
      }

      const rightAttributes = {
        targetType,
        targetName,
        sourceKey,
        type: '' // AccessRightDAO::findMatchingRight doesn't care about the type
      };

      return AccessRightDAO.findMatchingRight(groupId, rightAttributes);
    }).then(rightInstance => {
      if (Utils.noValue(rightInstance)) {
        return Errors.business('not_found', 'Access right not found', true);
      }

      return rightInstance.destroy();
    }).then(() => {
      UserCache.emptyCache();
    });
  }
}

module.exports = new GroupDAO();
