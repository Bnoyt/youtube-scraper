/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-12-05.
 */
'use strict';

// external libs
const Promise = require('bluebird');

// services
const LKE = require('../index');
const Errors = LKE.getErrors();
const Log = LKE.getLogger(__filename);

// locals
const apiError = require('./apiError');

class API {

  /**
   * @param {boolean} timing Whether to include request/response timing information in response headers
   */
  constructor(timing) {
    this._timing = timing;
  }

  /**
   * Set some additional header for response-time.
   *
   * @param {OutgoingMessage} response
   * @param {number}          requestStart
   */
  _setResponseTiming(response, requestStart) {
    // response timing
    if (this._timing) {
      response.setHeader('X-Response-Time', (Date.now() - requestStart) + 'ms');
    }
  }

  /**
   * @param {OutgoingMessage} response
   * @param {LkError} lkError
   */
  respondToLkError(response, lkError) {
    if (lkError.isTechnical()) {
      Log.error(lkError.type + ':' + lkError.key + ' ' + lkError.message);
      Log.error(lkError.stack);
    } else {
      Log.debug(lkError.type + ':' + lkError.key + ' ' + lkError.message);
    }
    const errorPayload = API.error(lkError);
    response.status(errorPayload.code).json({
      key: errorPayload.key,
      message: errorPayload.message
    });
  }

  /**
   * @param {LkError} error
   * @returns {{code: number, key: string, message: string}}
   */
  static error(error) {
    return apiError(error.key, error.message, error.type);
  }

  /**
   * @param {OutgoingMessage} res
   * @param {Error} err
   */
  respondToGenericError(res, err) {
    Log.error(err);
    res.status(500).json({key: 'critical', message: err + ''});
  }

  /**
   * Configure the response to an API call.
   * e.g.:
   *   app.get(
   *     '/api/toto',
   *     webServer.api(function() { return TotoService.getToto(); }, 200)
   *   );
   *
   * @param {function(IncomingMessage, OutgoingMessage?)} promiseFunction A function returning a promise
   * @param {number}  [successCode=200] The HTTP success status code
   * @param {boolean} [isProxy]         If true, in case of success, don't respond and just
   *                                    call the next handler
   *                                    If true and the return value of the promiseFunction is null,
   *                                    we consider that the handler has *already* responded
   * @param {boolean} [wantResponse]    if true, will give the HTTP response as second parameter
   *                                    to `promiseFunction
   *
   * @returns {function} an API handler that will unroll the following steps at each call
   *                     1) call `promiseFunction.call(null, req)`
   *                     2) read the returned promise and catch any thrown exception
   *                     3) catch the following errors
   *                       - an exception was thrown by `promiseFunction`
   *                       - something else than a promise was returned
   *                       - the promise was rejected
   *                     4) respond to the request
   *                       - send back successCode in case of success + the data returned by
   *                         the promise as JSON
   *                       - send back a custom error (see apiError) message match the custom
   *                         LkError thrown
   *                       - send back a generic error message as a critical LkError
   *                     5) log any technical LkError or generic error
   */
  respond(promiseFunction, successCode, isProxy, wantResponse) {
    // set the default success code
    if (!successCode) { successCode = 200; }

    return (request, response, next) => {
      request.param = API._getParam.bind(undefined, request);

      // use response timing if required
      const requestStart = this._timing ? Date.now() : 0;

      Promise.resolve().then(() => {

        // check promiseFunction
        if (typeof promiseFunction !== 'function') {
          return Errors.technical('bug', 'promiseFunction is not a function', true);
        }

        // run promiseFunction (can throw an exception)
        const promise = wantResponse === true
          ? promiseFunction.call(null, request, response)
          : promiseFunction.call(null, request);

        // check the result of promiseFunction
        if (isProxy && promise === null) {
          // if isProxy=true and null is returned, consider that the response was sent manually
        } else if (promise === null || promise === undefined) {
          return Errors.technical('bug', 'promiseFunction returned null or undefined', true);
        } else if (typeof promise.then !== 'function') {
          return Errors.technical('bug', 'promiseFunction did not return a promise', true);
        }

        // return the promise for the next step
        return promise;

      }).then(data => {
        // success

        if (isProxy && data === null) {
          // if isProxy=true and null is returned, consider that the response was sent manually
        } else if (isProxy && next) {
          // call the next matching handler
          next();
        } else {
          // send a JSON response
          this._setResponseTiming(response, requestStart);
          if (successCode === 204) {
            // 204 response code allows no response body
            response.setHeader('Content-Length', 0);
            response.setHeader('Content-Type', 'application/json');
            response.status(successCode).end();
          } else if (successCode === 302 || successCode === 301) {
            response.setHeader('Location', data);
            response.status(successCode).send('Redirecting ...');
          } else {
            response.status(successCode).json(data);
          }
        }

      }).catch(Errors.LkError, error => {
        // Linkurious custom errors
        this._setResponseTiming(response, requestStart);
        this.respondToLkError(response, error);

      }).catch(error => {
        // generic errors (critical)
        this._setResponseTiming(response, requestStart);
        this.respondToGenericError(response, error);
      });
    };
  }

  /**
   * @param {function(IncomingMessage, OutgoingMessage?)} promiseFunction An handler function that returns a promise
   * @param {boolean}                                     [wantResponse]  If true, pass the HTTP response as second parameter to `promiseFunction` (`undefined` otherwise)
   * @returns {function} a route handler for Express
   */
  proxy(promiseFunction, wantResponse) {
    return this.respond(promiseFunction, undefined, true, wantResponse);
  }

  /**
   * Read a param from an http request (from params, body or query)
   * Must be bound to an `http.IncomingMessage`.
   *
   * @param {IncomingMessage} request
   * @param {string}          key
   * @param {any}             [defaultValue]
   * @returns {any}
   */
  static _getParam(request, key, defaultValue) {
    const urlParams = request.params || {};
    const body = request.body || {};
    const query = request.query || {};

    if (urlParams[key] != null && urlParams.hasOwnProperty(key)) { return urlParams[key]; }
    if (body[key] != null) { return body[key]; }
    if (query[key] != null) { return query[key]; }

    return defaultValue;
  }
}

module.exports = new API(LKE.isTestMode() || LKE.isDevMode());
