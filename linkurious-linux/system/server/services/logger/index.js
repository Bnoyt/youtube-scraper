/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 */
'use strict';

// external libs
const fs = require('fs-extra');

// our libs
const Log4JS = require('../../../lib/log4js');

// services
const LKE = require('../index');

// locals
const LkError = require('../errors/LkError');

class LoggerService extends Log4JS {
  constructor() {
    // read logger configuration
    let config = {};
    try {
      config = fs.readJsonSync(LKE.dataFile('config/logger.json'));
    } catch(e) {
      console.log('Using default logger configuration');
      // @ts-ignore require .json file
      config = require('./logger.json');
    }

    super({
      projectRoot: LKE.systemFile(''),
      logDirPath: LKE.dataFile('logs'),
      logFileName: 'linkurious',
      logLevel: config.logLevel,
      customLevels: config.customLevels,
      addPrefix: config.addPrefix
    });
  }

  error() {
    const newArgs = [];
    for (let i = 0; i < arguments.length; ++i) {
      let arg = arguments[i];
      /**
       * for each argument that is an error with a stack,
       * we add the stack trace as a string array along
       * the error in the logged object
       */
      if (arg && arg instanceof LkError && !arg.isTechnical()) {
        // non technical LkError
        arg = arg.message;
      } else if (typeof arg === 'object' && arg instanceof Error && arg.stack) {
        // raw error or technical LkError

        // clone the error so we don't modify the original argument
        arg = {
          key: arg instanceof LkError ? arg.key : 'critical',
          message: arg.message,
          trace: arg.stack.split(/\s*\n\s*/)
        };
        // remove the first line of the stack trace: it repeats the error name etc.
        if (arg.trace.length > 0) {
          arg.trace = arg.trace.splice(1);
        }
      }
      newArgs.push(arg);
    }
    super.error.apply(this, newArgs);
  }

}

module.exports = new LoggerService();
