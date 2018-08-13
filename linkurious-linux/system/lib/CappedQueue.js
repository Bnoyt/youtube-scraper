/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-12-05.
 */
'use strict';

class CappedQueue {

  /**
   * A queue with a given `maxLength`.
   *
   * @param {number} maxLength
   * @constructor
   */
  constructor(maxLength) {
    this._maxLength = maxLength;
    this._set = new Set(); // The queue is implemented with a set (it guarantees insertion order)
  }

  /**
   * Add a new value in the queue.
   * If the max size is reached, remove the last element from the queue and return it.
   * Otherwise, return `undefined`.
   *
   * @param {any} value
   * @returns {any | undefined}
   */
  add(value) {
    // 1) we put the value always in front
    this._set.delete(value);
    this._set.add(value);

    // 2) we remove away the last element if `maxLength` is reached
    if (this._set.size > this._maxLength) {
      const removedValue = this._set.values().next().value;
      this._set.delete(removedValue);

      return removedValue;
    }
  }

  /**
   * Return the first value to enter the queue.
   *
   * @returns {any | undefined}
   */
  front() {
    return this._set.values().next().value;
  }

  /**
   * Move a value from anywhere in the queue to the last position.
   *
   * @param {any} value
   * @returns {boolean}
   */
  update(value) {
    if (this._set.has(value)) {
      this._set.delete(value);
      this._set.add(value);
      return true;
    }
    return false;
  }

  /**
   * @param {any} value
   */
  delete(value) {
    this._set.delete(value);
  }

  clear() {
    this._set.clear();
  }

  isFull() {
    return this._set.size === this._maxLength;
  }
}

module.exports = CappedQueue;
