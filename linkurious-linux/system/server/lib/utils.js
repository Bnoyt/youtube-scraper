/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-11-25.
 */
'use strict';

// internal libs
const crypto = require('crypto');
const stream = require('stream');

// external libs
const _ = require('lodash');
const clarinet = require('clarinet');
const Promise = require('bluebird');
const _has = require('lodash/has');
const _uniq = require('lodash/uniq');
const _cloneDeep = require('lodash/cloneDeep');
const randomstring = require('randomstring');
const Valcheck = require('valcheck');
const CronParser = require('cron-parser');

// our libs
const LiteralsParser = require('../../lib/LiteralsParser');
const SemVer = require('../../lib/SemVer');
const Semaphore = require('../../lib/Semaphore');
const JSDiff = require('../../lib/JSDiff');

// services
const Errors = require('../services/errors');

const ALPHABET_LK_CUSTOMER_IDS = '0123456789ABCDEFGHJKMNPRSTUVWXYZ';

class Valcheck2 extends Valcheck {
  constructor(errorHandler, bugHandler) {
    // @ts-ignore (until utils get type checked)
    super(errorHandler, bugHandler);
  }

  /**
   * Check if the value is a valid CRON expression.
   *
   * @param {string} key
   * @param {string} value
   *
   * @returns {*} error, if any
   */
  cronExpression(key, value) {
    let error;
    if ((error = this.string(key, value, true, false, 1, 50))) { return error; }

    try {
      CronParser.parseExpression(value);
    } catch(e) {
      return this._error(key, 'must be a valid cron');
    }
  }
}

class MergerWriteStream extends stream.Writable {

  constructor() {
    super({objectMode: true});

    /** @type {Array} */
    this.accumulator = [];
  }

  _write(object, enc, next) {
    this.accumulator.push(object);
    next();
  }
}

class ServerUtils {

  /**
   * @param {object} [logger]
   * @param {function} logger.warn
   * @param {function} logger.error
   */
  constructor(logger) {
    if (!logger) {
      logger = {
        warn: s => { console.error('warn: ' + s); },
        error: s => { console.error('error: ' + s); }
      };
    }
    this._logger = logger;

    // @ts-ignore (until utils get type checked)
    /** @type {LiteralsParser} */
    this._literalsParser = new LiteralsParser(['"', '\''], '\\');

    /** @type {Valcheck2} */
    this._check = new Valcheck2(validationMessage => {
      throw Errors.business('invalid_parameter', validationMessage);
    }, bugMessage => {
      throw Errors.technical('bug', bugMessage);
    });
  }

  /**
   * @type {Valcheck2}
   */
  get check() {
    return this._check;
  }

  /**
   * @returns {{warn: function, error: function}}
   */
  get logger() {
    return this._logger;
  }

  /**
   * Logs a warning if the number of milliseconds elapsed since `t0` is higher than `threshold`.
   *
   * @param {number} t0
   * @param {number} threshold
   * @param {string|function():string} getMessage
   * @param {CustomLogger} [logger]
   */
  logSlow(t0, threshold, getMessage, logger) {
    const duration = Date.now() - t0;
    if (duration < threshold) { return; }

    const message = '[Slow: ' + duration + 'ms] ' + (
      typeof getMessage === 'function' ? getMessage() : getMessage
    );

    if (logger) {
      logger.warn(message);
    } else {
      this.logger.warn(message);
    }
  }

  /**
   * Deduplicate objects by the value of a nested property.
   *
   * @param {object[]} array
   * @param {string} key
   * @returns {object[]}
   */
  uniqBy(array, key) {
    const map = new Map();
    for (let i = 0, l = array.length; i < l; ++i) {
      map.set(array[i][key], array[i]);
    }
    return Array.from(map.values());
  }

