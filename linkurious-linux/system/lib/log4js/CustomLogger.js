/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-10-26.
 */
'use strict';

const Levels = require('./Levels');

class CustomLogger {

  /**
   * @param {object}   rootLogger        The RootLogger to forward logs to
   * @param {string}   logLevel          The log level for this logger
   * @param {string[]} [packageChain]    The package chain for this custom logger
   * @param {boolean}  [addPrefix=false] Whether to prepend the packageId to each logged line
   */
  constructor(rootLogger, logLevel, packageChain, addPrefix) {

    if (Levels[logLevel] === undefined) {
      throw new Error('Illegal log level: "' + logLevel + '"');
    }

    this.sourcePackage = packageChain || [];
    const packageId = this.sourcePackage.join('.');

    this.level = logLevel;

    for (const level of Object.keys(Levels)) {
      // under log-level: keep no-op functions
      if (Levels[level] > Levels[logLevel]) {
        continue;
      }

      // at or above log-level: replace no-op with call to root logger
      this[level] = function() {
        if (addPrefix && arguments.length && typeof arguments[0] === 'string') {
          arguments[0] = '\x1B[90m' + packageId + '\x1B[0m ' + arguments[0];
        }
        rootLogger[level].apply(rootLogger, arguments);
      };
    }
  }

  silly() {}

  debug() {}

  info() {}

  warn() {}

  error() {}
}

module.exports = CustomLogger;
