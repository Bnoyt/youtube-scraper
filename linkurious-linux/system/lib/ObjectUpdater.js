/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-06-30.
 */
'use strict';

const SemVer = require('./SemVer');

const SEMVER_RE = /\d+\.\d+\.\d+/;

const PATH_RE = /^([a-zA-Z0-9_]+|\*)(\.([a-zA-Z0-9_]+|\*))*$/;

/**
 * A group of changes to an object's structure, indicating a version.
 *
 * @typedef {object} ObjectUpdate
 * @property {string} version       - target Linkurious version for this update (SemVer)
 * @property {string} [comment]     - a comment describing the update
 * @property {ObjectChange[]} changes - the list of changes for this version
 */

/**
 * An atomic change to an Object's structure.
 *
 * @typedef {object} ObjectChange
 * @property {string} type     - `"create"`, `"rename"` or `"delete"`
 * @property {string} path     - the dot-separated path of the change, can contains wildcards ('*')
 * @property {*} [value]       - required when `type` is `"create"`
 * @property {string} [newKey] - required when `type` is `"rename"`
 */

/**
 * @param {object} object         - an object to update
 * @param {string} object.version - the object version (in SemVer format)
 * @constructor ObjectUpdater
 */
function ObjectUpdater(object) {
  this.object = object;
}

/**
 * Static ObjectUpdate-array validator
 *
 * @param {ObjectUpdate[]} updates
 */
ObjectUpdater.validate = function(updates) {
  if (!Array.isArray(updates)) {
    throw new Error('updates must be an array');
  }
  for (let i = 0, l = updates.length; i < l; ++i) {
    const prefix = 'updates[' + i + ']';
    _validateUpdate(updates[i], prefix);
  }
};

ObjectUpdater.prototype = {

  compareSemVer: SemVer.compare,

  /**
   * 1) Finds out `currentVersion`
   * 2) Selects relevant `updates` to update from `currentVersion` to `targetVersion` (sorted)
   * 3) Applies updates (each update sets the current version)
   *
   * @param {object[]} updates a list of updates
   * @param {object[]} updates.version the target version of an update
   * @param {string} targetVersion the version we want to migrate to
   * @returns {ObjectUpdate[]} applied changes list of applies updates
   */
  applyUpdates: function(updates, targetVersion) {
    // 1) get current version
    const currentVersion = this.object.version;

    // 2) select relevant updates
    const semVerComparator = this.compareSemVer;
    const applied = updates.filter(update => {
      // currentVersion < update.version <= target.version
      return semVerComparator(update.version, currentVersion) > 0 &&
             semVerComparator(update.version, targetVersion) <= 0;
    }).sort((u1, u2) => {
      return semVerComparator(u1.version, u2.version);
    });

    // 3) apply relevant updates
    applied.forEach(this.applyUpdate.bind(this));
    return applied;
  },

  /**
   * Applies an update to the current object, updates the `version` field of the object.
   *
   * @param {ObjectUpdate} update
   */
  applyUpdate: function(update) {
    //console.log('object update: '+ this.object.version + ' -> ' + update.version);
    for (let i = 0, l = update.changes.length; i < l; ++i) {
      this.applyChange(update.changes[i]);
    }
    this.object.version = update.version;
  },

  /**
   * Applies a single change to the current object
   *
   * @param {ObjectChange} change
   */
  applyChange: function(change) {
    const path = change.path.split('.');
    const key = path.shift();
    _applyChange(change, this.object, key, path);
  }

};

// private functions

/**
 * @param {ObjectUpdate} update - an update to validate
 * @param {string} prefix       - error prefix
 * @throws {Error} on validation error
 */
function _validateUpdate(update, prefix) {
  if (typeof update !== 'object') {
    throw new Error(prefix + ' is not an object');
  }
  if (typeof update.version !== 'string') {
    throw new Error(prefix + '.version is not a string');
  }
  if (!update.version.match(SEMVER_RE)) {
    throw new Error(prefix + '.version must be a SemVer (x.y.z)');
  }
  if (update.comment !== undefined && typeof update.comment !== 'string') {
    throw new Error(prefix + '.comment is not a string (optional field)');
  }
  if (!Array.isArray(update.changes)) {
    throw new Error(prefix + '.changes must be an array');
  }
  for (let j = 0, l = update.changes; j < l; ++j) {
    _validateChange(update.changes[j], prefix + '.changes[' + j + ']');
  }
}

/**
 * @param {ObjectChange} change - a change to validate
 * @param {string} prefix       - error prefix
 * @throws {Error} on validation error
 */
function _validateChange(change, prefix) {
  if (typeof change !== 'object') {
    throw new Error(prefix + ' is not an object');
  }
  if (typeof change.type !== 'string') {
    throw new Error(prefix + '.type is not a string');
  }
  if (change.type !== 'create' && change.type !== 'rename' && change.type !== 'delete') {
    throw new Error(prefix + '.type must be one of ("create", "rename", "delete")');
  }
  if (typeof change.path !== 'string') {
    throw new Error(prefix + '.path is not a string');
  }
  if (!PATH_RE.test(change.path)) {
    throw new Error(prefix + '.path does not match expected pattern');
  }
  if (change.type === 'create' && change.value === undefined) {
    throw new Error(prefix + '.value is not defined (type: "create")');
  }
  if (change.type === 'rename' && typeof change.newKey !== 'string') {
    throw new Error(prefix + '.newKey is not a string (type: "rename")');
  }
}

/**
 * @param {object} change
 * @param {object} root
 * @param {string|number} key
 * @param {string[]} path
 * @private
 */
function _applyChange(change, root, key, path) {
  path = path.slice(0);

  if (typeof root !== 'object') {
    // cannot set a key on something else than an object
    return;
  }

  if (key === '*') {
    if (Array.isArray(root)) {
      // apply change to all items of the array
      for (let ia = 0, la = root.length; ia < la; ++ia) {
        _applyChange(change, root, ia, path);
      }
    } else {
      // apply change to all properties of the object
      const keys = Object.keys(root);
      for (let io = 0, lo = keys.length; io < lo; ++io) {
        _applyChange(change, root, keys[io], path);
      }
    }
  } else if (path.length === 0) {

    if (Array.isArray(root) && typeof(key) !== 'number' && isNaN(parseInt(key, 10))) {
      // setting a non-number key on an array
      return;
    }

    if (change.type === 'create') {
      // will overwrite any existing values
      root[key] = change.value;
    } else if (change.type === 'delete') {
      // will ignore missing values
      root[key] = undefined;
    } else if (change.type === 'rename') {
      // will have no effect for missing values
      root[change.newKey] = root[key];
      root[key] = undefined;
    }
  } else {
    const nextKey = path.shift();
    _applyChange(change, root[key], nextKey, path);
  }
}

module.exports = ObjectUpdater;
