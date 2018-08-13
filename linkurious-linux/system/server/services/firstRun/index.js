/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-05-05.
 */
'use strict';

// int libs
const crypto = require('crypto');

// ext libs
const Promise = require('bluebird');

// services
const LKE = require('../index');
const Config = LKE.getConfig();
const Log = LKE.getLogger(__filename);

class FirstRun {
  /**
   * Check if this is the first run. Runs 'setup' in case of fist run.
   *
   * @returns {Promise}
   */
  check() {
    if (Config.get('firstRun', true)) {
      return this.setup().then(() => {
        return Config.set('firstRun', false);
      });
    }
    return Promise.resolve();
  }

  /**
   * @returns {Promise}
   */
  setup() {
    Log.info('First run, initialization ...');
    return Promise.all([
      // init steps (add new steps to array)
      this._initCookieSecret()
    ]);
  }

  /**
   * @returns {Promise}
   */
  _initCookieSecret() {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(32, (ex, buf) => {
        const token = buf.toString('hex');
        Config.set('server.cookieSecret', token).then(resolve, reject);
      });
    });
  }
}

module.exports = new FirstRun();
