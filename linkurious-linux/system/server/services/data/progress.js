/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-02-11.
 */
'use strict';

// services
const LKE = require('../index');
const Utils = LKE.getUtils();

class Progress {
  /**
   * @param {CustomLogger} logger
   * @param {string}       [prefix='']        Used to prefix all log messages
   * @param {number}       [progressStep=0.5] Minimum progress difference (in percentage) between two log messages
   * @constructor
   */
  constructor(logger, prefix, progressStep) {
    this._logger = logger;
    this._prefix = prefix || '';
    this._progressStep = progressStep || 0.5;

    // total number of items to index
    this._totalItems = 0;
    // indexation start time
    this._startTime = 0;
    // type of items at latest batch (for logging purpose)
    this._label = 'item';
    // initial number of items already indexed
    this._initialOffset = 0;
    // progress in percentage
    this._progress = 0;
    // estimated time left in milliseconds
    this._timeLeft = 0;
    // total number of indexed items
    this._totalDone = 0;
    // duration in milliseconds
    this._totalDuration = 0;
    // items indexed per milliseconds in average
    this._averageSpeed = 0;
    // total number of items left to be indexed
    this._itemsLeft = 0;
  }

  /**
   * Initialize a progress instance.
   *
   * @param {number} totalItems
   */
  start(totalItems) {
    this._totalItems = totalItems;
    this._startTime = Date.now();
  }

  /**
   * Return a string representing the average indexation speed.
   *
   * @returns {string}
   */
  getRate() {
    return (1000 * this._averageSpeed).toFixed(0) + ' ' + this._label + 's/s';
  }

  /**
   * Return a string representing the percentage of the indexation.
   *
   * @returns {string}
   */
  getPercent() {
    return this._progress.toFixed(2);
  }

  /**
   * Return a string representing the time left for the indexation to finish.
   *
   * @returns {string}
   */
  getTimeLeft() {
    return Utils.humanDuration(this._timeLeft);
  }

  /**
   * Return the count of already indexed items.
   *
   * @returns {number}
   */
  getTotalIndexedItems() {
    return this._totalDone + this._initialOffset;
  }

  /**
   * Log an end message.
   */
  end() {
    this._log(
      `Done: ${this._totalDone} items in ${Utils.humanDuration(this._totalDuration)} ` +
      `(average speed: ${(1000 * this._averageSpeed).toFixed(0)} items/s)`
    );
  }

  /**
   * Add an array of items (or a value representing their cardinality) to the progress,
   * without counting them for the average speed.
   *
   * @param {string} label
   * @param {number | Array<any>} items
   */
  setInitialOffset(label, items) {
    let batchLength;
    if (Array.isArray(items)) {
      batchLength = items.length;
    } else {
      batchLength = /**@type {number}*/ (items);
    }

    this._totalDone += batchLength;
    this._initialOffset += batchLength;
  }

  /**
   * Add an array of items (or a value representing their cardinality) to the progress.
   *
   * @param {string} label
   * @param {number | Array<any>} items
   */
  add(label, items) {
    let batchLength;
    if (Array.isArray(items)) {
      batchLength = items.length;
    } else {
      batchLength = /**@type {number}*/ (items);
    }

    const prevProgress = this._progress;

    this._label = label;

    this._totalDone += batchLength;
    this._totalDuration = Date.now() - this._startTime;
    this._averageSpeed = (this._totalDone - this._initialOffset) / this._totalDuration;
    this._itemsLeft = Math.max(0, this._totalItems - this._totalDone);
    this._progress = 100 * this._totalDone / this._totalItems;
    this._timeLeft = this._itemsLeft / this._averageSpeed;

    if (this._progress + this._progressStep > prevProgress) {
      this._log(
        `[${this.getPercent()}%]` +
        ` Already indexed ${this._totalDone} items in ${Utils.humanDuration(this._totalDuration)}` +
        ` at ${this.getRate()} (average).` +
        ` Time left: ${this.getTimeLeft()}`
      );
    }
  }

  /**
   * @param {any} message
   * @private
   */
  _log(message) {
    this._logger.info(this._prefix + ' ' + message);
  }
}

module.exports = Progress;
