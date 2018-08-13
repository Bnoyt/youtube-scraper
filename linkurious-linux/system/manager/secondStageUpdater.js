/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-08-01.
 */
'use strict';

const fs = require('fs-extra');
const path = require('path');

const ROOT_FILES = process.platform === 'win32'
  ? ['menu.bat', 'start.bat', 'stop.bat']
  : (process.platform === 'darwin'
    ? ['menu.sh.command', 'start.sh.command', 'stop.sh.command']
    : ['menu.sh', 'start.sh', 'stop.sh']
  );

class SecondStageUpdater {
  constructor(linkuriousRoot) {
    this.linkuriousRoot = linkuriousRoot;
  }

  run() {
    // node-unzip removes the +x flag from the root files, here we put it back

    if (process.platform !== 'win32') {
      ROOT_FILES.forEach(f => {
        fs.chmodSync(path.resolve(this.linkuriousRoot, f), '755');
      });
    }
  }
}

module.exports = SecondStageUpdater;
