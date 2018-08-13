/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-03-03.
 */
'use strict';

class Task {
  /**
   * @param {string} name
   * @param {string[]} parameterNames
   * @param {function} handler
   */
  constructor(name, parameterNames, handler) {
    this.name = name;
    this.parameterNames = parameterNames;
    this.handler = handler;
  }

  /**
   * @param {object.<string, *>} parameters
   */
  checkParameters(parameters) {
    this.parameterNames.forEach(parameterName => {
      const value = parameters[parameterName];
      if (value === undefined) {
        throw new Error(`Task "${this.name}": missing parameter "${parameterName}".`);
      }
    });
  }
}

module.exports = Task;
