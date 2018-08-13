/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-01-30.
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../index');
const Errors = LKE.getErrors();
const Data = LKE.getData();
const Utils = LKE.getUtils();
const Db = LKE.getSqlDb();
const AccessRightDAO = LKE.getAccessRightDAO();
const VisualizationShareDAO = LKE.getVisualizationShareDAO();

// locals
const Actions = require('../access/actions');

class WrappedUser {

  /**
   * Create a WrappedUser starting from a PublicUser.
   *
   * @param {PublicUser} user A user without its private fields, with groups and actions
   * @constructor
   */
  constructor(user) {
    if (Utils.noValue(user)) {
      throw Errors.technical('bug', 'can not wrap a user that is null or undefined');
    }
    this._resultCache = new Map();

    // copy basic fields
    this.id = user.id;
    this.username = user.username;
    this.email = user.email;
    this.source = user.source;
    this.preferences = user.preferences;
    this.actions = user.actions;
    this.accessRights = user.accessRights;
    this.groups = user.groups;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;

    // _builtinAccessRights: quick way to check for access rights on a data-source
    this._builtinAccessRights = {};
    this._admin = false;

    // _visibleSourceKeys: used to see if the user belongs in any group of the data-source
    this._visibleSourceKeys = new Set();

    _.forEach(this.groups, group => {
      this._visibleSourceKeys.add(group.sourceKey);

      // skip the group if not builtin
      if (!group.builtin) {
        return;
      }

      // we infer the access rights from the name of the builtin group
      switch (group.name) {
        case Db.models.group.READ_ONLY_GROUP_NAME:
        case Db.models.group.READ_GROUP_NAME:
          this._builtinAccessRights[group.sourceKey] = 'read';
          break;
        case Db.models.group.READ_AND_EDIT_GROUP_NAME:
          this._builtinAccessRights[group.sourceKey] = 'edit';
          break;
        case Db.models.group.READ_EDIT_AND_DELETE_GROUP_NAME:
        case Db.models.group.SOURCE_MANAGER_GROUP_NAME:
          this._builtinAccessRights[group.sourceKey] = 'write';
          break;
        case Db.models.group.ADMIN_GROUP_NAME:
          this._builtinAccessRights[group.sourceKey] = 'write';
          this._admin = true;
          break;
      }
    });
  }

  /**
   * Return a resolved promise if the user can manage users on at least one data-source or
   * on a particular data-source if `sourceKey` is defined.
   *
   * @param {string} [sourceKey]
   * @returns {Bluebird<void>}
   */
  canManageUsers(sourceKey) {
    return this.hasAction('admin.users', sourceKey).return();
  }

  /**
   * Return true if the user is an admin.
   *
   * @returns {boolean}
   */
  isAdmin() {
    return this._admin;
  }

  /**
   * Return true if the user belongs to at least 1 group of the data-source.
   *
   * @param {string}  sourceKey
   * @param {boolean} [throwIfNot=true] Whether to reject if the condition is not met
   * @returns {boolean}
   * @throws {LkError} if the user doesn't belong to any group of the data-source and `throwIfNot` is true
   */
  canSeeDataSource(sourceKey, throwIfNot) {
    const canSee = this._visibleSourceKeys.has(sourceKey) || this._visibleSourceKeys.has('*');

    if (canSee || throwIfNot === false) { return canSee; }

    throw Errors.access('forbidden', 'You can\'t read data-source ' + sourceKey + '.');
  }

  /**
   * Cache of the result of `promiseFunction` indexed by `key`.
   *
   * @param {string}                    key
   * @param {function(): Bluebird<any>} promiseFunction
   * @returns {Bluebird<any>}
   * @private
   */
  _cached(key, promiseFunction) {
    if (this._resultCache.has(key)) {
      return Promise.resolve(this._resultCache.get(key));
    } else {
      return promiseFunction().then(result => {
        this._resultCache.set(key, result);
        return result;
      });
    }
  }

  // ACCESS RIGHTS

  /**
   * Get the list of target names (access rights) filtered by sourceKey, targetType and type.
   * If `type` is "read", targetNames where "read" is allowed implicitly (e.g. when type is "edit")
   * are returned as well.
   * A returned value of `["*"]` means all the target names.
   * If sourceKey is undefined it means *any* sourceKey. To not confuse with *all* sourceKey.
   *
   * @param {string} [sourceKey] Key of the data-source
   * @param {string} targetType  Type of the target ("edgeType", "nodeCategory", "action", etc.)
   * @param {string} type        Type of the right ("read", "write", etc.)
   * @returns {Bluebird<string[]>} Matching target names
   * @private
   */
  _accessRightTargetNames(sourceKey, targetType, type) {
    if (!LKE.isEnterprise()) {
      return Promise.resolve(['*']);
    }

    if (Utils.noValue(sourceKey) && targetType !== 'action') {
      // Check to avoid that an access control bug leaks data
      // Only targetType "actions" can span over multiple data-sources
      return Errors.technical('bug',
        'sourceKey can\'t be null in _accessRightTargetNames ' +
        'for targetType "nodeCategory", "edgeType" or "alert".',
        true);
    }

    return this._cached('AR/' + sourceKey + '/' + targetType + '/' + type, () => {
      return AccessRightDAO.getRights(this, targetType, type, sourceKey);
    });
  }

