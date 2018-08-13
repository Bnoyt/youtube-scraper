/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-06-02.
 */
'use strict';

// external libs
const Promise = require('bluebird');
const request = require('request');
const _ = require('lodash');

// services
const LKE = require('../services/index');
const Errors = LKE.getErrors();
const Log = LKE.getLogger(__filename);
const Utils = LKE.getUtils();

class LkRequest {

  /**
   * Promisified version of the request library.
   * By default it also uses its own cookie jar.
   *
   * @param {any}    options                 Request library options (look at request docs)
   * @param {object} [lkOptions]             Additional options
   * @param {string} [lkOptions.errorPrefix] An error message prefix to be showed in any LkRequest error
   * @constructor
   */
  constructor(options, lkOptions) {
    this._lkOptions = _.defaults({}, lkOptions);
    this._request = request.defaults(_.merge({jar: request.jar()}, options));
  }

  get request() {
    return this._request;
  }

  /**
   * @param {string}   url                  Fully qualified url or last part of an url if baseUrl options is used
   * @param {any}      [options]            Request library options (look at request docs)
   * @param {number[]} [expectedStatusCode] Array of expected status code (if the status is not in here the promise is rejected)
   * @returns {Bluebird<IncomingMessage>}
   */
  get(url, options, expectedStatusCode) {
    return this._doRequest(url, 'get', options, expectedStatusCode);
  }

  /**
   * @param {string}   url                  Fully qualified url or last part of an url if baseUrl options is used
   * @param {any}      [options]            Request library options (look at request docs)
   * @param {number[]} [expectedStatusCode] Array of expected status code (if the status is not in here the promise is rejected)
   * @returns {Bluebird<IncomingMessage>}
   */
  post(url, options, expectedStatusCode) {
    return this._doRequest(url, 'post', options, expectedStatusCode);
  }

  /**
   * @param {string}   url                  Fully qualified url or last part of an url if baseUrl options is used
   * @param {any}      [options]            Request library options (look at request docs)
   * @param {number[]} [expectedStatusCode] Array of expected status code (if the status is not in here the promise is rejected)
   * @returns {Bluebird<IncomingMessage>}
   */
  put(url, options, expectedStatusCode) {
    return this._doRequest(url, 'put', options, expectedStatusCode);
  }

  /**
   * @param {string}   url                  Fully qualified url or last part of an url if baseUrl options is used
   * @param {any}      [options]            Request library options (look at request docs)
   * @param {number[]} [expectedStatusCode] Array of expected status code (if the status is not in here the promise is rejected)
   * @returns {Bluebird<IncomingMessage>}
   */
  patch(url, options, expectedStatusCode) {
    return this._doRequest(url, 'patch', options, expectedStatusCode);
  }

  /**
   * @param {string}   url                  Fully qualified url or last part of an url if baseUrl options is used
   * @param {any}      [options]            Request library options (look at request docs)
   * @param {number[]} [expectedStatusCode] Array of expected status code (if the status is not in here the promise is rejected)
   * @returns {Bluebird<IncomingMessage>}
   */
  delete(url, options, expectedStatusCode) {
    return this._doRequest(url, 'delete', options, expectedStatusCode);
  }

  /**
   * Build a critical LkError. The resulting error message is the concatenation of `errorPrefix`
   * and `msg`.
   *
   * @param {string} msg
   * @returns {LkError}
   * @private
   */
  _buildError(msg) {
    if (Utils.hasValue(this._lkOptions.errorPrefix)) {
      return Errors.technical('critical', this._lkOptions.errorPrefix + ': ' + msg);
    } else {
      return Errors.technical('critical', msg);
    }
  }

  /**
   * @param {string}   url                  Fully qualified url or last part of an url if baseUrl options is used
   * @param {string}   method               Http method ('get', 'post' etc.)
   * @param {any}      [options]            Request library options (look at request docs)
   * @param {number[]} [expectedStatusCode] Array of expected status code (if the status is not in here the promise is rejected)
   * @returns {Bluebird<IncomingMessage>}
   * @private
   */
  _doRequest(url, method, options, expectedStatusCode) {
    options = _.merge({uri: url, method: method}, options);
    return new Promise((resolve, reject) => {
      this._request(options, (error, response) => {
        if (error) {
          reject(this._buildError(error.message));
        } else {
          if (Utils.hasValue(expectedStatusCode) &&
            !_.includes(expectedStatusCode, response.statusCode)) {
            if (Utils.hasValue(response.body)) {
              Log.error('Unexpected response: ' + JSON.stringify(response.body));
            }
            reject(this._buildError(
              'Unexpected status code: ' + response.statusCode + ' (URL: ' + url + ')'
            ));
          }
          resolve(response);
        }
      });
    });
  }

  /**
   * Stream that will resolve only when the status code is among the expected status code.
   *
   * The resolved stream is paused to overcome this issue:
   * https://github.com/request/request/issues/887
   *
   * @param {string}   url                  Fully qualified url or last part of an url if baseUrl options is used
   * @param {string}   method               Http method ('get', 'post' etc.)
   * @param {any}      [options]            Request library options (look at request docs)
   * @param {number[]} [expectedStatusCode] Array of expected status code (if the status is not in here the promise is rejected)
   * @returns {Bluebird<Readable<Buffer>>}
   */
  getStream(url, method, options, expectedStatusCode) {
    options = _.merge({uri: url, method: method}, options);

    return new Promise((resolve, reject) => {
      const stream = this._request(options)
        .on('response', response => {
          if (Utils.hasValue(expectedStatusCode) &&
            !_.includes(expectedStatusCode, response.statusCode)) {
            if (Utils.hasValue(response.body)) {
              Log.error('Unexpected response: ' + response.body);
            }
            reject(this._buildError(
              'Unexpected status code: ' + response.statusCode + ' (URL: ' + url + ')'
            ));
          } else {
            stream.removeAllListeners();
            stream.pause();
            resolve(stream);
          }
        })
        .on('error', error => {
          reject(this._buildError(error.message));
        });
    });
  }
}

module.exports = LkRequest;
