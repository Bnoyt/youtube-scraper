/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-11-25.
 */
'use strict';

// services
const LKE = require('../index');

// locals
const ServerUtils = require('../../lib/utils');

/**
 * Handy service shortcut to use utils.
 *
 * @type {UtilsService}
 */
module.exports = new ServerUtils(LKE.getLogger(__filename)); // TODO #837 type checking, fix for Utils
