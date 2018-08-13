/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-05-18.
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../index');
const Log = LKE.getLogger(__filename);
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();

// We can't sleep for more than 24 days (setTimeout() use a 32 bit int to store the delay)
const MAX_MILLISEC_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // A week

class Task {
  /**
   * @param {number}        id
   * @param {Bluebird<any>} promise
   * @param {string}        timeToSchedule Date of next run in ISO-8601 format
   * @param {string}        status         ("waiting", "running", "cancelled")
   */
  constructor(id, promise, timeToSchedule, status) {
    this.id = id;
    this.promise = promise;
    this.timeToSchedule = timeToSchedule;
    this.status = status;
  }
}

class SchedulerService {

  constructor() {
    /**
     * @type {Map<string, Semaphore>}
     */
    this._semaphores = new Map();

    /**
     * @type {Map<number, Task>}
     */
    this._tasks = new Map();

    this._nextId = 0;
  }

  /**
   * Set the concurrency for task group with name `groupName` to `maxGroupConcurrency`.
   * All the functions scheduled with this key will run accordingly to the group max concurrency.
   *
   * @param {string} groupName
   * @param {number} [maxGroupConcurrency] Concurrency limit
   *
   * @throws {LkError} if `groupName` is not valid
   */
  setGroupConcurrency(groupName, maxGroupConcurrency) {
    Utils.check.string('groupName', groupName, true);

    this._semaphores.set(
      groupName,
      maxGroupConcurrency ? Utils.semaphore(maxGroupConcurrency) : undefined
    );
  }

  /**
   * Cancel the execution of a given task by id.
   *
   * @param {number}  taskId
   * @returns {boolean} True, if cancelled
   */
  cancel(taskId) {
    const task = this._tasks.get(taskId);
    if (task) {
      if (task.status !== 'running') {
        Log.debug(`Scheduler: Task #${taskId} was cancelled (wasn't running).`);
        task.promise.cancel();

      } else {
        Log.debug(`Scheduler: Task #${taskId} was cancelled (interrupting running task).`);
        task.promise.cancel();
      }

      task.status = 'cancelled';

      return true;
    }
    return false;
  }

  /**
   * Get the date of the next execution of a given task by id.
   *
   * @param {number} taskId
   *
   * @returns {string} Date of next run in ISO-8601 format
   */
  getTimeToSchedule(taskId) {
    const task = this._tasks.get(taskId);
    if (task) {
      return task.timeToSchedule;
    } else if (taskId > 0 && taskId < this._nextId) {
      throw Errors.technical(
        'invalid_parameter', 'This task is not available anymore (the task was deleted).');
    }
    throw Errors.technical('invalid_parameter', '"taskId" is not valid.');
  }

  /**
   * Get the promise of the next execution of a given task by id.
   * If the task was deleted, it will return a rejected promise.
   *
   * @param {number} taskId
   *
   * @returns {Bluebird<any>} Promise of the task fulfilment
   */
  getPromise(taskId) {
    const task = this._tasks.get(taskId);
    if (task) {
      return task.promise;
    } else if (taskId > 0 && taskId < this._nextId) {
      return Errors.technical(
        'invalid_parameter', 'This task is not available anymore (the task was deleted).', true
      );
    }
    return Errors.technical('invalid_parameter', '"taskId" is not valid.', true);
  }

  /**
   * Get the status of a given task by id.
   * Possible status are: "waiting", "running", "cancelled", "unavailable".
   *
   * @param {number} taskId
   *
   * @returns {string | null} null (if invalid ID), "waiting", "running", "cancelled",
   *                               "unavailable"
   */
  getStatus(taskId) {
    const task = this._tasks.get(taskId);
    if (task) {
      return task.status;
    } else if (taskId > 0 && taskId < this._nextId) {
      return 'unavailable';
    } else {
      return null;
    }
  }

  /**
   * Return a resolved promise when Date.now() equals `epoch`.
   *
   * @param {number} epoch
   * @returns {Bluebird<any>}
   * @private
   */
  _delay(epoch) {
    const loop = () => {
      const millisToWait = epoch - Date.now();

      if (millisToWait <= 0) {
        // if epoch is minor or equal to Date.now() we resolve immediately
        return Promise.resolve();
      }

      const timeToWaitThisLoop = Math.min(millisToWait, MAX_MILLISEC_TIMEOUT);

      return Promise.delay(timeToWaitThisLoop).then(loop);
    };

    return loop();
  }

