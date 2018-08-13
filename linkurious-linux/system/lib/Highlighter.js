/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-11-14.
 */
'use strict';

// external libs
const _ = require('lodash');

// our libs
const StringUtils = require('./StringUtils');

const MAX_VALUE_LENGTH_BYTE = 10000; // 10 kB
const DIACRITIC_CHARACTERS = /[\u0300-\u036f]/g;
const NOT_A_LETTER = /[\s.:,;?!"'`~@#$€£%^&*(){}[\]_\-+=|\\<>/]/;

class Highlighter {
  /**
   * @param {string} openingTag
   * @param {string} closingTag
   */
  constructor(openingTag, closingTag) {
    this.openingTag = openingTag;
    this.closingTag = closingTag;
  }

  /**
   * Extract the best quotation of size `maxLength` of `text`, a text already highlighted
   * with `openingTag` and `closingTag`.
   *
   * @param {string}              text
   * @param {Map<string, number>} tokenScores
   * @param {number}              [maxLength]
   * @returns {string}
   * @private
   */
  _extractQuotation(text, tokenScores, maxLength) {
    if (maxLength === null || maxLength === undefined || text.length <= maxLength) {
      return text;
    }

    // 1) split the text in words; a matching word (enclosed by tags) is going to be its own word.

    let wordsStr = StringUtils.replaceAll(text, this.openingTag, ' ' + this.openingTag);
    wordsStr = StringUtils.replaceAll(wordsStr, this.closingTag, this.closingTag + ' ');
    const words = wordsStr.replace(/\s+/g, ' ').trim().split(' ');

    // 2) count `charsUpToIndex`: number of characters contained in `word` up to the i-th word included
    // and discover which ones are the indices of the highlighted words (`interestingIndexes`)
    const interestingIndexes = [];
    const charsUpToIndex = [];

    for (let i = 0; i < words.length; ++i) {
      charsUpToIndex[i] = i === 0 ? words[0].length : charsUpToIndex[i - 1] + words[i].length + 1; // +1 for the space char

      const word = words[i];

      // if i'm enclosed by tag
      if (word.indexOf(this.openingTag) === 0 &&
        word.indexOf(this.closingTag) === word.length - this.closingTag.length) {
        interestingIndexes.push(i);

        // fix `charsUpToIndex` s.t. the tag lengths don't influence the number of characters
        charsUpToIndex[i] -= this.openingTag.length + this.closingTag.length;
      }
    }

    // 3) find end given any fixed start
    const end = [];
    for (let i = 0; i < words.length; ++i) {
      const firstIndex = end[i - 1] || i;
      end[i] = end[i - 1] || i;
      for (let y = firstIndex; y < words.length; ++y) {
        if (charsUpToIndex[y] - (i === 0 ? 0 : charsUpToIndex[i - 1] + 1) <= maxLength) {
          end[i] = y + 1; // +1 because we have [start, end)
        } else {
          break; // length can only go increasing
        }
      }
    }

    // 4) find best start
    let bestStart = 0;
    let bestScore = 0; // how many highlighted words (weighted by their matching score) appear in the quotation
    let contextBestScore = 0; // sum of the min distances among the highlighted words and the borders of the window

    // 4.1) compute score of all the cases
    for (let i = 0; i < words.length; ++i) {
      let score = 0;
      let contextScore = 0;

      for (let y = 0; y < interestingIndexes.length; ++y) {
        const index = interestingIndexes[y];
        if (index < i) {
          continue;
        }

        if (index < end[i]) {
          score += tokenScores.get(words[index]);
          contextScore += Math.min(index - i, end[i] - 1 - index);
        } else {
          break; // index can only go increasing
        }
      }

      if (score > bestScore || (score === bestScore && contextScore > contextBestScore)) {
        bestStart = i;
        bestScore = score;
        contextBestScore = contextScore;
      }
    }

    let resultString = words.slice(bestStart, end[bestStart]).join(' ');

    if (bestStart !== 0) {
      resultString = '... ' + resultString;
    }
    if (end[bestStart] !== words.length) {
      resultString = resultString + ' ...';
    }

    return resultString;
  }

  /**
   * NOTE: if a literal is longer than `maxLength` it gets truncated
   * but the indices are of the original token.
   *
   * @example
   * tokenize('hello! WoRlD&(/"£miao5world5f', 2, 4);
   * // -> {hell: [[0, 5]], worl: [[7, 5], [22, 5]], miao: [[17, 4]]}
   *
   * @param {string} text
   * @param {number} minLength
   * @param {number} maxLength
   * @returns {Map<string, number[][]>}
   */
  tokenize(text, minLength, maxLength) {
    if (!_.isString(text)) {
      // not a string, we don't care
      return new Map();
    }

    text = text.normalize('NFD').replace(DIACRITIC_CHARACTERS, '');
    const result = new Map();
    const addResult = (literal, firstIndex, length) => {
      literal = literal.slice(0, maxLength);
      if (literal.length < minLength) {
        return;
      }

      if (!result.has(literal)) {
        result.set(literal, []);
      }
      result.get(literal).push([firstIndex, length]);
    };

    let curLiteral = null;
    let curFirstIndex = null;
    let curLen = null;

    for (let i = 0; i < text.length && i < MAX_VALUE_LENGTH_BYTE; ++i) {
      const c = text[i].toLowerCase();

      if (!c.match(NOT_A_LETTER)) { // is a letter
        if (curLiteral) {
          curLiteral += c;
          curLen++;
        } else {
          curLiteral = c;
          curFirstIndex = i;
          curLen = 1;
        }
      } else {
        if (curLiteral) {
          addResult(curLiteral, curFirstIndex, curLen);
          curLiteral = null;
          curFirstIndex = null;
          curLen = null;
        }
      }
    }

    if (curLiteral) {
      addResult(curLiteral, curFirstIndex, curLen);
    }

    return result;
  }

  /**
   * We convert the normalized similarity called `fuzziness` to a `maxEditDistance`.
   *
   * Return true if:
   * - the edit distance among `a` and `b` is less then `maxEditDistance`
   * OR
   * - `a` is a prefix of `b`
   *
   * @param {string} a
   * @param {string} b
   * @param {number} fuzziness if set to 1 indicates that they have to be equal
   * @returns {number} a number from 0 to 1. 0 indicates a non-match, and 1 an exact match
   * @private
   */
  _fuzzymatch(a, b, fuzziness) {
    const maxEditDistance = Math.round(a.length * (1 - fuzziness));

    // if (a.length === 0) {return b.length;} // `a` and `b` are never empty
    // if (b.length === 0) {return a.length;}

    if (b.indexOf(a) === 0) {
      return 1; // if `a` is a prefix of `b`, it's a match
    }

    if (Math.abs(a.length - b.length) > maxEditDistance) {
      return 0; // if the difference in length is too high is not a match
    }

    const editDistance = this._editDistance(a, b);

    if (editDistance > maxEditDistance) {
      return 0;
    } else {
      return 1 - editDistance / a.length;
    }
  }

  /**
   * Return the edit distance among a and b.
   *
   * Source: https://gist.github.com/andrei-m/982927
   *
   * @param {string} a
   * @param {string} b
   * @returns {number}
   * @private
   */
  _editDistance(a, b) {
    let tmp, i, j, prev, val;

    // swap to save some memory O(min(a,b)) instead of O(a)
    if (a.length > b.length) {
      tmp = a;
      a = b;
      b = tmp;
    }

    const row = new Array(a.length + 1);
    // init the row
    for (i = 0; i <= a.length; i++) {
      row[i] = i;
    }

    // fill in the rest
    for (i = 1; i <= b.length; i++) {
      prev = i;
      for (j = 1; j <= a.length; j++) {
        if (b[i - 1] === a[j - 1]) {
          val = row[j - 1]; // match
        } else {
          val = Math.min(row[j - 1] + 1, // substitution
            Math.min(prev + 1, // insertion
              row[j] + 1)); // deletion
        }
        row[j - 1] = prev;
        prev = val;
      }
      row[a.length] = prev;
    }
    return row[a.length];
  }

  /**
   * @param {object} document
   * @param {string} searchString
   * @param {object} [options]
   * @param {number} [options.maxResultSize=80]
   * @param {number} [options.minTokenLength=2]
   * @param {number} [options.maxTokenLength=7]
   * @param {number} [options.fuzziness=1]
   * @returns {{field: string | null, value: string | null}}
   */
  run(document, searchString, options) {
    options = _.defaults(options,
      {maxResultSize: 80, fuzziness: 1, minTokenLength: 2, maxTokenLength: 7});

    const docTokens = _.mapValues(document,
      value => this.tokenize(value, options.minTokenLength, options.maxTokenLength));
    const searchTokens = Array.from(this.tokenize(searchString,
      options.minTokenLength, options.maxTokenLength).keys());

    const allMatches = new Map();
    for (const field in docTokens) {
      allMatches.set(field, []);
    }

    const matchingTokens = new Set();

    // 1) for each search token
    for (let i = 0; i < searchTokens.length; ++i) {
      const searchToken = searchTokens[i];

      // 2) for each field in the document
      for (const field in docTokens) {
        const fieldTokensMap = docTokens[field];
        const fieldTokensArray = Array.from(fieldTokensMap.keys());

        // 3) for each token in the field
        for (let y = 0; y < fieldTokensArray.length; ++y) {
          const fieldToken = fieldTokensArray[y];

          // 4) look at the cache
          if (!matchingTokens.has(fieldToken)) {

            // 5) check if a match
            const score = this._fuzzymatch(searchToken, fieldToken, options.fuzziness);
            if (score > 0) {
              matchingTokens.add(fieldToken);

              // for every match we have one field containing the position, the length and the score
              // the tokenization provides the first two, we manually add the score
              const fieldMatches = fieldTokensMap.get(fieldToken).map(o => o.concat(score));
              [].push.apply(allMatches.get(field), fieldMatches);
            }
          }
        }
      }
    }

    // 6) pick the best field
    // in `allMatches` we have all the pairs of start/end indices to highlight for each field
    // we choose the field with the highest number of highlights

    let bestField = null;
    let bestFieldScore = 0;

    for (const field in docTokens) {
      const fieldScore = allMatches.get(field).length;
      if (fieldScore > bestFieldScore) {
        bestFieldScore = fieldScore;
        bestField = field;
      }
    }

    // if we didn't highlight anything in the whole document
    if (bestField === null) {
      return {field: null, value: null};
    }

    let bestFieldMatches = allMatches.get(bestField);
    let bestValue = document[bestField];

    // we sort bestFieldMatches by token index
    bestFieldMatches = _.sortBy(bestFieldMatches, o => o[0]);
    let offset = 0;

    const tokenScores = new Map();

    for (let i = 0; i < bestFieldMatches.length; ++i) {
      const openingTagPos = offset + bestFieldMatches[i][0];
      const closingTagPos = openingTagPos + bestFieldMatches[i][1];
      const score = bestFieldMatches[i][2];

      tokenScores.set(
        this.openingTag + bestValue.slice(openingTagPos, closingTagPos) + this.closingTag,
        score
      );

      bestValue = bestValue.slice(0, openingTagPos) + this.openingTag +
        bestValue.slice(openingTagPos, closingTagPos) + this.closingTag +
        bestValue.slice(closingTagPos);

      // every time we add openingTag and closingTag we introduce an offset for all the indices
      offset += this.openingTag.length + this.closingTag.length;
    }

    return {
      field: bestField,
      value: this._extractQuotation(bestValue, tokenScores, options.maxResultSize)
    };
  }
}

module.exports = Highlighter;
