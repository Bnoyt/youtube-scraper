/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-18.
 */
'use strict';

// external libs
const _ = require('lodash');

class GremlinUtils {

  /**
   * Quote an ID or a property value to be inserted in a Gremlin expression.
   *
   * @param {any}     v
   * @param {boolean} [arrayAsArgs] If true, an array is not going to be wrapped in square brackets
   * @returns {string}
   */
  quote(v, arrayAsArgs) {
    if (v === null || v === undefined) {
      return 'null';
    }

    if (Array.isArray(v)) {
      return (!arrayAsArgs ? '[' : '') +
        v.map(v => this.quote(v)).join(', ') +
        (!arrayAsArgs ? ']' : '');
    }

    if (typeof v === 'object') {
      return '[' + _.map(v, (sv, k) => this.quote(k) + ': ' + this.quote(sv)).join(', ') + ']';
    }

    if (typeof v === 'number') {
      if (Number.isInteger(v)) {
        return v + 'L';
      }
      return v + 'D';
    }

    return JSON.stringify(v);
  }
}

module.exports = new GremlinUtils();
