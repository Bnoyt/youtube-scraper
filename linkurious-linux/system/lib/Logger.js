/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-09-02.
 */
'use strict';

const FILE_PREFIX = 'lks-log-';

const path = require('path');

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));

//
// WriteStream
//

/**
 * A promisified interface for node.js WritableStream.
 * Arguments are passed to fs.createWriteStream.
 *
 * @constructor
 * @param {string} path createWriteStream path argument
 * @param {Object} options createWriteStream options argument
 */
function WriteStream(path, options) {
  this._stream = fs.createWriteStream(path, options);
  this._writer = Promise.resolve();

  this._stream.on('error', err => {
    throw err;
  });
}

/**
 * Create a new write tentative on the internal Stream.
 * The arguments are passed to node.js WritableStream.write.
 *
 * @method
 * @param {string|Buffer} chunk The data to write
 * @param {string} encoding The encoding, if chunk is a String
 * @returns {Promise} Promise resolved when the write tentative succeed. Rejected if the tentative failed.
 */
WriteStream.prototype.write = function(chunk, encoding) {
  const self = this;

  self._writer = self._writer.then(() => {
    return new Promise((resolve, reject) => {
      self._stream.write(chunk, encoding, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });

  return self._writer;
};

/**
 * Resolved when all the write tentatives succeeded.
 * Rejected when a write tentative failed.
 *
 * @method
 * @returns {Promise}
 */
WriteStream.prototype.end = function() {
  return this._writer;
};

//
// Logger
//

/**
 * Log system with file rotation
 *
 * @constructor
 * @param {Object} params Configuration options
 * @param {string} params.directory Location of the log files
 * @param {string} params.fileSizeLimit Maximum size of a single log file
 */
function Logger(params) {
  this._directory = params.directory;
  this._fileSizeLimit = params.fileSizeLimit;

  this._logIndex = 1;
  this._getLogIndexSync();
}

Logger.prototype.FILE_PREFIX = FILE_PREFIX;

Logger.prototype.end = function() {
  const self = this;
  return self.flush().finally(() => {
    if (self._currentFile) {
      return self._currentFile.end();
    }
  });
};

Logger.prototype._getLogIndexSync = function() {
  const self = this;
  fs.mkdirsSync(self._directory);

  const files = fs.readdirSync(self._directory);
  let logFileIndex = null;

  files.forEach(filename => {
    if (filename.indexOf(FILE_PREFIX) === 0) {
      let index = filename.substr(
        FILE_PREFIX.length,
        filename.length - FILE_PREFIX.length - '.log'.length
      );

      index = parseInt(index, 10);
      if (!Number.isNaN(index) && logFileIndex < index) {
        logFileIndex = index;
      }
    }
  });

  if (logFileIndex !== null) {
    const filename = FILE_PREFIX + logFileIndex + '.log';
    const logFile = path.join(self._directory, filename);

    const file = fs.statSync(logFile);

    if (file.isFile()) {
      if (file.size < self._fileSizeLimit) {
        self._logIndex = logFileIndex;
      } else {
        self._logIndex = logFileIndex + 1;
      }
    }
  }
};

Logger.prototype._createNewFile = function() {
  const self = this;

  const newFile = path.join(self._directory, FILE_PREFIX + self._logIndex + '.log');
  self._logIndex++;

  if (self._currentFile) {
    self._currentFile.end();
  }

  self._currentFile = new WriteStream(newFile, {flags: 'a+'});
  self._currentFileAvailableSize = self._fileSizeLimit;
};

Logger.prototype._getStream = function(size) {
  const self = this;

  if (!self._currentFile || self._currentFileAvailableSize < size) {
    self._createNewFile();
  }

  self._currentFileAvailableSize -= size;
  return self._currentFile;
};

Logger.prototype.log = function(str) {
  const stream = this._getStream(str.length);

  return stream.write(str);
};

Logger.prototype.flush = function() {
  return this._currentFile.end();
};

module.exports = Logger;
