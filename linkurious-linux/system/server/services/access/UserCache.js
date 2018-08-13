/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-06-16.
 */
'use strict';

// external libs
const Promise = require('bluebird');
const _ = require('lodash');

// services
const LKE = require('../index');
const Utils = LKE.getUtils();

// our libs
const CappedQueue = require('../../../lib/CappedQueue');

const USER_CACHE_MAX_SIZE = 100;

class UserCache {
  /**
   * @param {number} maxSize
   * @constructor
   */
  constructor(maxSize) {
    this._maxSize = maxSize;
  }

  init() {
    this._userDAO = LKE.getUserDAO();
    this.emptyCache();
  }

  /**
   * Returns a clone of the resolved publicUser
   *
   * @param {number} userId
   * @returns {Bluebird<PublicUser>}
   */
  getUser(userId) {
    if (this._map.has(userId)) {
      return Promise.resolve(_.cloneDeep(this._map.get(userId)));
    }

    return this._userDAO.getUser(userId, true).then(publicUser => {
      this._map.set(userId, publicUser);

      const userIdToRemove = this._queue.add(userId);
      if (Utils.hasValue(userIdToRemove)) {
        this._map.delete(userIdToRemove);
      }

      return _.cloneDeep(publicUser);
    });
  }

  /**
   * Remove all the users from the cache.
   * This should be called on:
   * - rename group
   * - set access right on a group
   * - delete access right from a group
   * - delete group
   */
  emptyCache() {
    // Queue of user ids to limit the number of users
    this._queue = new CappedQueue(this._maxSize);

    /**@type {Map<number, PublicUser>}*/
    this._map = new Map();
  }

  /**
   * Remove a given user from the cache.
   * This should be called on:
   * - update user
   * - delete user
   * - upgrade user from local to external
   *
   * @param {number} userId
   */
  removeFromCache(userId) {
    if (Utils.hasValue(userId)) {
      this._map.delete(userId);
      this._queue.delete(userId);
    }
  }
}

module.exports = new UserCache(USER_CACHE_MAX_SIZE);
