/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-06-29.
 */
'use strict';

// external libs
const Promise = require('bluebird');

/**
 * @example
 * var semaphore = new Semaphore(1);
 * var atomicComposedAction = function(param) {
 *   return semaphore.acquire().then(() => {
 *     return doFirstAction().then(() => {
 *       return doSecondAction(param);
 *     }).then((result) => {
 *       semaphore.release();
 *       return result;
 *     });
 *   });
 * }
 */
class Semaphore {

  /**
   * Create a Semaphore with `size` slots.
   *
   * @param {number} [size=1] Number of slots in the semaphore
   * @constructor Semaphore
   */
  constructor(size) {
    this.size = size || 1;
    this.queue = [];
    this.active = 0;
  }

  /**
   * Acquire a semaphore slot.
   *
   * @returns {Bluebird<void>} resolved when the slot is available
   */
  acquire() {
    if (this.active + 1 > this.size) {
      return new Promise(resolve => {
        this.queue.push(resolve);
      });
    } else {
      this.active += 1;
      return Promise.resolve();
    }
  }

  /**
   * Release a semaphore slot.
   */
  release() {
    if (this.queue.length > 0) {
      // loose one active, gain one active: no change
      process.nextTick(this.queue.shift());
    } else if (this.active > 0) {
      this.active -= 1;
    }
  }
}

module.exports = Semaphore;