  /**
   * Look at scheduleTaskOnce.
   *
   * @param {function(): Bluebird<any>} f
   * @param {string} cronExpression    A CRON expression
   * @param {object} options
   * @param {Date}   [options.lastRun=new Date()] Date of the last run
   * @param {string} [options.group]   Group of this task (used for concurrency control)
   * @param {number} taskId            ID of the scheduled task
   * @private
   */
  _scheduleTaskOnce(f, cronExpression, options, taskId) {
    const semaphore = this._semaphores.get(options.group);

    try {
      const timeToSchedule = Utils.nextTimeToSchedule(cronExpression, options.lastRun);
      const promise = this._delay(timeToSchedule.getTime()).then(() => {
        if (semaphore) {
          return semaphore.acquire();
        }
      }).then(() => {
        if (this.getStatus(taskId) === 'cancelled') {
          return;
        }

        this._tasks.get(taskId).status = 'running';

        Log.debug(`Scheduler: Task #${taskId} is now running.`);
        return f().finally(() => {
          Log.debug(`Scheduler: Task #${taskId} is no longer running.`);
        });

      }).catch(Promise.CancellationError, () => {
        // ignore cancellation rejections
      });

      promise.catch(err => {
        Log.error(`Scheduler: Task ${taskId} threw an error while running.`, err);
      }).finally(() => {
        if (semaphore) {
          semaphore.release();
        }
      });

      this._tasks.set(taskId, new Task(taskId, promise, timeToSchedule.toISOString(), 'waiting'));

    } catch(e) {
      Log.error('We should never be here since we assumed that both cron and lastRun were valid',
        cronExpression, options.lastRun.toISOString());
    }
  }

  /**
   * @param {function(): Bluebird<any>} f
   * @param {string} cron            A CRON expression
   * @param {object} options
   * @param {Date}   [options.lastRun=new Date()] Date of the last run
   * @param {string} [options.group] Within a group the functions will run accordingly to the group max
   *                                 concurrency. If the function returns a promise, the semaphore will
   *                                 be released only after the returned promise is resolved.
   * @throws {LkError} if `f`, `cron`, `options.group` or `options.lastRun` are not valid.
   * @private
   */
  static _checkArgs(f, cron, options) {
    Utils.check.function('function', f);
    Utils.check.cronExpression('cron', cron);

    if (options.group) {
      Utils.check.string('group', options.group);
    }

    Utils.check.date('lastRun', options.lastRun);
  }

  /**
   * Schedule a task to run only once at the first time after a given date (lastRun) that match
   * the CRON expression.
   *
   * @param {function(): Bluebird<any>} f
   * @param {string} cronExpression  A CRON expression
   * @param {object} [options]
   * @param {Date}   [options.lastRun=new Date()] Date of the last run
   * @param {string} [options.group] Within a group the functions will run accordingly to the group max
   *                                 concurrency. If the function returns a promise, the semaphore will
   *                                 be released only after the returned promise is resolved.
   *
   * @returns {number} id
   * @throws {LkError} if `f`, `cron`, `options.group` or `options.lastRun` are not valid.
   */
  scheduleTaskOnce(f, cronExpression, options) {
    options = Utils.hasValue(options) ? _.cloneDeep(options) : {};

    if (Utils.noValue(options.lastRun)) {
      options.lastRun = new Date();
    }

    SchedulerService._checkArgs(f, cronExpression, options);

    const id = this._nextId++;
    this._scheduleTaskOnce(f, cronExpression, options, id);

    this.getPromise(id).catch(() => {
      // We have already logged the error on _scheduleTaskOnce
    }).finally(() => {
      this._tasks.delete(id);
    });

    return id;
  }

  /**
   * Schedule a task to run periodically according to a given CRON expression.
   * if options.lastRun is defined, it checks if it should have been executed between lastRun and
   * currentDate. If yes, it will also execute the function immediately.
   *
   * @param {function(): Bluebird<any>} f
   * @param {string}  cronExpression  A CRON expression
   * @param {object}  [options]
   * @param {Date}    [options.lastRun=new Date()] Date of the last run
   * @param {string}  [options.group] Within a group the functions will run accordingly to the group max
   *                                  concurrency. If the function returns a promise, the semaphore will
   *                                  be released only after the returned promise is resolved.
   * @param {boolean} [options.cancelOnError=false]
   *
   * @returns {number} id
   * @throws {LkError} if `f`, `cron`, `options.group` or `options.lastRun` are not valid.
   */
  scheduleTask(f, cronExpression, options) {
    options = Utils.hasValue(options) ? _.cloneDeep(options) : {};

    if (Utils.noValue(options.lastRun)) {
      options.lastRun = new Date();
    }

    SchedulerService._checkArgs(f, cronExpression, options);

    const id = this._nextId++;

    /**
     * @returns {Bluebird<any>}
     */
    const loop = () => {
      if (this.getStatus(id) === 'cancelled') { return Promise.resolve(); }

      this._scheduleTaskOnce(f, cronExpression, options, id);
      if (options.lastRun) {
        options.lastRun = undefined;
      }

      return this.getPromise(id)
        .then(loop)
        .catch(() => {
          if (options.cancelOnError) { return; }
          return loop();
        }).finally(() => {
          this._tasks.delete(id);
        });
    };

    loop();

    return id;
  }
}

module.exports = new SchedulerService();
