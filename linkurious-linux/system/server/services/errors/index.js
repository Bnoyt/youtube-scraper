/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-12-02.
 */
'use strict';

// external libs
const Promise = require('bluebird');

// locals
const LkError = require('./LkError');

class ErrorService {
  /**
   * To access the LkError constructor directly.
   *
   * @type {LkErrorClass}
   */
  get LkError() {
    return LkError;
  }

  /**
   * @param {LkError} error
   * @param {boolean} [promise] Whether to return a rejected promise or just the error
   * @returns {LkError | Bluebird<any>}
   * @private
   */
  _wrap(error, promise) {
  // return a rejected promise
    if (promise === true) {
      return Promise.reject(error);
    }

    // or just the error
    return error;
  }

  /**
   * Create a new ACCESS error.
   *
   * @param {string}  key       Key of the error
   * @param {string}  [message] Human readable description of the error
   * @param {boolean} [promise] Whether to return a rejected promise or just the error
   * @returns {LkError | Bluebird<any>}
   */
  access(key, message, promise) {
    return this._wrap(new LkError(LkError.Type.ACCESS, key, message), promise);
  }

  /**
   * Create a new BUSINESS error.
   *
   * @param {string}  key       Key of the error
   * @param {string}  [message] Human readable description of the error
   * @param {boolean} [promise] Whether to return a rejected promise or just the error
   * @returns {LkError | Bluebird<any>}
   */
  business(key, message, promise) {
    return this._wrap(new LkError(LkError.Type.BUSINESS, key, message), promise);
  }

  /**
   * Create a new TECHNICAL error.
   *
   * @param {string}  key       Key of the error
   * @param {string}  [message] Human readable description of the error
   * @param {boolean} [promise] Whether to return a rejected promise or just the error
   * @returns {LkError | Bluebird<any>}
   */
  technical(key, message, promise) {
    return this._wrap(new LkError(LkError.Type.TECHNICAL, key, message), promise);
  }
}

module.exports = new ErrorService();
