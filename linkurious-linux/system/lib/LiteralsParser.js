/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-06-29.
 */
'use strict';

/**
 * A generic parser to cleanly remove/retrieve string literals from strings, while respecting escaping.
 *
 * @param {string[]} delimiters the string literal delimiters (e.g. [', "]
 * @param {string} escapeChar the escape character (e.g. \)
 * @constructor LiteralsParser
 */
function LiteralsParser(delimiters, escapeChar) {
  // index the delimiters
  this.delimiters = {};
  delimiters.forEach(d => {
    this.delimiters[d] = true;
  });

  this.escapeChar = escapeChar;

  // don't allow for any state persistence, this class must be purely static
  Object.freeze(this);
}

/**
 * Remove string literals
 *
 * @param {string} s a string to remove literals from
 * @returns {string} a copy of the input with string literals removed
 */
LiteralsParser.prototype.removeLiterals = function(s) {
  const result = [];
  let afterEscape = false, inLiteral = null, char;

  for (let i = 0, l = s.length; i < l; ++i) {
    char = s[i];

    if (afterEscape) {
      // previous char was an escape char
      if (inLiteral === null) { result.push(char); }

      afterEscape = false;
      continue;
    }

    // not after an escape char
    if (char === this.escapeChar) {
      // current char is a escape char
      if (inLiteral === null) { result.push(char); }

      afterEscape = true;
      continue;
    }

    // not at or after an escape char
    if (this.delimiters[char]) {
      // current char is a delimiter

      if (inLiteral === null) {
        // not yet in a literal? we are now
        inLiteral = char;
        continue;
      } else if (inLiteral === char) {
        // already in a literal that started with the same char we are on? end of literal
        inLiteral = null;
        continue;
      }
    }

    // at a normal char
    if (inLiteral === null) { result.push(char); }
  }
  return result.join('');
};

/**
 * Get all string literals
 *
 * @param {string} s a string to get the literals from
 * @returns {string[]} literals
 */
LiteralsParser.prototype.retrieveAllLiterals = function(s) {
  let currentLiteral = null;
  const result = [];
  let afterEscape = false;
  let currentDelimiter = null;
  for (let i = 0, l = s.length; i < l; ++i) {
    const char = s[i];

    // if i'm not in a literal and the char isn't a delimiter
    if (currentLiteral === null && !this.delimiters[char]) {
      // do nothing
      continue;
    }

    // if i'm not in a literal and the char is a delimiter
    if (currentLiteral === null && this.delimiters[char]) {
      // enter in a literal
      currentLiteral = '';
      currentDelimiter = char;
      continue;
    }

    // If I'm here, I'm in a literal

    // Previous char was an escape character
    if (afterEscape) {
      // char was escaped, so it's part of the literal
      currentLiteral += char;
      afterEscape = false;
      continue;
    }

    // If I'm here, I'm in a literal and the previous character wasn't an escape

    // Current character is the same delimiter that started the literal
    if (currentDelimiter === char) {
      result.push(currentLiteral);
      currentDelimiter = null;
      currentLiteral = null;
      continue;
    }

    // Current character is an escape
    if (char === this.escapeChar) {
      if (currentLiteral !== null) {
        afterEscape = true;
      }
      continue;
    }

    currentLiteral += char;
  }
  return result;
};

module.exports = LiteralsParser;
