/**
 * LINKURIOUS CONFIDENTIAL
 * __________________
 *
 *  [2012] - [2014] Linkurious SAS
 *  All Rights Reserved.
 *
 */
'use strict';

const _ = require('lodash');
const util = require('util');
const EventEmitter = require('events');
const LKE = require('../index');
const Log = LKE.getLogger(__filename);

const StatusChannel = function(name, statuses) {
  this.componentName = name;
  this.availableStatuses = statuses;
  this.o = {startTime: Date.now()};
  return this;
};

// extend the EventEmitter class using our Status class
util.inherits(StatusChannel, EventEmitter);

StatusChannel.prototype.broadcast = function() {
  const logType = this.o.code >= 400 ? 'error' : 'info';
  Log[logType]('Status [' + this.componentName + ']', this.o.code, ':',
    this.o.message, this.o.resource !== undefined ? this.o.resource : ''
  );

  this.emit('update', this.o);
};

/**
 * @returns {{code:number, name:string, message:string, uptime:number}}
 */
StatusChannel.prototype.get = function() {
  return {
    code: this.o.code,
    name: this.o.name,
    message: this.o.message,
    uptime: Math.floor((Date.now() - this.o.startTime) / 1000)
  };
};

/**
 * @param {string|number} nameOrCode
 * @param {string} [message]
 * @param {string} [resource]
 * @returns {StatusChannel}
 */
StatusChannel.prototype.set = function(nameOrCode, message, resource) {
  //if (!this.o) { this.o = {}; }

  // cases where the status name/code did not change
  const isCode = _.isFinite(nameOrCode);
  if (isCode && nameOrCode === this.o.code) { return this; }
  if (!isCode && nameOrCode === this.o.name) { return this; }

  const matchingStatus = _.find(this.availableStatuses, status => {
    return isCode ? status.code === parseInt(nameOrCode) : status.name === nameOrCode;
  });

  if (!matchingStatus) {
    throw new Error('Unknown message type. nameOrCode:' + nameOrCode);
  }

  this.o.code = matchingStatus.code;
  this.o.name = matchingStatus.name;
  this.o.message = message !== undefined ? message : matchingStatus.message;
  this.o.resource = resource;
  this.broadcast();

  return this;
};

module.exports = StatusChannel;
