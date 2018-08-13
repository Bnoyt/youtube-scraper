/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-11-26.
 */
'use strict';

// Codes and/or names should identify any status unically
// Codes are inspired from http codes:
// - 1** : Processing / information
// - 2** : Ok
// - 4** : backend external error
// - 5** : backend related error

// services
const LKE = require('../index');
const Config = LKE.getConfig();

const STATUSES = {

  Linkurious: [
    {
      code: 100,
      name: 'starting',
      message: 'Starting Linkurious in ' + Config.mode + ' mode...'
    },
    {
      code: 200,
      name: 'initialized',
      message: 'Linkurious ready to go :)'
    },
    {
      code: 400,
      name: 'error',
      message: 'Some components of Linkurious are not working properly.'
    },
    {
      code: 500,
      name: 'unknown_error',
      message: 'Linkurious encountered an unexpected error.'
    }
  ],

  SqlDB: [
    {
      code: 100,
      name: 'starting',
      message: 'Starting SQL database'
    },
    {
      code: 101,
      name: 'up',
      message: 'The SQL database is up.'
    },
    {
      code: 200,
      name: 'synced',
      message: 'The SQL database is synced.'
    },
    {
      code: 401,
      name: 'down',
      message: 'Could not connect to the SQL database.'
    },
    {
      code: 402,
      name: 'sync_error',
      message: 'We could not write to the SQL database, please check its status and configuration'
    }
  ],

  DataService: [
    {
      code: 100,
      name: 'starting',
      message: 'Starting data service.'
    },
    {
      code: 200,
      name: 'up',
      message: 'Data-sources ready.'
    },
    {
      code: 201,
      name: 'indexing',
      message: 'A data-source is currently indexing.'
    },
    {
      code: 401,
      name: 'down',
      message: 'Could not connect to any data-source.'
    }
  ],

  WebServer: [
    {
      code: 100,
      name: 'starting',
      message: 'Starting Web Server'
    },
    {
      code: 200,
      name: 'ready',
      message: 'The Web Server ready.'
    },
    {
      code: 400,
      name: 'error',
      message: 'The Web Server could not start.'
    },
    {
      code: 401,
      name: 'port_busy',
      message: 'The Web Server could not start: the port is busy.'
    },
    {
      code: 403,
      name: 'port_restricted',
      message:
        'The Web Server could not start: root access is required to listen to ports under 1024'
    }
  ]
};

module.exports = STATUSES;
