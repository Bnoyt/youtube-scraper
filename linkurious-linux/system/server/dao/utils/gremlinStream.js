/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-02-18.
 */
'use strict';

const EventEmitter = require('events');

class GremlinStream extends EventEmitter {

  /**
   * @param {any}    gremlinDriver
   * @param {string} pageQuery
   * @param {string} type          'node' or 'edge'
   */
  constructor(gremlinDriver, pageQuery, type) {
    super();
    this.gremlinDriver = gremlinDriver;
    this.pageQuery = pageQuery;
    this.buffer = [];
    this.paused = true;
    this.type = type;
    this.resume();
  }

  pause() {
    this.paused = true;
  }

  resume() {
    if (!this.paused) { return; }
    this.paused = false;
    this._loop();
  }

  abort() {
    // not implemented
  }

  _loop() {
    let data;
    while (!this.paused && this.buffer.length) {
      data = this.buffer.pop();
      data = this.type === 'node'
        ? this.gremlinDriver.rawNodeToLkNode(data)
        : this.gremlinDriver.rawEdgeToLkEdge(data);
      this.emit('data', data);
    }
    if (!this.paused && !this.buffer.length) {
      this.gremlinDriver.connector.$doGremlinQuery(this.pageQuery).then(results => {
        if (results.length === 0) {
          this.emit('end');
        } else {
          this.buffer = results;
          process.nextTick(() => this._loop());
        }
      }, error => {
        this.emit('error', error);
      });
    }
  }
}

module.exports = GremlinStream;