  /**
   * @param {object} proto an object prototype
   * @param {boolean} [skipPrivate=false] don't include fields starting with `'_'`.
   * @param {boolean} [skipObject=false] don't include fields from `Object` class.
   * @returns {*}
   */
  getFields(proto, skipPrivate, skipObject) {
    let fields = [];
    let p = proto;
    while (p) {
      if (skipObject && p.constructor.name === 'Object') { break; }
      fields = fields.concat(Object.getOwnPropertyNames(p));

      // @ts-ignore (until utils get type checked)
      p = p.__proto__;
    }
    return _uniq(fields).filter(f => {
      return f !== 'constructor' && (!skipPrivate || f[0] !== '_');
    });
  }

  /**
   * @param {*} o
   * @returns {boolean}
   */
  noValue(o) {
    return o === undefined || o === null;
  }

  /**
   * @param {*} o
   * @returns {boolean}
   */
  hasValue(o) {
    return o !== undefined && o !== null;
  }

  /**
   * Returns a catch-handler for a promise.
   * If the caught error key is `ignoredErrorKey`, resolve with `returnValue`.
   * Reject with the error otherwise.
   *
   * @param {string} ignoredErrorKey Error-key to ignore.
   * @param {*} returnValue Return value if the caught error
   * @returns {function(LkError):Promise<LkError|*>}
   */
  catchKey(ignoredErrorKey, returnValue) {
    return e => {
      if (e && e.key === ignoredErrorKey) {
        return Promise.resolve(returnValue);
      } else {
        return Promise.reject(e);
      }
    };
  }

  /**
   * Split exactly once (on the first occurrence of the separator).
   *
   * @param {string} str
   * @param {string} separator
   * @returns {string[]} an array with at most two items
   */
  splitOnce(str, separator) {
    const i = str.indexOf(separator);
    return i === -1 ? [str] : [str.slice(0, i), str.slice(i + separator.length)];
  }

  /**
   * Is non-empty string
   *
   * @param {*} o
   * @returns {boolean} true if non empty string
   */
  isNEString(o) {
    return (typeof o === 'string' || o instanceof String) && o.length > 0;
  }

  isPosInt(value) {
    return !this.isNaN(value) && (value >= 0) && (Math.ceil(value) == value);
  }

  /**
   * @param {*} value
   * @param {string} valueKey
   * @param {boolean} [allowUndefined]
   * @param {number} [defaultValue] returned if value is undefined and allowUndefined is true
   * @returns {number} return parsed value if a positive integer, throw an error otherwise
   *
   */
  tryParsePosInt(value, valueKey, allowUndefined, defaultValue) {
    value = this.parseInt(value);
    if (allowUndefined && value === undefined) {
      return defaultValue;
    }
    this.check.posInt(valueKey, value);
    return value;
  }

  /**
   * @param {*} value
   * @param {string} valueKey
   * @param {boolean} [allowUndefined]
   * @param {number} [defaultValue] returned if value is undefined and allowUndefined is true
   * @returns {number} return parsed value if a number, throw an error otherwise
   */
  tryParseNumber(value, valueKey, allowUndefined, defaultValue) {
    value = this.parseFloat(value);
    if (allowUndefined && value === undefined) {
      return defaultValue;
    }
    this.check.number(valueKey, value);
    return value;
  }

  /**
   * @param {*} values
   * @param {string} valueKey
   * @returns {number[]} return parsed values if all are positive integers, throw an error otherwise
   */
  tryParsePosInts(values, valueKey) {
    const errorKey = 'invalid_parameter',
      errorMessage = '"' + valueKey + '" must be an array of positive integers.';

    const self = this;
    if (!Array.isArray(values)) {
      throw Errors.business(errorKey, errorMessage);
    }
    return values.map(value => {
      value = self.parseInt(value);
      if (isNaN(value)) {
        throw Errors.business(errorKey, errorMessage);
      }
      if (value < 0 || !Number.isInteger(value)) {
        throw Errors.business(errorKey, errorMessage);
      }
      return value;
    });
  }

  /**
   * Checks whether `v` is a non-null object.
   *
   * @param {*} v
   * @returns {boolean}
   */
  isObject(v) {
    return v !== null && typeof v === 'object';
  }

