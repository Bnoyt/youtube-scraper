/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-04-13.
 */
'use strict';

const fs = require('fs-extra');
const path = require('path');

const destinationFilePathLinux = path.join(__dirname, '..', '..', 'menu.sh');
const inputFilePathLinux = path.join(__dirname, 'updated_scripts', 'menu.sh');

const destinationFilePathDarwin = path.join(__dirname, '..', '..', 'menu.sh.command');
const inputFilePathDarwin = path.join(__dirname, 'updated_scripts', 'menu.sh.command');

const destinationFilePathWin32Menu = path.join(__dirname, '..', '..', 'menu.bat');
const inputFilePathWin32Menu = path.join(__dirname, 'updated_scripts', 'menu.bat');

const destinationFilePathWin32Start = path.join(__dirname, '..', '..', 'start.bat');
const inputFilePathWin32Start = path.join(__dirname, 'updated_scripts', 'start.bat');

const destinationFilePathWin32Stop = path.join(__dirname, '..', '..', 'stop.bat');
const inputFilePathWin32Stop = path.join(__dirname, 'updated_scripts', 'stop.bat');

const destinationFilePathWin32Update = path.join(__dirname, '..', '..', 'update.bat');
const inputFilePathWin32Update = path.join(__dirname, 'updated_scripts', 'update.bat');

/**
 * This is a workaround to solve issue #820.
 * It's needed to update users from version <1.8 to newer versions.
 */
function replaceScript() {
  const platform = process.platform;
  if (platform === 'linux') {
    fs.copySync(inputFilePathLinux, destinationFilePathLinux);
    fs.chmodSync(destinationFilePathLinux, '755');
  } else if (platform === 'darwin') {
    fs.copySync(inputFilePathDarwin, destinationFilePathDarwin);
    fs.chmodSync(destinationFilePathDarwin, '755');
  } else if (platform === 'win32') {
    fs.copySync(inputFilePathWin32Menu, destinationFilePathWin32Menu);
    fs.copySync(inputFilePathWin32Start, destinationFilePathWin32Start);
    fs.copySync(inputFilePathWin32Stop, destinationFilePathWin32Stop);
    fs.copySync(inputFilePathWin32Update, destinationFilePathWin32Update);
  } else {
    throw new Error('No support for platform "' + platform + '"');
  }
}

replaceScript();
console.log('Linkurious manager was updated, please run this script again');