  /**
   * Return true if the current user can read everything on the data-source given by sourceKey.
   *
   * @param {string} sourceKey
   * @returns {boolean}
   * @private
   */
  _canReadAll(sourceKey) {
    return this._builtinAccessRights['*'] === 'write' ||
      ['write', 'edit', 'read'].includes(this._builtinAccessRights[sourceKey]);
  }

  /**
   * Return true if the current user can edit everything on the data-source given by sourceKey.
   *
   * @param {string} sourceKey
   * @returns {boolean}
   * @private
   */
  _canEditAll(sourceKey) {
    return this._builtinAccessRights['*'] === 'write' ||
      ['write', 'edit'].includes(this._builtinAccessRights[sourceKey]);
  }

  /**
   * Return true if the current user can write everything on the data-source given by sourceKey.
   *
   * @param {string} sourceKey
   * @returns {boolean}
   * @private
   */
  _canDeleteAll(sourceKey) {
    return this._builtinAccessRights['*'] === 'write' ||
      ['write'].includes(this._builtinAccessRights[sourceKey]);
  }

  // NODE READING

  /**
   * Get a list of the node categories readable by the current user.
   * Return `["*"]` if all categories are readable.
   *
   * @param {string} sourceKey Key of the data-source
   * @returns {Bluebird<string[]>}
   */
  readableCategories(sourceKey) {
    if (this._canReadAll(sourceKey)) { return Promise.resolve(['*']); }

    return this._accessRightTargetNames(sourceKey, 'nodeCategory', 'read');
  }

  /**
   * Check if a list of node categories contains one (or all) readable by the current user.
   *
   * @param {string}   sourceKey         Key of the data-source
   * @param {string[]} nodeCategories    A list of node categories
   * @param {boolean}  [throwIfNot=true] Whether to reject if the condition is not met
   * @param {boolean}  [all]             Must be able to read all categories if true
   * @returns {Bluebird<boolean>}
   * @private
   */
  _hasReadableCategory(sourceKey, nodeCategories, throwIfNot, all) {
    if (this._canReadAll(sourceKey)) { return Promise.resolve(true); }

    // check if the list of node categories contains a least one category readable by the user
    return this.readableCategories(sourceKey).then(readable => {
      if (readable[0] === '*') { return true; }

      if (nodeCategories.length === 0 &&
        readable.includes(AccessRightDAO.NO_CATEGORY_TARGET_NAME)) {
        return true;
      }

      const readableIntersect = _.intersection(nodeCategories, readable);

      const canRead = all
        ? readableIntersect.length === nodeCategories.length
        : readableIntersect.length > 0;

      if (canRead || throwIfNot === false) { return canRead; }

      return Errors.access(
        'read_forbidden',
        `Cannot read node (${all ? 'some non-readable categories' : 'no readable category'}).`,
        true
      );
    });
  }

  /**
   * Check if the given node (by node or id) is readable by the current user.
   *
   * @param {string}          sourceKey         Key of the data-source
   * @param {LkNode | string} nodeOrNodeId      A node or the ID of a node
   * @param {boolean}         [throwIfNot=true] Whether to reject if the condition is not met
   * @returns {Bluebird<boolean>}
   */
  canReadNode(sourceKey, nodeOrNodeId, throwIfNot) {
    if (this._canReadAll(sourceKey)) { return Promise.resolve(true); }

    return this._cached('RN/' + sourceKey + '/' + WrappedUser._itemId(nodeOrNodeId), () => {
      return WrappedUser._resolveNode(sourceKey, nodeOrNodeId).then(node => {
        return this._hasReadableCategory(sourceKey, node.categories, throwIfNot);
      });
    });
  }

  /**
   * Check if the given nodes (by node or id) are readable by the current user.
   *
   * @param {string}                 sourceKey      Key of the data-source
   * @param {Array<LkNode | string>} nodesOrNodeIds Nodes or IDs of nodes
   * @returns {Bluebird<void>} rejected if one node is not readable
   */
  canReadNodes(sourceKey, nodesOrNodeIds) {
    if (this._canReadAll(sourceKey)) { return Promise.resolve(); }

    return Promise.map(
      nodesOrNodeIds,
      nodeOrNodeId => this.canReadNode(sourceKey, nodeOrNodeId)
    ).return();
  }

  // NODE EDITING

  /**
   * Get a list of the node categories editable by the current user.
   * Return `["*"]` if all categories are editable.
   *
   * @param {string} sourceKey Key of the data-source
   * @returns {Bluebird<string[]>}
   */
  editableCategories(sourceKey) {
    if (this._canEditAll(sourceKey)) { return Promise.resolve(['*']); }

    return this._accessRightTargetNames(sourceKey, 'nodeCategory', 'edit');
  }

