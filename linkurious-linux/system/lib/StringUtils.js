/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-12-09.
 */
'use strict';

// external libs
const _ = require('lodash');

const NOT_A_LETTER = /[\s.:,;?!"'`~@#$€£%^&*(){}[\]_\-+=|\\<>/]+/;

class StringUtils {
  /**
   * Tokenize `text`, lowercase and return only unique tokens.
   *
   * @param {string} text
   * @returns {string[]}
   */
  uniqTokenize(text) {
    return _.filter(_.uniq(text.toLowerCase().split(NOT_A_LETTER)), t => t.length > 0);
  }

  /**
   * Replace all occurrences of `a` in `text` with `b`.
   *
   * @param {string} text
   * @param {string} a
   * @param {string} b
   *
   * @returns {string}
   */
  replaceAll(text, a, b) {
    return text.split(a).join(b);
  }
}

module.exports = new StringUtils();
