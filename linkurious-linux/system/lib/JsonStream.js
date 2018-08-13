/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-02-10.
 *
 * JSON Stream Parser based on clarinet and through.
 * Transforms a JSON character stream into an objects containing only object matching a given path.
 * Does this by keeping as little data in memory as possible for the requested task.
 *
 * e.g.:
 * Path: `["foo", 0, "bar", "*", "baz"]`
 * JSON character stream:
 * ```{
 *   "foo": [{
 *     "bar": [
 *       { "baz": { "a": 1 } },
 *       { "baz": { "a": 2 } },
 *       { "baz": { "a": 3 } }
 *     ]
 *   }]
 * }```
 *
 * Will emit the following 'data' events:
 * `{"a":1}`, `{"a":2}`, `{"a":2}`.
 *
 * It does so without ever holding the whole `"bar"` array in memory.
 */

'use strict';

// external libs
const clarinet = require('clarinet');
const through = require('through');

// allow for 2 MB text elements
clarinet.MAX_BUFFER_LENGTH = 1 * 1024 * 1024;

/**
 * Data event
 * @event JsonStream#data
 * @type {object} an object that matched the given path
 */

/**
 * End event
 * @event JsonStream#end
 */

/**
 * Error event
 * @event JsonStream#error
 */

class JsonStream {

  /**
   * @param {Array<string | number>} path
   *
   * @fires JsonStream#data
   * @fires JsonStream#error
   * @fires JsonStream#end
   *
   * @returns {Readable<any>}
   */
  static parse(path) {

    /**
     * Parse State
     *
     * @typedef {Object} ParseState
     * @property {string} type
     * @property {Object|Array} item
     * @property {string|number} key?
     * @property {string|number} currentKey?
     * @property {boolean} match?
     * @property {boolean} keep?
     */

    /**
     * @type {ParseState[]}
     */
    const stateStack = [];

    /**
     * @type {ParseState}
     */
    let state = null;

    // parser stream
    const parserOptions = {};
    const parser = clarinet.createStream(parserOptions);

    const stream = through(chunk => {
      // CHUNK handler

      try {
        //if('string' === typeof chunk) { chunk = new Buffer(chunk); }
        parser.write(chunk);
      } catch(error) {
        stream.emit('error', error);
      }
    }, data => {
      // END handler

      if (data) { stream.write(data); }

      if (stateStack.length) {
        stream.emit(
          'error',
          new Error('Unexpected JSON stream end (' + state.type + ' not closed)')
        );
      } else {
        // emits 'end'
        stream.queue(null);
      }
    });

    /**
     * Detect if the current state matches the given path
     *
     * @returns {boolean}
     */
    function isMatch() {
      if (path.length !== stateStack.length - 1) { return false; }
      for (let i = 0, l = path.length; i < l; ++i) {
        if (path[i] === '*') { continue; }
        if (path[i] !== stateStack[i + 1].key) { return false; }
      }
      return true;
    }

    /**
     * Update the parse state
     *
     * @param {string} [newItemType]
     * @param {Object|Array} [newItem]
     * @returns {ParseState}
     */
    function updateState(newItemType, newItem) {
      let result = null;

      // adding a new state item
      if (newItemType !== undefined) {
        let key;
        // push/set on parent
        if (state === null) {
          // no parent
        } else if (state.type === 'array' && state.keep) {
          // an array we want to keep (stored as an array)
          state.item.push(newItem);
          key = state.item.length - 1;
        } else if (state.type === 'array') {
          // an array we won't keep (stored as a map)
          // @ts-ignore too old to fix (JsonStream)
          key = state.currentKey++;
          state.item[key] = newItem;
        } else if (state.type === 'object') {
          key = state.currentKey;
          state.item[key] = newItem;
        }
        // add state in stack
        const newState = {
          type: newItemType,
          item: newItem,
          key: key,
          currentKey: (newItemType === 'array' ? 0 : undefined)
        };
        // @ts-ignore too old to fix (JsonStream)
        stateStack.push(newState);
        // resolve match
        newState.match = isMatch();
        // here, 'state' is the parent state
        newState.keep = (state !== null && state.keep) || newState.match;

        // if not keeping at this level, use maps instead of arrays to enable 'delete'
        if (newItemType === 'array' && !newState.keep) {
          newState.item = {};
        }

        // update current state
        state = stateStack[stateStack.length - 1];
      } else { // removing a state item
        result = stateStack.pop();
        // update current state
        state = stateStack[stateStack.length - 1];
        // enable Garbage Collection of removed state item if we don't want to keep it
        if (state !== undefined && !state.keep && result.key !== undefined) {
          delete state.item[result.key];
        }
      }

      return result;
    }

    // parsing

    parser.on('error', function(e) {
      // unhandled errors will throw, since this is a proper node event emitter.
      stream.emit('error', e);
      // clear the error
      this._parser.error = null;
      this._parser.resume();
    });

    // got some value.  v is the value. can be string, double, bool, or null.
    parser.on('value', v => {
      if (!state.keep) { return; }
      if (state === null) {
        updateState('value', v);
      } else if (state.type === 'object') {
        state.item[state.currentKey] = v;
      } else if (state.type === 'array') {
        state.item.push(v);
      }
    });

    // opened an object. key is the first key.
    parser.on('openobject', key => {
      const o = {};
      if (state === null) {
        updateState('object', o);
      } else if (state.type === 'object') {
        //state.item[state.currentKey] = o;
        updateState('object', o);
      } else if (state.type === 'array') {
        //state.item.push(o);
        updateState('object', o);
      }
      onKey(key);
    });

    // got a key in an object.
    parser.on('key', key => {
      onKey(key);
    });

    function onKey(key) {
      if (state.type === 'object') {
        state.currentKey = key;
      }
    }

    // closed an object.
    parser.on('closeobject', () => {
      if (state.type === 'object') {
        itemEnd();
      }
    });

    // opened an array.
    parser.on('openarray', () => {
      const a = [];
      if (state === null) {
        updateState('array', a);
      } else if (state.type === 'object') {
        //state.item[state.currentKey] = a;
        updateState('array', a);
      } else if (state.type === 'array') {
        //state.item.push(a);
        updateState('array', a);
      }
    });

    // closed an array.
    parser.on('closearray', () => {
      if (state.type === 'array') {
        itemEnd();
      }
    });

    function itemEnd() {
      const stackItem = updateState();
      if (stackItem.match) {
        stream.queue(stackItem.item);
      }
    }

    // parser stream is done, and ready to have more stuff written to it.
    parser.on('end', () => {
      // emits 'end'
      stream.push(null);
    });

    return stream;
  }
}

module.exports = JsonStream;