  /**
   * Check if a list of node categories contains one (or all) editable by the current user.
   *
   * @param {string}   sourceKey         Key of the data-source
   * @param {string[]} nodeCategories    A list of node categories
   * @param {boolean}  [throwIfNot=true] Whether to reject if the condition is not met
   * @param {boolean}  [all]             Must be able to edit all categories if true
   * @returns {Bluebird<boolean>}
   * @private
   */
  _hasEditableCategory(sourceKey, nodeCategories, throwIfNot, all) {
    if (this._canEditAll(sourceKey)) { return Promise.resolve(true); }

    // check if the list of node categories contains a least one category editable by the user
    return this.editableCategories(sourceKey).then(editable => {
      if (editable[0] === '*') { return true; }

      if (nodeCategories.length === 0 &&
        editable.includes(AccessRightDAO.NO_CATEGORY_TARGET_NAME)) {
        return true;
      }

      const editableIntersect = _.intersection(nodeCategories, editable);

      const canEdit = all
        ? editableIntersect.length === nodeCategories.length
        : editableIntersect.length > 0;

      if (canEdit || throwIfNot === false) { return canEdit; }

      return Errors.access(
        'write_forbidden',
        `Cannot edit node (${all ? 'some non-editable categories' : 'no editable category'}).`,
        true
      );
    });
  }

  /**
   * Check if the given node (by node or id) is editable by the current user.
   *
   * @param {string}          sourceKey         Key of the data-source
   * @param {LkNode | string} nodeOrNodeId      A node or the ID of a node
   * @param {boolean}         [throwIfNot=true] Whether to reject if the condition is not met
   * @returns {Bluebird<boolean>}
   */
  canEditNode(sourceKey, nodeOrNodeId, throwIfNot) {
    if (this._canEditAll(sourceKey)) { return Promise.resolve(true); }

    return WrappedUser._resolveNode(sourceKey, nodeOrNodeId).then(node => {
      return this._hasEditableCategory(sourceKey, node.categories, throwIfNot);
    });
  }

  /**
   * Check if a list of node categories are all editable by the current user.
   *
   * @param {string}   sourceKey  Key of the data-source
   * @param {string[]} categories A list of node categories
   * @returns {Bluebird<void>} rejected if one category is not editable
   */
  canEditCategories(sourceKey, categories) {
    return this._hasEditableCategory(sourceKey, categories, true, true).return();
  }

  // NODE DELETING

  /**
   * Get a list of the node categories deletable by the current user.
   * Return `["*"]` if all categories are deletable.
   *
   * @param {string} sourceKey Key of the data-source
   * @returns {Bluebird<string[]>}
   */
  deletableCategories(sourceKey) {
    if (this._canDeleteAll(sourceKey)) { return Promise.resolve(['*']); }

    return this._accessRightTargetNames(sourceKey, 'nodeCategory', 'write');
  }

  /**
   * Check if a list of node categories contains one (or all) deletable by the current user.
   *
   * @param {string}   sourceKey         Key of the data-source
   * @param {string[]} nodeCategories    A list of node categories
   * @param {boolean}  [throwIfNot=true] Whether to reject if the condition is not met
   * @param {boolean}  [all]             Must be able to delete all categories if true
   * @returns {Bluebird<boolean>}
   * @private
   */
  _hasDeletableCategory(sourceKey, nodeCategories, throwIfNot, all) {
    if (this._canDeleteAll(sourceKey)) { return Promise.resolve(true); }

    // check if the list of node categories contains a least one category deletable by the user
    return this.deletableCategories(sourceKey).then(deletable => {
      if (deletable[0] === '*') { return true; }

      if (nodeCategories.length === 0 &&
        deletable.includes(AccessRightDAO.NO_CATEGORY_TARGET_NAME)) {
        return true;
      }

      const deletableIntersect = _.intersection(nodeCategories, deletable);

      const canDelete = all
        ? deletableIntersect.length === nodeCategories.length
        : deletableIntersect.length > 0;

      if (canDelete || throwIfNot === false) { return canDelete; }

      return Errors.access(
        'write_forbidden',
        `Cannot delete node (${all ? 'some non-deletable categories' : 'no deletable category'}).`,
        true
      );
    });
  }

  /**
   * Check if the given node (by node or id) is deletable by the current user.
   *
   * @param {string}          sourceKey         Key of the data-source
   * @param {LkNode | string} nodeOrNodeId      A node or the ID of a node
   * @param {boolean}         [throwIfNot=true] Whether to reject if the condition is not met
   * @returns {Bluebird<boolean>}
   */
  canDeleteNode(sourceKey, nodeOrNodeId, throwIfNot) {
    if (this._canDeleteAll(sourceKey)) { return Promise.resolve(true); }

    return WrappedUser._resolveNode(sourceKey, nodeOrNodeId, true).then(nodeWithEdges => {
      return this._hasDeletableCategory(sourceKey, nodeWithEdges.categories, throwIfNot)
        .then(canDelete => {
          if (!canDelete) { return canDelete; }

          return Promise.map(nodeWithEdges.edges, edge => {
            return this.canDeleteEdge(sourceKey, edge, throwIfNot);
          }).then(canDeleteEdges => {
            for (let i = 0; i < canDeleteEdges.length; ++i) {
              if (!canDeleteEdges[i]) { return false; }
            }

            return true;
          });
        });
    });
  }

  // EDGE READING

