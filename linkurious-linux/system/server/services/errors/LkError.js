/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-11-25.
 */
'use strict';

const ErrorType = {
  /**
   * A forbidden action (for business reasons)
   * e.g.:
   * - user A hasn't right to do action B
   */
  ACCESS: 'ACCESS',

  /**
   * An invalid action (for business reasons)
   * e.g.:
   * - delete a node with an unknown node ID
   */
  BUSINESS: 'BUSINESS',

  /**
   * Non-business internal errors that we cannot solve
   * e.g.:
   * - the SQLite database file is locked
   * - cannot listen on port 3000: already used
   */
  TECHNICAL: 'TECHNICAL'
};

class LkError extends Error {
  /**
   * @param {string} type      Type of the error
   * @param {string} key       Key of the error
   * @param {string} [message] Human readable description of the error
   */
  constructor(type, key, message) {
    super((message === null || message === undefined) ? '' : message);

    this.type = type;
    this.key = key;

    if (!LkError.isTechnicalType(type)) {
      this.stack = undefined;
    }
  }

  /**
   * @type {{ACCESS: string, BUSINESS: string, TECHNICAL: string}}
   */
  static get Type() {
    return ErrorType;
  }

  /**
   * @param {string} type
   * @returns {boolean} true if `type` equals `LkError.Type.ACCESS`
   */
  static isAccessType(type) {
    return type === LkError.Type.ACCESS;
  }

  /**
   * @param {string} type
   * @returns {boolean} true if `type` equals `LkError.Type.BUSINESS`
   */
  static isBusinessType(type) {
    return type === LkError.Type.BUSINESS;
  }

  /**
   * @param {string} type
   * @returns {boolean} true if `type` equals `LkError.Type.TECHNICAL`
   */
  static isTechnicalType(type) {
    return type === LkError.Type.TECHNICAL;
  }

  /**
   * @returns {boolean} true if `type` equals `LkError.Type.ACCESS`
   */
  isAccess() {
    return LkError.isAccessType(this.type);
  }

  /**
   * @returns {boolean} true if `type` equals `LkError.Type.BUSINESS`
   */
  isBusiness() {
    return LkError.isBusinessType(this.type);
  }

  /**
   * @returns {boolean} true if `type` equals `LkError.Type.TECHNICAL`
   */
  isTechnical() {
    return LkError.isTechnicalType(this.type);
  }
}

module.exports = LkError;
