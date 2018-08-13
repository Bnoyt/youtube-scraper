/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-09-01.
 */
'use strict';

// ext mobs
const Promise = require('bluebird');
const _ = require('lodash');

// our libs
const Logger = require('../../../lib/Logger');

// services
const LKE = require('../index');
const Config = LKE.getConfig();

// consts
const DEFAULT_LOG_FOLDER = 'audit-trail';
const DEFAULT_LOG_FILE_MAX_SIZE = 5242880; // 5MB
const DEFAULT_MODE = 'rw'; // read write mode
const DEFAULT_STRICT_MODE = false;
const DEFAULT_LOG_RESULT = true;

function cleanEdge(edge) {
  return _.pick(edge, ['id', 'data', 'type', 'source', 'target']);
}

function cleanEdgeList(edges) {
  return _.uniqBy(edges, 'id').map(cleanEdge);
}

function cleanNode(node) {
  node = _.pick(node, ['id', 'data', 'categories', 'edges']);
  if (node.hasOwnProperty('edges')) {
    if (node.edges) {
      node.edges = cleanEdgeList(node.edges);
    } else {
      delete node.edges;
    }
  }
  return node;
}

function cleanNodeList(nodes) {
  return _.uniqBy(nodes, 'id').map(cleanNode);
}

function clean(obj) {
  if (obj.hasOwnProperty('edge')) {
    obj.edge = cleanEdge(obj.edge);
  }

  if (obj.hasOwnProperty('edges')) {
    obj.edges = cleanEdgeList(obj.edges);
  }

  if (obj.hasOwnProperty('node')) {
    obj.node = cleanNode(obj.node);
  }

  if (obj.hasOwnProperty('nodes')) {
    obj.nodes = cleanNodeList(obj.nodes);
  }
  return obj;
}

const _default = function() {
  return Promise.resolve();
};

const AuditTrail = {
  read: _default,
  write: _default,
  readWrite: _default
};

if (Config.get('auditTrail.enabled')) {
  let logger;
  if (LKE.isTestMode()) {
    const _testBuffer = [];
    logger = {
      log: function(str) {
        _testBuffer.push(str);
        return Promise.resolve();
      }
    };
    AuditTrail.testBuffer = _testBuffer;
  } else {
    logger = new Logger({
      directory: LKE.dataFile(Config.get(
        'auditTrail.logFolder', DEFAULT_LOG_FOLDER)),
      fileSizeLimit: Config.get(
        'auditTrail.fileSizeLimit', DEFAULT_LOG_FILE_MAX_SIZE)
    });
  }

  process.once('beforeExit', () => {
    logger.end();
  });

  const logResult = Config.get(
    'auditTrail.logResult', DEFAULT_LOG_RESULT);

  const _log = function(mode, user, sourceKey, action, params, result) {
    const line = {
      mode: mode,
      date: new Date(),
      user: user.email,
      sourceKey: sourceKey,
      action: action,
      params: clean(params)
    };

    if (result && logResult) {
      line.result = clean(result);
    }

    return logger.log(JSON.stringify(line) + '\n');
  };

  let log;
  if (Config.get('auditTrail.strictMode', DEFAULT_STRICT_MODE)) {
    log = function() {
      return _log.apply(null, arguments);
    };
  } else {
    log = function() {
      _log.apply(null, arguments);
      return Promise.resolve();
    };
  }

  const mode = Config.get('auditTrail.mode', DEFAULT_MODE);
  if (mode.indexOf('r') !== -1) {
    AuditTrail.read = function(user, sourceKey, action, params, result) {
      return log('READ', user, sourceKey, action, params, result);
    };
  }

  if (mode.indexOf('w') !== -1) {
    AuditTrail.write = function(user, sourceKey, action, params, result) {
      return log('WRITE', user, sourceKey, action, params, result);
    };
  }

  AuditTrail.readWrite = function(user, sourceKey, action, params, result) {
    return log('READ WRITE', user, sourceKey, action, params, result);
  };
}

module.exports = AuditTrail;