  /**
   * Get a list of the edge types readable by the current user.
   * Return `["*"]` if all types are readable.
   *
   * @param {string} sourceKey Key of the data-source
   * @returns {Bluebird<string[]>}
   */
  readableTypes(sourceKey) {
    if (this._canReadAll(sourceKey)) { return Promise.resolve(['*']); }

    return this._accessRightTargetNames(sourceKey, 'edgeType', 'read');
  }

  /**
   * Check if an edge type is readable by the current user.
   *
   * @param {string}  sourceKey         Key of the data-source
   * @param {string}  edgeType          An edge type
   * @param {boolean} [throwIfNot=true] Whether to reject if the condition is not met
   * @returns {Bluebird<boolean>}
   */
  canReadType(sourceKey, edgeType, throwIfNot) {
    if (this._canReadAll(sourceKey)) { return Promise.resolve(true); }

    // check if the type is readable
    return this.readableTypes(sourceKey).then(readableTypes => {
      const canRead = readableTypes[0] === '*' || _.includes(readableTypes, edgeType);

      if (!canRead && throwIfNot !== false) {
        return Errors.access('read_forbidden', 'Cannot read edge.', true);
      }
      return canRead;
    });
  }

  /**
   * Check if the given edge (by edge or id) is readable by the current user.
   *
   * @param {string}          sourceKey         Key of the data-source
   * @param {LkEdge | string} edgeOrEdgeId      An edge or the ID of an edge
   * @param {boolean}         [throwIfNot=true] Whether to reject if the condition is not met
   * @returns {Bluebird<boolean>}
   */
  canReadEdge(sourceKey, edgeOrEdgeId, throwIfNot) {
    if (this._canReadAll(sourceKey)) { return Promise.resolve(true); }

    return this._cached('RE/' + sourceKey + '/' + WrappedUser._itemId(edgeOrEdgeId), () => {
      return WrappedUser._resolveEdge(sourceKey, edgeOrEdgeId).then(edge => {
        return this.canReadType(sourceKey, edge.type, throwIfNot).then(canReadType => {
          if (!canReadType) { return false; }

          // we have to be able to read the source and the target nodes to read the edge
          return this.canReadNode(sourceKey, edge.source, throwIfNot).then(canReadSource => {
            if (!canReadSource) { return false; }

            return this.canReadNode(sourceKey, edge.target, throwIfNot);
          });
        });
      });
    });
  }

  // EDGE EDITING

  /**
   * Get a list of the edge types editable by the current user.
   * Return `["*"]` if all types are editable.
   *
   * @param {string} sourceKey Key of the data-source
   * @returns {Bluebird<string[]>}
   */
  editableTypes(sourceKey) {
    if (this._canEditAll(sourceKey)) { return Promise.resolve(['*']); }

    return this._accessRightTargetNames(sourceKey, 'edgeType', 'edit');
  }

  /**
   * Check if an edge type is editable by the current user.
   *
   * @param {string}  sourceKey         Key of the data-source
   * @param {string}  edgeType          An edge type
   * @param {boolean} [throwIfNot=true] Whether to reject if the condition is not met
   * @returns {Bluebird<boolean>}
   */
  canEditType(sourceKey, edgeType, throwIfNot) {
    if (this._canEditAll(sourceKey)) { return Promise.resolve(true); }

    // check if the type is editable
    return this.editableTypes(sourceKey).then(editableTypes => {
      const canEdit = editableTypes[0] === '*' || _.includes(editableTypes, edgeType);

      if (!canEdit && throwIfNot !== false) {
        return Errors.access('write_forbidden', 'Cannot edit edge.', true);
      }
      return canEdit;
    });
  }

  /**
   * Check if the given edge (by edge or id) is editable by the current user.
   *
   * @param {string}          sourceKey         Key of the data-source
   * @param {LkEdge | string} edgeOrEdgeId      An edge or the ID of an edge
   * @param {boolean}         [throwIfNot=true] Whether to reject if the condition is not met
   * @returns {Bluebird<boolean>}
   */
  canEditEdge(sourceKey, edgeOrEdgeId, throwIfNot) {
    if (this._canEditAll(sourceKey)) { return Promise.resolve(true); }

    return WrappedUser._resolveEdge(sourceKey, edgeOrEdgeId).then(edge => {
      return this.canEditType(sourceKey, edge.type, throwIfNot);
    });
  }

  // EDGE DELETING

  /**
   * Get a list of the edge types deletable by the current user.
   * Return `["*"]` if all types are deletable.
   *
   * @param {string} sourceKey Key of the data-source
   * @returns {Bluebird<string[]>}
   */
  deletableTypes(sourceKey) {
    if (this._canDeleteAll(sourceKey)) { return Promise.resolve(['*']); }

    return this._accessRightTargetNames(sourceKey, 'edgeType', 'write');
  }

  /**
   * Check if an edge type is deletable by the current user.
   *
   * @param {string}  sourceKey         Key of the data-source
   * @param {string}  edgeType          An edge type
   * @param {boolean} [throwIfNot=true] Whether to reject if the condition is not met
   * @returns {Bluebird<boolean>}
   */
  canDeleteType(sourceKey, edgeType, throwIfNot) {
    if (this._canDeleteAll(sourceKey)) { return Promise.resolve(true); }

    // check if the type is deletable
    return this.deletableTypes(sourceKey).then(deletableTypes => {
      const canDelete = deletableTypes[0] === '*' || _.includes(deletableTypes, edgeType);

      if (!canDelete && throwIfNot !== false) {
        return Errors.access('write_forbidden', 'Cannot delete edge.', true);
      }
      return canDelete;
    });
  }

