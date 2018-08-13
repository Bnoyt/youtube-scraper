/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-03-24.
 */
'use strict';

// internal libs
const path = require('path');

// external libs
const _ = require('lodash');
const Promise = require('bluebird');
const rfs = require('rotating-file-stream');
const targz = require('tar.gz');
/**@type {any}*/ // promisifyAll doesn't work well with static typing
const fs = Promise.promisifyAll(require('fs-extra'));

// services
const LKE = require('../index');
const Utils = LKE.getUtils();
const Config = LKE.getConfig();
const Errors = LKE.getErrors();
const Log = LKE.getLogger(__filename);
const UserDAO = LKE.getUserDAO();

const SUPPORTED_EVENT_TYPES = ['identify', 'track', 'page', 'group'];
// we don't support 'alias' and 'screen' types
const SUPPORTED_EVENT_TYPES_EXTERNAL = ['identify', 'track', 'page'];
// 'group' type can only be triggered internally (not with the API)

const NUMBER_OF_ANALYTICS_FILES = 50;
const MAX_SIZE_UNCOMPRESSED = '5M';

class AnalyticsService {
  constructor() {
    this._logDirPath = LKE.dataFile('logs');
    const filePath = this._logDirPath + '/analytics.log';
    this._customerId = Config.get('customerId');
    this._stream = rfs(filePath, {
      size: MAX_SIZE_UNCOMPRESSED,
      compress: 'gzip',
      maxFiles: NUMBER_OF_ANALYTICS_FILES
    });

    this.enabled = true; // state of the service

    this._reportFilePath = LKE.dataFile(this.reportFileName);
    this._reportTmpDirPath = LKE.dataFile('reportTmp');
    this._cachedReportPromise = null; // we cache the promise to avoid computing the compression concurrently

    this._stream.on('error', err => {
      // the stream is closed automatically if an error occurs
      Log.error('Blocking error in the analytics service: ', err);

      this.enabled = false; // we don't recover from a blocking error, this service will be disabled
    });
  }

  get reportFileName() {
    // todo: include the customer-id and the iso-date in the filename for easier triage
    return 'linkurious-logs.tar.gz';
  }

  /**
   * Validate an event. It has to follow the Segment Spec.
   *
   * @param {any}     event    Event in the the Segment Spec format
   * @param {boolean} external Whether the event comes from the API
   * @private
   * @throws {LkError} if the event doesn't follow the Segment Spec
   */
  static _validateEvent(event, external) {
    Utils.check.object('event', event);

    const supportedEventTypes = external ? SUPPORTED_EVENT_TYPES_EXTERNAL : SUPPORTED_EVENT_TYPES;

    switch (event.type) {
      case 'track':
      case 'page':
        Utils.check.properties('event', event, {
          event: {required: event.type === 'track', check: 'nonEmpty'},
          properties: {required: false, check: 'object'},
          name: {required: event.type === 'page', check: 'nonEmpty'},
          type: {required: true, values: supportedEventTypes},
          groupId: {required: event.type === 'group', check: 'nonEmpty'},
          userId: {required: true, check: 'nonEmpty'},
          context: {required: false, check: 'object'},
          timestamp: {required: false, check: ['date', true]}
        });
        break;
      case 'identify':
      case 'group':
      default:
        Utils.check.properties('event', event, {
          traits: {required: false, check: 'object'},
          type: {required: true, values: supportedEventTypes},
          groupId: {required: event.type === 'group', check: 'nonEmpty'},
          userId: {required: true, check: 'nonEmpty'},
          context: {required: false, check: 'object'},
          timestamp: {required: false, check: ['date', true]}
        });
    }

  }

  /**
   * Log the Analytics events to disk. All the events are collected in a queue of
   * `NUMBER_OF_ANALYTICS_FILES` gzipped files with a max size of `MAX_SIZE_UNCOMPRESSED`.
   *
   * @param {any}        event    Event in the the Segment Spec format
   * @param {PublicUser} [user]   The user which the event refers to
   * @param {boolean}    external Whether the event comes from the API
   * @returns {Bluebird<void>}
   */
  postEvent(event, user, external) {
    if (!this.enabled) { return Promise.resolve(); }

    return Promise.resolve().then(() => {
      let userId = this._customerId + ':';
      if (Utils.hasValue(event.userId)) {
        userId += event.userId;
      } else if (Utils.noValue(user)) {
        userId += 'anonymous';
      } else if (user.id === UserDAO.model.UNIQUE_USER_ID) {
        userId += 'uniqueUser';
      } else {
        userId += user.id;
      }

      event.userId = userId;
      event = _.merge({timestamp: new Date()}, event);
      AnalyticsService._validateEvent(event, external);

      this._stream.write(JSON.stringify(event) + '\n', err => {
        if (err) {
          Log.warn('Can\'t save analytics event: ', err, event);
        }
      }); // we don't wait for the callback
    });
  }

  /**
   * Create a report containing the analytics and the log files.
   *
   * @param {boolean} [withConfiguration] Whether to include the configuration within the tarball
   * @returns {Bluebird<string>}
   */
  createReport(withConfiguration) {
    if (Utils.hasValue(this._cachedReportPromise)) {
      return this._cachedReportPromise;
    }

    // 1) create a tmp directory
    this._cachedReportPromise = fs.ensureDirAsync(this._reportTmpDirPath).then(() => {
      // 2) copy the content of logDirPath to the tmp directory
      return fs.copyAsync(this._logDirPath, this._reportTmpDirPath);
    }).then(() => {
      // 3) optionally, copy the configuration file to the tmp directory
      if (withConfiguration) {
        return fs.writeJsonSync(
          path.join(this._reportTmpDirPath, 'production.json'),
          Config.get(undefined, {}, false, true),
          {spaces: 2, replacer: null}
        );
      }
    }).then(() => {
      // 4) tar.gz the tmp directory
      return targz().compress(this._reportTmpDirPath, this._reportFilePath);
    }).catch(err => {
      return Errors.technical('critical', err, true);
    }).finally(() => {
      // 5) remove the tmp directory
      return fs.removeAsync(this._reportTmpDirPath).catch(err => {
        Log.error('Can\'t remove report temporary directory: ', err);
      });
    }).then(() => {
      this._cachedReportPromise = null;
      return this._reportFilePath;
    });

    return this._cachedReportPromise;
  }
}

module.exports = new AnalyticsService();