  /**
   * Check whether `n` is a boolean.
   *
   * @param {*} n
   * @returns {boolean}
   */
  isBoolean(n) {
    return !!n === n;
  }

  /**
   * Replacement of isNaN, because the original has the following problems:
   * * return false when input is ""
   * * return false when input is null
   * * return false when input is a string comprised of whitespace only
   *
   * @param {*} input
   * @returns {boolean} true if not a number
   */
  isNaN(input) {
    return isNaN(parseInt(input, 10));
  }

  /**
   * Replace any entry in the array in input with its string.
   *
   * @param {any} a
   * @returns {Array<string> | null | undefined}
   */
  toStringArray(a) {
    if (a === null) { return null; }
    if (a === undefined) { return undefined; }
    if (!Array.isArray(a)) { return undefined; }
    return a.map(a => a + '');
  }

  /**
   * Replacement for parseInt, because the original has the following problems:
   * * infers base 8 when input starts with '0'
   * * infers base 16 when input starts with '0x'
   *
   * @param {*} input
   * @returns {number}
   */
  parseInt(input) {
    if (input === null || input === undefined) { return input; }
    return parseInt(input, 10);
  }

  /**
   * @param {*} input
   * @returns {number|undefined|null}
   */
  parseFloat(input) {
    if (input === null || input === undefined) { return input; }
    return parseFloat(input);
  }

  /**
   * Parse any value an make the best boolean guess we can
   *
   * @param {*} b
   * @returns {boolean|null|undefined}
   */
  parseBoolean(b) {
    if (b === null || b === undefined) { return b; }
    return (b === true || b === 'true' || b === 'yes' || b === 'y' || b === '1' || b === 1);
  }

  localComparator(a, b) {
    return a.localeCompare(b);
  }

  /**
   * Compare two SemVer strings
   *
   * @param {string} x a string in the format "a.b.c"
   * @param {string} y a string in the format "d.e.f"
   * @returns {number} similar to (x-y): <0 if x<y, >0 if x>y, 0 if x=y
   */
  compareSemVer(x, y) {
    return SemVer.compare(x, y);
  }

  /**
   * Generate a map from a string array.
   *
   * @param {Array<string | number>} array
   * @param {any}                    [value=true]
   * @returns {object}
   */
  arrayToMap(array, value) {
    if (value === undefined) { value = true; }
    const map = {};
    if (!array || !array.length) { return map; }
    array.forEach(item => { map[item] = value; });
    return map;
  }

  /**
   * Creates a map with `array` items indexed by the key extracted by `keyReader`.
   *
   * @param {*[]} array
   * @param {function(*):*} keyReader
   * @returns {Map}
   */
  indexBy(array, keyReader) {
    const map = new Map();
    array.forEach(item => map.set(keyReader(item), item));
    return map;
  }

  extractHostPort(url) {
    if (!url) { return undefined; }
    const re = new RegExp('^([a-zA-Z+]+)://([^:/]+)(:\\d+)?(?:/|$)');
    const groups = re.exec(url);
    if (!groups) { return undefined; }
    const scheme = groups[1].toLowerCase();
    const host = groups[2];
    let port;
    if (groups.length === 4 && groups[3] !== undefined) {
      port = groups[3].substr(1);
    } else {
      if (scheme === 'http' || scheme === 'ws') {
        port = '80';
      } else if (scheme === 'https' || scheme === 'wss') {
        port = '443';
      } else if (scheme === 'bolt' || scheme === 'bolt+routing') {
        port = '7687';
      } // else 'undefined'
    }
    return {scheme: scheme, host: host, port: port};
  }

