/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-09-11.
 */
'use strict';

const _ = require('lodash');

const JSDiff = {

  /**
   * Compute the deep difference between values
   *
   * @param {*} reference value
   * @param {*} compared value
   * @param {object} [ignoredPaths]
   * @param {string[]} [stack] internal use in recursion
   * @returns {string[]} human readable differences
   */
  compareValues: function(reference, compared, ignoredPaths, stack) {
    if (!ignoredPaths) { ignoredPaths = {}; }
    if (!stack) { stack = ['root']; }
    let diff = [], i;
    const stackPath = stack.join('.');

    // ignored path ?
    if (ignoredPaths[stack.join('.')]) {
      return diff;
    }

    // strict equality
    if (reference === compared) {
      return diff;
    }

    // null vs other
    if (compared !== null && reference === null) {
      diff.push('"' + stack.join('.') + '": different values (not null, expected null).');
      return diff;
    }

    const referenceType = Array.isArray(reference) ? 'array' : typeof(reference);
    const comparedType = Array.isArray(compared) ? 'array' : typeof(compared);

    // different type
    if (comparedType !== referenceType) {
      diff.push(
        '"' + stack.join('.') + '": ' +
        'different types ("' + comparedType + '", expected "' + referenceType + '").'
      );
      return diff;
    }

    // arrays
    if (comparedType === 'array') {
      if (compared.length !== reference.length) {
        diff.push(
          '"' + stack.join('.') + '": ' +
          'different array lengths (' + compared.length + ', expected ' + reference.length + ').'
        );
        return diff;
      }
      for (i = 0; i < compared.length; ++i) {
        diff = diff.concat(JSDiff.compareValues(
          reference[i],
          compared[i],
          ignoredPaths,
          stack.concat([i + ''])
        ));
      }
      return diff;
    }

    // objects
    if (comparedType === 'object') {
      const referenceKeys = Object.keys(reference);
      const comparedKeys = Object.keys(compared);

      // missing keys (ignore keys in ignoredPath)
      const deletedKeys = _.filter(_.difference(referenceKeys, comparedKeys), deletedKey => {
        // filter ignored paths from deleted keys
        return !ignoredPaths[stackPath + '.' + deletedKey];
      });
      if (deletedKeys.length > 0) {
        diff.push(
          '"' + stack.join('.') + '": ' +
          'missing object properties ("' + deletedKeys.join('", "') + '").'
        );
        return diff;
      }

      // some keys added
      const addedKeys = _.filter(_.difference(comparedKeys, referenceKeys), addedKey => {
        // filter ignored paths from added keys
        return !ignoredPaths[stackPath + '.' + addedKey];
      });
      if (addedKeys.length > 0) {
        diff.push(
          '"' + stack.join('.') + '": ' +
          'added object properties ("' + addedKeys.join('", "') + '").'
        );
        return diff;
      }

      // same key values
      let key;
      for (i = 0; i < referenceKeys.length; ++i) {
        key = referenceKeys[i];
        diff = diff.concat(JSDiff.compareValues(
          reference[key],
          compared[key],
          ignoredPaths,
          stack.concat([key])
        ));
      }
      return diff;
    }

    // neither object nor array
    if (reference !== compared) {
      diff.push('"' + stack.join('.') + '": values do not match.');
      return diff;
    }

    return diff;
  }
};

module.exports = JSDiff;