  /**
   * Check if the given edge (by edge or id) is deletable by the current user.
   *
   * @param {string}          sourceKey         Key of the data-source
   * @param {LkEdge | string} edgeOrEdgeId      An edge or the ID of an edge
   * @param {boolean}         [throwIfNot=true] Whether to reject if the condition is not met
   * @returns {Bluebird<boolean>}
   */
  canDeleteEdge(sourceKey, edgeOrEdgeId, throwIfNot) {
    if (this._canDeleteAll(sourceKey)) { return Promise.resolve(true); }

    return WrappedUser._resolveEdge(sourceKey, edgeOrEdgeId).then(edge => {
      return this.canDeleteType(sourceKey, edge.type, throwIfNot);
    });
  }

  // ALERTS READING

  /**
   * Check if the given alert (by id) is readable by the current user.
   *
   * @param {string}  sourceKey         Key of the data-source
   * @param {number}  alertId           ID of the alert
   * @param {boolean} [throwIfNot=true] Whether to reject if the condition is not met
   * @returns {Bluebird<boolean>} rejected if not readable and throwIfNot !== false
   */
  canReadAlert(sourceKey, alertId, throwIfNot) {
    if (this._canReadAll(sourceKey)) { return Promise.resolve(true); }

    return this._accessRightTargetNames(sourceKey, 'alert', 'read').then(readableAlertIds => {
      // user can read all alerts => ok
      if (readableAlertIds[0] === '*') { return true; }

      // alertId (as string) found in readable alert ids => ok
      if (readableAlertIds.indexOf(alertId + '') >= 0) { return true; }

      if (throwIfNot === false) { return false; }
      return Errors.access(
        'read_forbidden', `You don't have read access to Alert #${alertId}.`, true
      );
    });
  }

  // NODE/EDGE CONTENT FILTERING (digest, properties)

  /**
   * Filter an array of nodes to return only the ones readable by the current user.
   *
   * @param {string}   sourceKey Key of the data-source
   * @param {LkNode[]} nodes     Nodes
   * @returns {Bluebird<LkNode[]>}
   */
  filterReadableNodes(sourceKey, nodes) {
    if (this._canReadAll(sourceKey)) { return Promise.resolve(nodes); }

    if (Utils.noValue(nodes) || nodes.length === 0) {
      return Promise.resolve(nodes);
    }

    return Promise.reduce(nodes, (filtered, nodeOrNodeId) => {
      return this.canReadNode(sourceKey, nodeOrNodeId, false).then(readable => {
        if (readable) { filtered.push(nodeOrNodeId); }
        return filtered;
      });
    }, []);
  }

  /**
   * Filter an array of edges to return only the ones readable by the current user.
   * (i.e. edges with TYPE, SOURCE and TARGET readable by current user).
   *
   * @param {string}   sourceKey Key of the data-source
   * @param {LkEdge[]} edges     Edges
   * @returns {Bluebird<LkEdge[]>}
   */
  filterReadableEdges(sourceKey, edges) {
    if (this._canReadAll(sourceKey)) { return Promise.resolve(edges); }

    if (Utils.noValue(edges) || edges.length === 0) {
      return Promise.resolve(edges);
    }

    return Promise.reduce(edges, (filtered, edgeOrEdgeId) => {
      return this.canReadEdge(sourceKey, edgeOrEdgeId, false).then(readable => {
        if (readable) { filtered.push(edgeOrEdgeId); }
        return filtered;
      });
    }, []);
  }

  /**
   * Keep only readable nodes, with readable digest and readable edges.
   * All with readable properties and categories.
   *
   * @param {string}   sourceKey              Key of the data-source
   * @param {LkNode[]} nodes                  A node array
   * @param {boolean}  [keepNodesWithNoEdges] Whether to keep nodes that, after filtering, don't have any edges
   * @param {boolean}  [allOrNothing]         If true, any node or edge getting filtered out causes an empty result
   * @returns {Bluebird<LkNode[]>} nodes with filtered *properties*, *categories*, *digest*, *edges*, *edge properties*
   */
  filterNodesContent(sourceKey, nodes, keepNodesWithNoEdges, allOrNothing) {
    return this.filterReadableNodes(sourceKey, nodes)
      .reduce((filteredContentNodes, node, i, length) => {
        // allOrNothing: if readable nodes count (length) < input node count (nodes.length), return 0 nodes
        if (allOrNothing && length !== nodes.length) { return []; }

        // filter node properties
        node = this.filterNodeProperties(sourceKey, node);

        return this.filterNodeContent(sourceKey, node).then(filteredNode => {
          // allOrNothing: if an edge was removed while filtering, return 0 nodes
          if (allOrNothing && Utils.hasValue(node.edges) &&
            filteredNode.edges.length !== node.edges.length) {
            return [];
          }

          // if a node has no more edges after filtering, skip it
          if ((Utils.noValue(filteredNode.edges) || filteredNode.edges.length === 0) &&
            !keepNodesWithNoEdges) {
            return filteredContentNodes;
          }

          filteredContentNodes.push(filteredNode);
          return filteredContentNodes;
        });
      }, []);
  }