  /**
   * @param {Object} root an object (possibly null or undefined)
   * @param {String[]|String} propertyChain a chain of properties to resolve on the root object
   * @param {*} [defaultValue] a value to return if a null or undefined value is found along the chain
   * @returns {*}
   */
  safeGet(root, propertyChain, defaultValue) {
    let value = root;

    if (Array.isArray(propertyChain)) {
      // no-op
    } else if (typeof propertyChain === 'string') {
      propertyChain = propertyChain.split('.');
    } else {
      throw new Error('bad "propertyChain" argument type: ' + (typeof propertyChain));
    }

    for (let i = 0, l = propertyChain.length, property; i < l; ++i) {
      if (value === null || value === undefined) {
        return defaultValue;
      }
      property = propertyChain[i];
      const type = typeof property;
      if (type === 'number' || type === 'string') {
        value = value[property];
      } else {
        throw new Error('safeGet: property key of type "' + type + '" is not legal');
      }
    }
    return (value === null || value === undefined) ? defaultValue : value;
  }

  /**
   * Retry a promise multiple times if it fails.
   *
   * @param {String} actionName name of the action to try/retry
   * @param {Function} action a function returning a promise
   * @param {object} options retry options
   * @param {function} [options.decide] if defined, will be called with the error and must return
   *                                    true to continue retrying or false to cancel retrying.
   * @param {number} options.delay a number of milliseconds to wait between retries.
   * @param {number} [options.retries=5] the maximum number of retries before actually failing.
   * @param {boolean} [options.fullErrors=true] whether to include full errors or just messages
   * @param {function} [options.giveUp] a boolean returning function. After an error, is this
   *                                    is defined, it is called with the error as first argument.
   *                                    If the result is true, the promise is rejected.
   * @param {number} [doneRetries]
   * @returns {Bluebird<any>} a promise
   */
  retryPromise(actionName, action, options, doneRetries) {
    // validate parameters
    if (doneRetries === undefined) { doneRetries = 0; }

    options = _.defaults(options, {});
    if (options.retries === undefined) { options.retries = 5; }
    if (options.fullErrors === undefined) { options.fullErrors = true; }
    if (options.decide !== undefined) {
      this.check.function('options.decide', options.decide);
    }
    if (!this.isPosInt(options.delay)) {
      return Promise.reject(new Error('"delay" must be an integer >= 0'));
    }
    if (typeof(action) !== 'function') {
      return Promise.reject(new Error('"action" must be a function'));
    }

    // @ts-ignore (until utils get type checked)
    const promise = action();
    if (!(promise instanceof Promise)) {
      return Promise.reject(new Error('"action" must return a promise'));
    }

    // give-up method
    const giveUp = (error, message) => {
      // @ts-ignore (until utils get type checked)
      this.logger.error(
        'giving up "' + actionName + '" ' +
        '[' + doneRetries + '/' + options.retries + ']: ' +
        message
      );
      return Promise.reject(error);
    };

    // check if the actions
    return promise.catch(error => {

      // build a more user-friendly error message whenever possible
      const message = error && error.message ? error.message : error;
      const giveUpNow = options.giveUp && options.giveUp(error) === true;
      ++doneRetries;

      // should retry ?
      if ((doneRetries < options.retries || options.retries === null) && !giveUpNow) {

        // cancel retry if option.retry returns "false"
        if (options.decide && !options.decide(error)) {
          return giveUp(error, message);
        }

        // @ts-ignore (until utils get type checked)
        this.logger.warn('retrying "' + actionName + '" [' + doneRetries +
          (options.retries ? '/' + options.retries : '') + ']' +
          (options.fullErrors ? ': ' + message : '')
        );
        return Promise.delay(options.delay).then(() => {

          // cancel retry if option.retry returns "false"
          if (options.decide && !options.decide(error)) {
            return giveUp(error, message);
          }

          return this.retryPromise(actionName, action, options, doneRetries);
        });
      } else {
        return giveUp(error, message);
      }
    }).catch(Promise.CancellationError, error => {
      return giveUp(error, 'cancelled');
    });
  }

