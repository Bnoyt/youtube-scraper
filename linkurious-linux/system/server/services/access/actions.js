/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-06-19.
 */
'use strict';

const _ = require('lodash');

/**
 * Actions that can be set to a custom group.
 */
const PUBLIC_ACTIONS = [
  {
    key: 'admin.connect',
    description: 'Connect the data-source and read the configuration'
  },
  {
    key: 'admin.index',
    description: 'Index the data-source and read the configuration'
  },
  {
    key: 'admin.users',
    description: 'Manage the users in the data-source'
  },
  {
    key: 'admin.alerts',
    description: 'Manage the alerts in the data-source'
  },
  {
    key: 'admin.report',
    description: 'Generate analytics report'
  },
  {
    key: 'rawReadQuery',
    description: 'Send cypher queries to the graph (read)'
  },
  {
    key: 'rawWriteQuery',
    description: 'Send cypher queries to the graph (write)'
  }
];

/**
 * Actions that can't be set to a custom group.
 */
const PRIVATE_ACTIONS = [
  {
    key: 'admin.app',
    description: 'Manage applications'
  },
  {
    key: 'admin.users.delete',
    description: 'Delete users'
  },
  {
    key: 'admin.config',
    description: 'Set the configuration'
  },
  {
    key: 'admin.resetDefaults',
    description: 'Reset design and captions of all sandboxes of the given data-source'
  }
];

const Actions = {};

/**
 * All action keys for a custom group.
 *
 * @type {string[]}
 */
Actions.PUBLIC_ACTIONS = _.map(PUBLIC_ACTIONS, 'key');

const PUBLIC_MAP = _.keyBy(PUBLIC_ACTIONS, 'key');
const PRIVATE_MAP = _.keyBy(PRIVATE_ACTIONS, 'key');

/**
 * Return true if this action key exists.
 *
 * @param {string} key The action key
 * @returns {boolean}
 */
Actions.exists = function(key) { return !!PUBLIC_MAP[key] || !!PRIVATE_MAP[key]; };

module.exports = Actions;
