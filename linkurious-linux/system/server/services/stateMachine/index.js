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

function StateMachine() {

  const base = this;

  base.state = {};
  let application = {};

  // initializing all components
  const components = {};

  /**
   * @param {string} name component name
   * @returns {StatusChannel}
   */
  function getComponent(name) {
    if (!name) {
      throw new Error('Bad component name : "' + name + '"');
    }
    const c = components[name.toLowerCase()];
    if (!c) {
      throw new Error('Component not found: "' + name + '"');
    }
    return c;
  }

  /**
   * Detect changes in components and update the
   * state of the application-component accordingly.
   */
  function onComponentUpdate() {
    if (application.get().code === 500) {
      // manually set code, stay failed
      return;
    }

    let starting = 0;
    let error = 0;
    let ready = 0;
    let total = 0;
    _.forEach(components, c => {
      if (c.componentName === 'Linkurious') { return; }
      const code = c.get().code;
      ++total;
      if (code < 200) { ++starting; }
      if (code >= 200 && code < 300) { ++ready; }
      if (code >= 400) { ++error; }
    });

    if (error > 0) {
      application.set('error');
    } else if (starting > 0) {
      application.set('starting');
    } else if (ready === total) {
      application.set('initialized');
    }
  }

  const StatusChannel = require('./StatusChannel');
  const statuses = require('./ComponentStatuses');
  _.forEach(statuses, (componentStatuses, componentName) => {
    const c = new StatusChannel(componentName, componentStatuses);
    components[componentName.toLowerCase()] = c;

    // '100' is the init code for all components
    c.set(100);

    // listen to changes if not main component
    if (componentName !== 'Linkurious') {
      c.on('update', onComponentUpdate);
    } else {
      application = getComponent('Linkurious');
    }
  });

  application.on('update', status => {
    base.state = status;
  });

  /**
   * Set the current status for a component. Will emit to all listeners.
   *
   * @param {String} [componentName='Linkurious'] - the name of a component.
   * @param {String|number} nameOrCode - name or code of the status we want to set
   * @param {String} [message] - additional info for the status
   */
  this.set = function(componentName, nameOrCode, message) {
    if (!componentName) { componentName = 'Linkurious'; }
    getComponent(componentName).set(nameOrCode, message);
  };

  /**
   * Get the current status of a component.
   *
   * @param {String} [componentName='Linkurious'] the name of a component.
   * @returns {Object} the current status of the given component
   */
  this.get = function(componentName) {
    if (!componentName) { componentName = 'Linkurious'; }
    return getComponent(componentName).get();
  };

  //this.isOk = function(componentName) {
  //  if (!componentName) { componentName = 'Linkurious'; }
  //  var code = getComponent(componentName).get().code;
  //  return code >= 200 && code < 300;
  //};

  //this.on = channel.on;
  //this.broadcast = channel.broadcast;
  //this.emit = channel.emit;

  /**
   * Listen for a specific status.
   *
   * @param {String} componentName - name of the component we want to listen to updates for
   * @param {String} statusName - the status we want to be notified of
   * @param {Function} callback - a callback to notify us that the listened status happened
   * @param {Boolean} [once] will notify once only if true
   */
  this.on = function(componentName, statusName, callback, once) {
    const innerCallback = function(status) {
      if (status.name === statusName) {
        if (once === true) {
          getComponent(componentName).removeListener('update', innerCallback);
        }
        callback();
      }
    };
    getComponent(componentName).on('update', innerCallback);
  };

  /**
   * Listen for a specific status ONCE
   *
   * @param {String} componentName - name of the component we want to listen to updates for
   * @param {String} statusName - the status we want to be notified of
   * @param {Function} callback - a callback to notify us that the listened status happened
   */
  this.once = function(componentName, statusName, callback) {
    this.on(componentName, statusName, callback, true);
  };

  return this;
}

module.exports = new StateMachine();