  /**
   * Slice an array and call 'handler' with each slice.
   *
   * @param {*[]} array an array to break into smaller slices for processing by 'handler'
   * @param {number} sliceSize an maximum slice size
   * @param {function} handler a function taking an array as argument (possibly returning a promise)
   * @param {number} [concurrency] a value indicating how many slices can run concurrently
   * @returns {Bluebird<any>} returned when 'handler' has been called on each array slice and resolved
   */
  sliceMap(array, sliceSize, handler, concurrency) {
    if (array.length === 0) { return Promise.resolve([]); }

    if (sliceSize <= 0) {
      // @ts-ignore (until utils get type checked) (the error is due to not going through the Error service)
      return Errors.business('invalid_parameter', 'sliceSize must be > 0', true);
    }
    const slices = [];
    for (let i = 0; i < array.length; i += sliceSize) {
      slices.push(array.slice(
        i,
        Math.min(i + sliceSize, array.length)
      ));
    }

    const options = concurrency === undefined ? undefined : {concurrency};
    // @ts-ignore (until utils get type checked)
    return Promise.resolve(slices).map(handler, options);
  }

  neverReject(promise) {
    const self = this;
    return promise.catch(error => {
      // @ts-ignore (until utils get type checked)
      self.logger.error('Ignoring error:', error.message ? error.message : 'Unknown error', error);
      return Promise.resolve();
    });
  }

  /**
   * Clone an object in depth
   *
   * @param {any} o any object
   * @returns {any} cloned object
   */
  clone(o) {
    return _cloneDeep(o);
  }

  /**
   * This method compares two JS objects to determine if they have the same structure.
   *
   * Two object have the same structure if the intersection of their key list corresponds to the
   * list of the key list of reference.
   *
   * Two Arrays have the same structure if each element have the same structure and that structure
   * corresponds to the structure of the elements inside the array of reference
   *
   * @param {Object} reference - Object to be compared to (reference)
   * @param {Object} compared - Object being compared
   * @param {Object} [optionalPaths] a map of optional paths (dot separated)
   * @param {boolean} [failEarly=false] whether to fail on first detected difference
   * @param {string[]} [stack] property stack (for recursive calls)
   * @returns {string[]} - structural differences described as strings
   */
  compareStructures(reference, compared, optionalPaths, failEarly, stack) {
    const self = this;
    if (!optionalPaths) { optionalPaths = {}; }
    if (!stack) { stack = ['root']; }
    let diff = [];

    // reference does not exist: adding new keys is OK.
    if (reference === undefined || reference === null) {
      return diff;
    }

    // type match ?
    if (typeof reference !== typeof compared) {
      diff.push(
        'types don\'t match: ' +
        'expected "' + (typeof reference) + '", ' +
        'found "' + (typeof compared) + '" (' + stack.join('.') + ')'
      );
      return diff;
    }

    // array: compare each element with first element in reference
    if (reference instanceof Array && compared instanceof Array) {
      /**
       * first we check that the type of all the element of the Array are consistent with the
       * type of the first element of the default configuration (We consider the default
       * configuration is consistent.
       */
      if (reference.length > 0) {
        const ref = reference[0];
        for (let i = 0, l = compared.length; i < l; ++i) {
          const nextStack = stack.concat('[' + i + ']');
          diff = diff.concat(self.compareStructures(
            ref, compared[i], optionalPaths, failEarly, nextStack
          ));
          if (failEarly && diff.length > 0) {
            return diff;
          }
        }
        if (failEarly && diff.length > 0) { return diff; }
      }
    } else if (reference instanceof Object && compared instanceof Object) { // object, compare keys
      Object.keys(reference).sort().forEach(key => {
        const nextStack = stack.concat(key);
        let path;
        if (!_has(compared, key)) {
          path = nextStack.join('.');
          if (optionalPaths[path] === true) {
            // no-op
          } else {
            diff.push('expected key not found (' + nextStack.join('.') + ')');
          }
        } else {
          diff = diff.concat(self.compareStructures(
            reference[key],
            compared[key],
            optionalPaths,
            failEarly,
            nextStack
          ));
        }
      });
      if (failEarly && diff.length > 0) { return diff; }
    }

    return diff;
  }

  /**
   * Compute the difference between objects
   *
   * @param {*} reference
   * @param {*} compared
   * @param {object} [ignoredPaths]
   * return {string[]} human readable differences
   */
  objectDiff(reference, compared, ignoredPaths) {
    return JSDiff.compareValues(reference, compared, ignoredPaths);
  }

