/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-05-07.
 */
'use strict';

// external libs
const Promise = require('bluebird');
const fs = require('fs-extra');

// services
const LKE = require('../index');
const Config = LKE.getConfig();
const Errors = LKE.getErrors();

class Certificate {
  /**
   * @returns {Bluebird<{cert: string, key: string, passphrase: string}>}
   */
  getKeyPair() {
    const certFile = LKE.dataFile(Config.get('server.certificateFile', undefined, true));
    const keyFile = LKE.dataFile(Config.get('server.certificateKeyFile', undefined, true));
    const passphrase = Config.get('server.certificatePassphrase');

    if (!fs.existsSync(certFile)) {
      return Errors.business('invalid_parameter',
        'Configuration key "server.certificateFile" refers to an invalid file (' + certFile + ')',
        true
      );
    }

    if (!fs.existsSync(keyFile)) {
      return Errors.business('invalid_parameter',
        'Configuration key "server.certificateKeyFile" refers to an invalid file (' + keyFile + ')',
        true
      );
    }

    return Promise.resolve({
      cert: fs.readFileSync(certFile, {encoding: 'utf8'}),
      key: fs.readFileSync(keyFile, {encoding: 'utf8'}),
      passphrase: passphrase
    });
  }
}

module.exports = new Certificate();
