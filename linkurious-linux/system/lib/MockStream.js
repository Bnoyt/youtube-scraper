/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-09-25.
 */
'use strict';

const Stream = require('stream').Stream;

class MockStream extends Stream {
  constructor() {
    super();

    this._chunks = [];
    this._wait = false;
    this.readable = true;

    const loop = () => {
      const hasData = this._chunks.length !== 0;
      if (this.readable || hasData) {

        let chunk;
        while (this.readable && hasData && !this._wait) {
          chunk = this._chunks.shift();

          this.emit('data', chunk);
        }

        setTimeout(loop, 0);
      }
    };

    setTimeout(loop, 0);
  }

  pause() {
    this._wait = true;
  }

  resume() {
    this._wait = false;
  }

  abort() {
    // not implemented
  }

  write(chunk) {
    this._chunks.push(chunk);
  }

  end(chunk) {
    if (chunk) {
      this.write(chunk);
    }

    this.destroySoon(() => {
      this.emit('end');
    });
  }

  destroy() {
    this._chunks = [];
    this.readable = false;
  }

  destroySoon(callback) {
    const loop = () => {
      if (this._chunks.length === 0 && !this._wait) {
        this.destroy();
        if (typeof callback === 'function') {
          callback();
        }
      } else {
        setTimeout(loop, 0);
      }
    };

    setTimeout(loop, 0);
  }
}

module.exports = MockStream;
