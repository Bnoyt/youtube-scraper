/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-06-26.
 */
'use strict';

const cla = require('commander');

const Options = {};

Options.RESET_OPTION = 'reset-config';

/**
 * Options Parser
 *
 * Detects application runtime mode as early as possible.
 * runtime mode is defined as following:
 * - read mode ('test', 'development', 'production') from NODE_ENV
 * - overwrite mode with value from command line (if any)
 *
 * @param {ServiceManager} LKE
 * @returns {{mode: string, resetConfig: boolean}} options
 */
Options.parse = function(LKE) {
  // read mode from shell environment
  let mode = process.env.NODE_ENV;
  if (LKE.MODES.indexOf(mode) === -1) {
    // if the detected mode does not exist in the list of modes,
    // fallback to default mode
    mode = LKE.DEFAULT_MODE;
  }

  // read mode from command line arguments
  cla
    .option('-r, --' + Options.RESET_OPTION, 'Reset the configuration to defaults', false)
    .option('-d, --' + LKE.MODE_DEV, 'Run app in ' + LKE.MODE_DEV + ' mode', false)
    .option('-p, --' + LKE.MODE_PROD, 'Run app in ' + LKE.MODE_PROD + ' mode', false)
    .option('-t, --' + LKE.MODE_TEST, 'Run app in ' + LKE.MODE_TEST + ' mode', false)
    .parse(process.argv);
  LKE.MODES.forEach(m => {
    if (cla[m]) { mode = m; }
  });

  return {
    mode: mode,
    resetConfig: cla.resetConfig
  };
};

module.exports = Options;
