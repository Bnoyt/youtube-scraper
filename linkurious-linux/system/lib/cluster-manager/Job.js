/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-03-03.
 */
'use strict';

const Serializable = require('./Serializable');

class Job extends Serializable {
  /**
   * @param {string} taskName
   * @param {object} parameters
   * @param {function} resolveCallback
   * @param {function} rejectCallback
   */
  constructor(taskName, parameters, resolveCallback, rejectCallback) {
    super(['id', 'taskName', 'parameters']);
    this.taskName = taskName;
    this.parameters = parameters;
    this.resvolveCallback = resolveCallback;
    this.rejectCallback = rejectCallback;
    this.id = Math.floor(Math.random() * 1000000);
    this.create = Date.now();
    this.start = null;
    this.end = null;
  }

  get waitTime() {
    return this.start - this.create;
  }

  get runTime() {
    return this.end - this.start;
  }

  serialize() {
    try {
      return super.serialize();
    } catch(error) {
      throw new Error(`Task "${this.name}": ` + error.message);
    }
  }
}

module.exports = Job;