  /**
   * Keep only readable edges with readable properties.
   *
   * @param {string}   sourceKey Key of the data-source
   * @param {LkEdge[]} edges     An edge array
   * @returns {Bluebird<LkEdge[]>}
   */
  filterEdgesContent(sourceKey, edges) {
    return this.filterReadableEdges(sourceKey, edges).map(readableEdge => {
      return this.filterEdgeProperties(sourceKey, readableEdge);
    });
  }

  /**
   * Filter the categories of a node.
   *
   * @param {string} sourceKey Key of the data-source
   * @param {LkNode} node      A node
   * @returns {Bluebird<LkNode>}
   * @private
   */
  _filterNodeCategories(sourceKey, node) {
    if (this._canReadAll(sourceKey)) { return Promise.resolve(node); }

    return this.readableCategories(sourceKey).then(readable => {
      if (readable[0] === '*') { return node; }

      // nothing to do if the categories are not there
      if (Utils.noValue(node.categories)) { return node; }

      node.categories = _.intersection(node.categories, readable);
      return node;
    });
  }

  /**
   * Filter the content of a node.
   *
   * @param {string} sourceKey Key of the data-source
   * @param {LkNode} node      A node
   * @returns {Bluebird<LkNode>} node with filtered *properties*, *categories*, *digest*, *edges* and *edge properties*
   */
  filterNodeContent(sourceKey, node) {
    return this._filterNodeCategories(sourceKey, node).then(filteredNode => {
      node = this.filterNodeProperties(sourceKey, filteredNode);

      if (Utils.noValue(node.edges)) {
        return;
      }

      return this.filterReadableEdges(sourceKey, node.edges).map(filteredEdge => {
        return this.filterEdgeProperties(sourceKey, filteredEdge);
      }).then(filteredEdges => {
        node.edges = filteredEdges;
      });
    }).then(() => {
      return this._filterNodeDigest(sourceKey, node);
    });
  }

  // NODE NEIGHBORHOOD DIGEST FILTERING

  /**
   * Filter the digest of a node.
   *
   * @param {string} sourceKey Key of the data-source
   * @param {LkNode} node      A node
   * @returns {Bluebird<LkNode>}
   * @private
   */
  _filterNodeDigest(sourceKey, node) {
    if (this._canReadAll(sourceKey)) { return Promise.resolve(node); }

    // nothing to do if the digest is not there
    if (!node.statistics || !node.statistics.digest) { return Promise.resolve(node); }

    return this.filterDigest(sourceKey, node.statistics.digest).then(filteredDigest => {
      node.statistics.digest = filteredDigest;
      return node;
    });
  }

  /**
   * Filter the content of an adjacency digest for readable categories and types.
   * Regroup digest items accordingly.
   *
   * @param {string}         sourceKey Key of the data-source
   * @param {LkDigestItem[]} digest    The adjacency digest of a node
   * @returns {Bluebird<LkDigestItem[]>}
   */
  filterDigest(sourceKey, digest) {
    if (this._canReadAll(sourceKey)) { return Promise.resolve(digest); }

    return this._readable(sourceKey).then(readable => {
      return _.chain(digest).filter(entry => {
        if (readable.categoryMap['*'] || entry.nodeCategories.length === 0) {
          // can read all node-categories OR no node categories on entry => check only edge-type
          return readable.typeMap[entry.edgeType];
        } else {
          // filter to readable categories
          entry.nodeCategories = _.intersection(readable.categories, entry.nodeCategories);
          return entry.nodeCategories.length > 0 && readable.typeMap[entry.edgeType];
        }
      }).groupBy(entry => {
        // entry group key
        return entry.edgeType + '/' + entry.nodeCategories;
      }).values().map(entryGroup => {
        const mergedEntry = entryGroup[0];
        for (let i = 1; i < entryGroup.length; ++i) {
          mergedEntry.nodes += entryGroup[i].nodes;
          mergedEntry.edges += entryGroup[i].edges;
        }
        return mergedEntry;
      }).value();
    });
  }

  /**
   * Return the readable categories and types.
   *
   * @param {string} sourceKey Key of the data-source
   * @returns {Bluebird<{categoryMap: object, typeMap: object, categories: string[], types: string[]}>}
   * @private
   */
  _readable(sourceKey) {
    return Promise.join(
      this.readableCategories(sourceKey),
      this.readableTypes(sourceKey),
      (readableCategories, readableTypes) => {
        let i;
        const result = {
          categoryMap: {},
          typeMap: {},
          categories: readableCategories,
          types: readableTypes
        };
        for (i = 0; i < readableCategories.length; ++i) {
          result.categoryMap[readableCategories[i]] = true;
        }
        for (i = 0; i < readableTypes.length; ++i) {
          result.typeMap[readableTypes[i]] = true;
        }

        return result;
      }
    );
  }

  // FOLDER AND VISUALIZATIONS

