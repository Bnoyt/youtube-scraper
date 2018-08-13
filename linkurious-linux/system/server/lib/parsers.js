/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-10-06.
 *
 * File: parsers.js
 * Description : This is a library of parsing functions used to retrieve
 *               custom object representations from String to JS Objects
 */
'use strict';

/**
 * Function that parses a string representing an array of parameters in a URL
 * and returns a JS array of Objects. The array represents a filter, [0] -
 * object property to filter on - [1] - value used to filter the
 * property.
 *
 * If there is no urlParameter, it returns an empty array
 *
 * @param {string} urlParameter Representing a filter: "name::bob|age::32"
 * @returns {Array} Actual JS Array object [['name', 'bob'],['age','32']]
 */
const parseUrlFilter = function(urlParameter) {

  if (!urlParameter || urlParameter.indexOf('::') === -1) {
    return [];
  }

  if (urlParameter.indexOf('|') !== -1) {
    const paramArray = urlParameter.split('|');
    return paramArray.map(keyValuePair => {
      return keyValuePair.split('::');
    });

  } else {
    return [urlParameter.split('::')];
  }
};

exports.parseUrlFilter = parseUrlFilter;