  /**
   *
   * @param {number} milliseconds
   * @param {number} [precision=null] number of
   * @returns {string}
   */
  humanDuration(milliseconds, precision) {
    const units = [
      {name: 'day', millis: 24 * 60 * 60 * 1000},
      {name: 'hour', millis: 60 * 60 * 1000},
      {name: 'minute', millis: 60 * 1000},
      {name: 'second', millis: 1000}
    ];
    let chunks = [];
    for (let i = 0; i < units.length; ++i) {
      const unit = units[i];
      const unitCount = Math.floor(milliseconds / unit.millis);
      milliseconds = milliseconds % unit.millis;
      if (unitCount > 0 || (chunks.length > 0 && precision !== undefined)) {
        chunks.push({
          count: unitCount,
          unit: (unit.name + (unitCount === 1 ? '' : 's'))
        });
      }
    }
    if (precision !== undefined) {
      chunks = chunks.slice(0, precision);
    }
    if (chunks.length === 0) {
      chunks.push({count: 0, unit: 'seconds'});
    }
    return chunks.reduce((string, chunk, index) => {
      if (chunk.count === 0 && chunks.length > 1) { return string; }
      return string +
        (index === 0 ? '' : index === chunks.length - 1 ? ' and ' : ', ') +
        chunk.count + ' ' + chunk.unit;
    }, '');
  }

  /**
   * @param {number} size - size of the semaphore
   * @returns {Semaphore} with 'acquire' and 'release' methods
   */
  semaphore(size) {
    return new Semaphore(size);
  }

  /**
   * Extract a detailed JSON parse error
   *
   * @param {string} json
   * @returns {{snippet: string, message: string, line: number, column: number}}
   */
  getJSONParseError(json) {
    const parser = clarinet.parser();
    let firstError = undefined;

    // generate a detailed error using the parser's state
    function makeError(e) {
      let currentNL = 0,
        nextNL = json.indexOf('\n'),
        line = 1;

      while (line < parser.line) {
        currentNL = nextNL;
        nextNL = json.indexOf('\n', currentNL + 1);
        ++line;
      }
      return {
        snippet: json.substr(currentNL + 1, nextNL - currentNL - 1),
        message: (e.message || '').split('\n', 1)[0],
        line: parser.line,
        column: parser.column
      };
    }

    // trigger the parse error
    parser.onerror = error => {
      firstError = makeError(error);
      parser.close();
    };
    try {
      parser.write(json).close();
    } catch(e) {
      if (firstError === undefined) {
        return makeError(e);
      } else {
        return firstError;
      }
    }

    return firstError;
  }

  /**
   * The input is a possibly broken JSON string.
   * This function is able to fix and parse a broken JSON string by discarding characters at the
   * end of the string and closing the top-level data structure (be it an array or an object).
   * This allows to recover all non-broken first-level children of the root object.
   *
   * @param {string} originalJson
   * @returns {{parsed: any, error?: Error, discarded: string}}
   */
  tryParseJson(originalJson) {
    if (typeof originalJson !== 'string') {
      return {parsed: undefined, error: undefined, discarded: ''};
    }

    let originalError = null;
    let discardedChars = 0;
    originalJson = originalJson.trim();

    let json = originalJson;

    let lastChar = '';
    if (json[0] === '[') { lastChar = ']'; }
    if (json[0] === '{') { lastChar = '}'; }

    while (json.length > 0) {
      try {
        return {
          parsed: JSON.parse(json),
          error: originalError,
          discarded: originalJson.substr(-discardedChars)
        };
      } catch(e) {
        if (!originalError) {
          // if this is the first error
          json = json + lastChar;
          originalError = e;
        } else {
          // if there was already an error
          discardedChars++;
          json = json.slice(0, -(1 + lastChar.length)) + lastChar;
        }
      }
    }

    return {
      parsed: undefined,
      error: originalError,
      discarded: originalJson
    };
  }