  /**
   * Throw a business LkError if the current user can't write the given folder.
   *
   * @param {PublicVisualizationFolder} folder
   */
  canWriteFolder(folder) {
    const canWrite = this.id === folder.userId;
    if (!canWrite) { throw Errors.access('write_forbidden'); }
  }

  /**
   * Throw a business LkError if the current user has no right on the visualization.
   *
   * @param {PublicVisualization} visualization
   * @returns {Bluebird<string>} 'owner', 'write' or 'read' (reject if no right exists)
   */
  getVisualizationRight(visualization) {
    if (!LKE.isEnterprise()) { return Promise.resolve('owner'); }

    return VisualizationShareDAO.getRight(visualization, this.id);
  }

  /**
   * Throw a business LkError if the current user doesn't have the needed right on the visualization.
   *
   * @param {PublicVisualization} visualization
   * @param {string}              neededRight
   * @returns {Bluebird<void>}
   */
  hasVisualizationRight(visualization, neededRight) {
    return this.getVisualizationRight(visualization).then(right => {
      if (neededRight === 'read' && !right) {
        return Errors.access('read_forbidden', 'You need read access to this visualization.', true);
      }
      if (neededRight === 'write' && right !== 'write' && right !== 'owner') {
        return Errors.access(
          'write_forbidden', 'You need write or owner access to this visualization.', true
        );
      }
      if (neededRight === 'owner' && right !== 'owner') {
        return Errors.access(
          'write_forbidden', 'You need owner access to this visualization.', true
        );
      }
    });
  }

  // HIDDEN NODE/EDGE PROPERTIES

  /**
   * Throw a business error if some properties of the given node are hidden.
   *
   * @param {string}   sourceKey    Key of the data-source
   * @param {LkNode}   node         A node
   * @param {string[]} [properties] Optional property array for the deleted ones
   * @throws {LkError} if an hidden node property is found in node.data or in properties
   */
  checkHiddenNodeProperties(sourceKey, node, properties) {
    if (!node && !properties) { return; }
    const hiddenProperties = Data.resolveSource(sourceKey).getHiddenNodeProperties();

    // check the optional property array
    if (properties && Array.isArray(properties)) {
      const hiddenKeys = _.intersection(properties, hiddenProperties);
      if (hiddenKeys.length > 0) {
        throw Errors.business(
          'node_property_hidden',
          'Node property "' + hiddenKeys[0] + '" is not accessible (disabled by administrator)'
        );
      }
    }

    // check the node
    let hiddenKey, i;
    for (i = 0; i < hiddenProperties.length; ++i) {
      hiddenKey = hiddenProperties[i];
      if (node.data[hiddenKey] !== undefined) {
        throw Errors.business(
          'node_property_hidden',
          'Node property "' + hiddenKey + '" is not accessible (disabled by administrator)'
        );
      }
    }

  }

  /**
   * Throw a business error if some properties of the given edge are hidden.
   *
   * @param {string}   sourceKey    Key of the data-source
   * @param {LkEdge}   edge         An edge
   * @param {string[]} [properties] Optional property array for the deleted ones
   * @throws {LkError} if an hidden edge property is found in edge.data or in properties
   */
  checkHiddenEdgeProperties(sourceKey, edge, properties) {
    if (!edge || !edge.data) { return; }
    const hiddenProperties = Data.resolveSource(sourceKey).getHiddenEdgeProperties();

    // check the optional property array
    if (properties && Array.isArray(properties)) {
      const hiddenKeys = _.intersection(properties, hiddenProperties);
      if (hiddenKeys.length > 0) {
        throw Errors.access(
          'edge_property_hidden',
          'Edge property "' + hiddenKeys[0] + '" is not accessible (disabled by administrator)'
        );
      }
    }

    for (let i = 0; i < hiddenProperties.length; ++i) {
      const hiddenKey = hiddenProperties[i];
      if (edge.data[hiddenKey] !== undefined) {
        throw Errors.access(
          'edge_property_hidden',
          'Edge property "' + hiddenKey + '" is not accessible (disabled by administrator)'
        );
      }
    }
  }

  /**
   * Check if `properties` is readable in the given source.
   * Always succeed if `properties` is undefined or empty.
   *
   * @param {string}   type       'node' or 'edge'
   * @param {string}   sourceKey  Key of the data-source
   * @param {string[]} properties Properties to check if hidden
   * @returns {Bluebird<void>} rejected if one among `properties` is hidden for the given data-source
   */
  canReadProperties(type, sourceKey, properties) {
    if (properties === undefined || properties.length === 0) { return Promise.resolve(); }
    const hiddenProperties = type === 'node'
      ? Data.resolveSource(sourceKey).getHiddenNodeProperties()
      : Data.resolveSource(sourceKey).getHiddenEdgeProperties();
    const hidden = _.intersection(hiddenProperties, properties);
    if (hidden.length === 0) { return Promise.resolve(); }

    return Errors.access(
      type + '_property_hidden',
      `${_.capitalize(type)} property "${hidden[0]}" is not accessible (disabled by administrator)`,
      true
    );
  }

