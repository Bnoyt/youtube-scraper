/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-03-03.
 */
'use strict';

class Serializable {
  /**
   * @param {string[]} fields
   */
  constructor(fields) {
    this.fields = fields;
  }

  /**
   * return {object} a safe JSON-serializable object
   */
  serialize() {
    const s = {};
    for (let i = 0; i < this.fields.length; ++i) {
      const fieldKey = this.fields[i];
      s[fieldKey] = this[fieldKey];
      this.checkSerializable(fieldKey, s[fieldKey]);
    }
    return s;
  }

  /**
   * @param  {string} path
   * @param {*} value
   */
  checkSerializable(path, value) {
    if (value == null || value == undefined) { return; }
    if (typeof value === 'boolean') { return; }
    if (typeof value === 'number') { return; }
    if (typeof value === 'string') { return; }
    if (typeof value === 'object') {
      Object.keys(value).forEach(key => {
        this.checkSerializable(path + '.' + key, value[key]);
      });
      return;
    }
    throw new Error(`Non-serializable field at "${path}".`);
  }
}

module.exports = Serializable;