  stripLiterals(s) {
    return this._literalsParser.removeLiterals(s);
  }

  /**
   * @param {string} sourceKey
   * @param {string} [name="sourceKey"]
   * @param {boolean} [optional=false] Whether to allow undefined values
   */
  checkSourceKey(sourceKey, name, optional) {
    if (sourceKey === undefined && optional) { return; }
    this.check.string(name ? name : 'sourceKey', sourceKey, true, true, 8, 8);
  }

  /**
   * Generate 8 random HEX Bytes.
   * Uses Math.random, so don't use this for cryptography.
   *
   * @returns {string}
   */
  randomHex8() {
    let s = Math.random().toString(16).substr(2, 8);

    while (s.length < 8) { s = '0' + s; }
    return s;
  }

  /**
   * @param {number} bytes
   * @returns {string} a hex string
   */
  randomHex(bytes) {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Stringify in a stable and/or pretty way.
   *
   * @param {any}     o
   * @param {boolean} pretty        Whether to indent the JSON object
   * @param {boolean} [stable=true] Whether to sort the property keys
   */
  toJSON(o, pretty, stable) {
    return JSON.stringify(
      o,
      stable === false || !o || typeof o !== 'object' ? null : Object.keys(o).sort(),
      pretty ? 2 : null
    );
  }

  /**
   * Generate an hash for a match.
   *
   * @param {string[]} nodes Ids
   * @param {string[]} edges Ids
   * @param {number} alertId
   *
   * @returns {string}
   */
  hashMatch(nodes, edges, alertId) {
    const nodesIdSet = new Set();
    const edgesIdSet = new Set();

    for (const nodeId of nodes) {
      nodesIdSet.add(nodeId);
    }

    for (const edgeId of edges) {
      edgesIdSet.add(edgeId);
    }

    const nodesId = Array.from(nodesIdSet);
    const edgesId = Array.from(edgesIdSet);

    nodesId.sort();
    edgesId.sort();

    return crypto.createHash('md5').update(alertId + JSON.stringify(nodesId) +
      JSON.stringify(edgesId)).digest('hex');
  }

  /**
   * Similar to source.pipe(target), but it pass along with the 'data' signals
   * also the 'error' signals.
   *
   * @param {any} _streams
   * @returns {any} a readable stream
   */
  safePipe(_streams) {
    if (arguments.length <= 1) {
      throw Errors.technical('bug', 'streams must be > 1');
    }

    let readable = arguments[0];
    const transforms = Array.prototype.slice.call(arguments, 1);

    while (transforms.length > 0) {
      const newReadable = transforms.shift();
      readable.on('error', e => {
        newReadable.emit('error', e);
      });
      readable.pipe(newReadable);

      // hack to abort stream originated from request.js
      if (typeof readable.abort === 'function') {
        newReadable.abort = readable.abort.bind(readable);
      }

      readable = newReadable;
    }
    return readable;
  }

  /**
   * @param {Readable} readableStream
   * @param {number}   timeout
   * @returns {Bluebird<{timeout: boolean, result: any[]}>}
   */
  mergeReadable(readableStream, timeout) {
    return new Promise((resolve, reject) => {
      let hasEnded = false;
      let hasTimeout = false;

      const merger = new MergerWriteStream();
      // @ts-ignore (until utils get type checked)
      readableStream.pipe(merger);

      const done = () => {
        if (hasEnded) { return; }
        hasEnded = true;

        clearTimeout(timer);
        resolve({timeout: hasTimeout, result: merger.accumulator});
      };

      const timer = setTimeout(() => {
        if (hasEnded) { return; }
        hasTimeout = true;
        done();

        // @ts-ignore (until utils get type checked)
        if (typeof readableStream.unpipe === 'function') {
          // @ts-ignore (until utils get type checked)
          readableStream.unpipe(merger);
        }

        // @ts-ignore (until utils get type checked)
        if (typeof readableStream.abort === 'function') {
          // @ts-ignore (until utils get type checked)
          readableStream.abort.apply(merger);
        }
      }, timeout);

      readableStream.on('error', reject);
      readableStream.on('end', done);
    });
  }

  /**
   * Check that `customerId` has a length of 10 and that the checksum values match.
   *
   * @param {string} key
   * @param {string} customerId
   * @throws {LkError} if value is not a valid customer Id
   */
  validateCustomerId(key, customerId) {
    const prefix = customerId.slice(0, 2);
    const firstPart = customerId.slice(2, 6);
    const secondPart = customerId.slice(7);

    let sum = 8; // 4312 modulo 16
    for (const c of firstPart + secondPart) {
      sum += Number.parseInt(c, 36);
    }
    const checksum = Number(sum % 16).toString(16).toUpperCase();

    if (customerId.length !== 10 || customerId.slice(6, 7) !== checksum ||
      prefix !== 'LK') {
      throw Errors.business('invalid_parameter',
        `"${key}": ${customerId} must be a valid customer id`);
    }
  }

  /**
   * Generate a valid unique customer id composed of:
   * - 'LK' prefix
   * - 4 random characters in the alphabet
   * - 1 character of checksum equal to the sum of all the others characters + 8 modulo 16
   * - 3 random characters in the alphabet
   *
   * @returns {string}
   */
  generateUniqueCustomerId() {
    const firstPart = randomstring.generate({charset: ALPHABET_LK_CUSTOMER_IDS, length: 4});
    const secondPart = randomstring.generate({charset: ALPHABET_LK_CUSTOMER_IDS, length: 3});
    let sum = 8; // 4312 modulo 16
    for (const c of firstPart + secondPart) {
      sum += Number.parseInt(c, 36);
    }
    // the checksum is always modulo 16 to avoid complicated tricks due to missing characters in the alphabet
    const checksum = Number(sum % 16).toString(16).toUpperCase();
    return 'LK' + firstPart + checksum + secondPart;
  }

  /**
   * Generate a valid email used in authentication providers that may miss one.
   *
   * @param {string} customerId
   * @returns {string}
   */
  generateRandomEmail(customerId) {
    return this.randomHex(4) + '-' + customerId + '@linkurio.us';
  }

  /**
   * Compute the next time to schedule based on a cron and the last run.
   *
   * @param {string} cron
   * @param {Date}   [lastRun]
   * @returns {Date}
   */
  nextTimeToSchedule(cron, lastRun) {
    /**
     * By default, if we ask to schedule every minute, the CronParser library will generate
     * as 'nextTimeToSchedule' the time hh.mm.00.000. But if we call it while the current
     * time is 'hh.mm.00.xxx' it will produce 'hh.mm.00.xxx' instead of 'hh.(mm+1).00.xxx'.
     *
     * To fix this we ask CronParser to give us the 'nextTimeToSchedule' starting from
     * Date.now() + 1 second.
     */
    if (lastRun === undefined || lastRun === null) {
      lastRun = new Date(Date.now() + 1000);
    }

    return CronParser.parseExpression(
      cron, {currentDate: lastRun}
    ).next();
  }

  /**
   * Remove an eventual last '/' in a url if present.
   *
   * @param {string} url
   * @returns {string}
   */
  normalizeUrl(url) {
    return url.replace(/\/$/, '');
  }

  /**
   * @param {IncomingMessage} req
   * @returns {boolean}
   */
  isRequestHTTPS(req) {
    // getPeerCertificate is a function and it's not defined if req.connection is not a TLSSocket
    // @ts-ignore (req.connection is just a 'Socket' so it doesn't have a getPeerCertificate)
    return req.connection.getPeerCertificate !== undefined;
  }

  /**
   * Throw an LkError.
   *
   * The signature says that it returns `any` so that
   * type checking doesn't complain when we return `Utils.NOT_IMPLEMENTED()`
   *
   * @returns {any}
   */
  NOT_IMPLEMENTED() {
    throw Errors.business('not_implemented', 'Not implemented.');
  }
}

module.exports = ServerUtils;