  /**
   * Check if `property` is readable in the given source.
   * Always succeed if `property` is undefined.
   *
   * @param {string} type      'node' or 'edge'
   * @param {string} sourceKey Key of the data-source
   * @param {string} property  Property to check if hidden
   * @returns {Bluebird<void>} rejected if `property` is hidden for the given data-source
   */
  canReadProperty(type, sourceKey, property) {
    if (property === undefined) { return Promise.resolve(); }
    return this.canReadProperties(type, sourceKey, [property]);
  }

  /**
   * Shorthand method for source.filterNodeProperties.
   *
   * @param {string} sourceKey Key of the data-source
   * @param {LkNode} node      A node
   * @returns {LkNode}
   */
  filterNodeProperties(sourceKey, node) {
    return Data.resolveSource(sourceKey).filterNodeProperties(node);
  }

  /**
   * Shorthand method for source.filterEdgeProperties.
   *
   * @param {string} sourceKey Key of the data-source
   * @param {LkEdge} edge      An edge
   * @returns {LkEdge}
   */
  filterEdgeProperties(sourceKey, edge) {
    return Data.resolveSource(sourceKey).filterEdgeProperties(edge);
  }

  // ACTIONS

  /**
   * Check if the given action (by action name) is doable by the current user.
   * - If sourceKey is `undefined`, it checks that the user can do the action in *at least one* source.
   * - If sourceKey is `"*"`, it checks that the user can do the action in *all* sources.
   *
   * @param {string}  actionName        Name of the action
   * @param {string}  [sourceKey]       Key of the data-source
   * @param {boolean} [throwIfNot=true] Whether to reject if the condition is not met
   * @returns {Bluebird<boolean>}
   */
  hasAction(actionName, sourceKey, throwIfNot) {
    if (!Actions.exists(actionName)) {
      return Errors.technical('bug', 'action "' + actionName + '" doesn\'t exist.', true);
    }

    return this._accessRightTargetNames(sourceKey, 'action', 'do').then(actions => {
      if (actions[0] === '*') { return true; }

      const hasAction = _.includes(actions, actionName);

      if (hasAction || throwIfNot === false) { return hasAction; }

      let dataSourceMsg = '';
      if (sourceKey && sourceKey === '*') {
        dataSourceMsg = ' on all data-sources.';
      } else if (sourceKey) {
        dataSourceMsg = ' on data-source ' + sourceKey + '.';
      } else {
        dataSourceMsg = ' on any data-source.';
      }

      return Errors.access('forbidden',
        'You can\'t do action "' + actionName + '"' + dataSourceMsg, true
      );
    });
  }

  // STATIC HELPERS

  /**
   * If `nodeOrNodeId` is an LkNode resolve immediately with it.
   * If it's an ID, retrieve and resolve the LkNode.
   *
   * @param {string}  sourceKey           Key of the data-source
   * @param {any}     nodeOrNodeId        A node or the ID of a node
   * @param {boolean} [withAdjacentEdges] Whether to retrieve the adjacent edges of the node as well
   * @returns {Bluebird<LkNode>} rejected if not found
   */
  static _resolveNode(sourceKey, nodeOrNodeId, withAdjacentEdges) {
    if (Utils.noValue(nodeOrNodeId)) {
      return Errors.technical('node_not_found', 'Node not found.', true);
    }

    const type = typeof nodeOrNodeId;
    if (type === 'string' || type === 'number' ||
      (withAdjacentEdges && Utils.noValue(nodeOrNodeId.edges))) {
      // was an ID (or needed adjacent edges)
      return Data.getNode({
        id: nodeOrNodeId,
        withEdges: withAdjacentEdges,
        sourceKey: sourceKey
      }).then(node => {
        if (node) { return node; }
        return Errors.business('node_not_found', 'Node #' + nodeOrNodeId + ' was not found.', true);
      });
    } else {
      // was already a node
      return Promise.resolve(nodeOrNodeId);
    }
  }

  /**
   * If `edgeOrEdgeId` is an LkEdge resolve immediately with it.
   * If it's an ID, retrieve and resolve the LkEdge.
   *
   * @param {string} sourceKey    Key of the data-source
   * @param {any}    edgeOrEdgeId An edge or the ID of an edge
   * @returns {Bluebird<LkEdge>} rejected if not found
   */
  static _resolveEdge(sourceKey, edgeOrEdgeId) {
    if (Utils.noValue(edgeOrEdgeId)) {
      return Errors.technical('edge_not_found', 'Edge not found.', true);
    }

    const type = typeof edgeOrEdgeId;
    if (type === 'string' || type === 'number') {
      // was an ID
      return Data.getEdge({id: edgeOrEdgeId, sourceKey: sourceKey}).then(edge => {
        if (edge) { return edge; }
        return Errors.business('edge_not_found', 'Edge #' + edgeOrEdgeId + ' was not found.', true);
      });
    } else {
      // was already an edge
      return Promise.resolve(edgeOrEdgeId);
    }
  }

  /**
   * If `itemOrItemId` is an object return the property `id`.
   * If it's an ID, return it directly.
   *
   * @param {any} itemOrItemId
   * @returns {string}
   */
  static _itemId(itemOrItemId) {
    const type = typeof itemOrItemId;
    if (type === 'string' || type === 'number') {
      return itemOrItemId;
    } else {
      return itemOrItemId.id;
    }
  }
}

module.exports = WrappedUser;
