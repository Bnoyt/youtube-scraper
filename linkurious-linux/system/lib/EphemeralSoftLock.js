/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-08-17.
 */
'use strict';

const Promise = require('bluebird');

/**
 * @typedef {object} Lock
 * @property {Date} leaseStart date the lease started
 * @property {object} owner current lock owner
 * @property {number} owner.id current lock owner identifier
 * @property {number} targetId current owned target identifier
 * @property {number} timeLeft number of milliseconds left before the lock expires
 */

/**
 * Ephemeral-Soft-Lock manager that uses Promises. Enables actors to take locks on objects.
 * Locks will expire after `leaseDuration` (hence "ephemeral").
 * Locks can be taken by force. (hence "soft").
 *
 * @param {number} leaseDuration number of seconds before a lock expires
 * @param {function} [customReject] a custom reject method. Called with the current lock value.
 * @param {string[]} ownerFields fields from "owner" objects that will be kept (along with the ID)
 * @constructor
 */
function EphemeralSoftLocks(leaseDuration, customReject, ownerFields) {
  this._leaseDuration = leaseDuration * 1000;
  this._reject = customReject || function(lock) { return Promise.reject(lock); };
  this._locks = {};
  this._ownerFields = ownerFields || [];
}

module.exports = EphemeralSoftLocks;

EphemeralSoftLocks.prototype = {

  /**
   * @param {number} targetId
   * @param {object} newOwner
   * @param {number} newOwner.id
   * @private
   */
  _setLock: function(targetId, newOwner) {
    // copy some fields of the new owner
    const ownerCopy = {id: newOwner.id};
    for (let i = 0, l = this._ownerFields.length; i < l; ++i) {
      ownerCopy[this._ownerFields[i]] = newOwner[this._ownerFields[i]];
    }
    // create the lock object
    this._locks[targetId] = {
      targetId: targetId,
      leaseStart: new Date(),
      owner: ownerCopy
    };
  },

  /**
   * Take a lock on a target object identified by `targetId`.
   * - if the lock is free or expired, `requester` becomes the owner and the lease begins
   * - if the lock is already taken by `requester`, the lease duration is renewed
   * - else (if the lock is already taken by someone else)
   *   - if `force-take` is true, `requester` becomes the owner and the lease begins
   *   - else, we reject with the current the lock
   *
   * @param {number} targetId locked object's id
   * @param {object} requester
   * @param {number} requester.id requester ID, will be compared will current owner ID
   * @param {boolean} [force=false] force-take the lock if it is already taken
   * @returns {Promise.<undefined|Lock>} resolved with undefined or rejected with the current lock
   */
  take: function(targetId, requester, force) {
    /**
     * @type {Lock}
     */
    const lock = this.getLock(targetId);

    if (!lock) {
      // the lock is not currently taken
      this._setLock(targetId, requester);
      return Promise.resolve();

    } else if (lock.owner.id === requester.id) {
      // we own the lock, just renew its lease
      lock.leaseStart = new Date();
      return Promise.resolve();

    } else if (force) {
      // we don't own the lock, but we take it anyway
      this._setLock(targetId, requester);
      return Promise.resolve();

    } else {
      // we don't own the lock,
      return this._reject(lock);
    }

  },

  /**
   * Get the current lock for the target identified by `id` (if it exists).
   *
   * @param {number} targetId
   * @returns {Lock|undefined}
   */
  getLock: function(targetId) {
    const lock = this._locks[targetId];
    if (!lock) { return lock; }
    lock.timeLeft = this._leaseDuration - Date.now() + lock.leaseStart.getTime();
    if (lock.timeLeft <= 0) {
      // if the lock is expired, delete it
      this._locks[targetId] = undefined;
      return undefined;
    }
    return lock;
  }
};
