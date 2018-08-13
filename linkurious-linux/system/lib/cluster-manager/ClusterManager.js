/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-03-02.
 */
'use strict';

const cluster = require('cluster');
const Promise = require('bluebird');
const Task = require('./Task');
const Job = require('./Job');
const Response = require('./Response');
const LOCAL_WORKER_ID = -1;

class ClusterManager {

  /**
   * @param {Task[]} tasks
   * @param {object} [logger]
   * @param {?function} [logger.info=console.info] Info logger (null to disable)
   * @param {?function} [logger.warn=console.warn] Warning logger (null to disable)
   * @param {?function} [logger.error=console.error] Error logger (null to disable)
   */
  constructor(tasks, logger) {
    this.logger = logger || {};
    if (this.logger.info === undefined) { this.logger.info = console.info; }
    if (this.logger.warn === undefined) { this.logger.warn = console.warn; }
    if (this.logger.error === undefined) { this.logger.error = console.error; }

    /**
     * @type {number}
     */
    this.workers = undefined;

    /**
     * @type {Map<string, Task>}
     */
    this.tasks = new Map();
    tasks.forEach(task => this.tasks.set(task.name, task));

    /**
     * @type {Job[]}
     */
    this.queuedJobs = [];

    /**
     * @type {Map<number, Job>}
     */
    this.runningJobs = new Map();

    /**
     * Job IDs indexed by Worker ID
     * @type {Map<number, number>}
     */
    this.busyWorkers = new Map();

  }

  /**
   * Start the master (forks the worker processes)
   *
   * @param {number} [workers=1]
   */
  startMaster(workers) {
    /**
     * @type {number}
     */
    this.workers = workers === null || workers === undefined ? 1 : workers;
    if (this.workers === 0) {
      this.log('warn', 'Initializing ClusterManager with 0 workers, tasks will run locally.');
    }

    if (!cluster.isMaster) {
      throw new Error('startMaster called on non-master process');
    }

    // when a worker is forked, initialize listeners for this worker
    cluster.on('fork', worker => {
      // listen for worker message
      worker.on('message', message => this._onWorkerMessage(worker.id, message));

      // when a worker arrives online, try to launch a job
      worker.on('online', () => this._tryNextJob());

      // when a worker disconnects, try to fork a new workers
      worker.on('exit', () => {
        this.log('warn', `Worker #${worker.id} exited`);

        // check for a running tasks in this worker
        const jobId = this.busyWorkers.get(worker.id);
        if (jobId !== undefined) {
          this.busyWorkers.delete(worker.id);
          const job = this.runningJobs.get(jobId);
          if (job !== undefined) {
            this.runningJobs.delete(jobId);
            // reschedule the job in front of the queue
            this.log(
              'warn',
              `Worker #${worker.id} exited during job #${job.id} (${job.taskName}), rescheduling.`
            );
            this.queuedJobs.unshift(job);
          }
        }
        // a worker just died, create a fresh one
        this._forkWorkers();
      });
    });

    // initial fork
    this._forkWorkers();
  }

  /**
   * Start a worker.
   */
  startWorker() {
    if (!cluster.isWorker) {
      throw new Error('startWorker called on non-worker process');
    }
    process.on('message', message => this._onMasterMessage(message));
  }

  /**
   * @param {string} level ("info", "warn" or "error")
   * @param {string} message
   */
  log(level, message) {
    if (typeof this.logger[level] !== 'function') { return; }
    this.logger[level]((
      cluster.isMaster
        ? '[master]'
        : `[worker#${cluster.worker.id}]`
    ) + ': ' + message);
  }

  /**
   * @constructor
   */
  static get Task() {
    return Task;
  }

  //noinspection JSMethodCanBeStatic
  /**
   * @returns {boolean}
   */
  get isMaster() {
    return cluster.isMaster;
  }

  _forkWorkers() {
    if (!cluster.isMaster) { return; }
    while (Object.keys(cluster.workers).length < this.workers) {
      this.log('info', 'Forking a new worker');
      cluster.fork();
    }
  }
  /**
   * Handle message from workers
   *
   * @param {number} workerId
   * @param {object} response
   * @param {number} response.jobId
   * @param {boolean} response.success
   * @param {*} response.result
   * @param {*} response.error
   * @private
   */
  _onWorkerMessage(workerId, response) {
    this.busyWorkers.delete(workerId);

    const job = this.runningJobs.get(response.jobId);
    this.runningJobs.delete(response.jobId);
    job.end = Date.now();
    this.log('info', `Job #${job.id} (${job.taskName}) finished (runtime: ${job.runTime}ms).`);
    if (response.success) {
      job.resvolveCallback(response.result);
    } else {
      job.rejectCallback(response.error);
    }
    this._tryNextJob();
  }

  /**
   * Handle messages from master.
   *
   * @param {object} newJob
   * @param {number} newJob.id
   * @param {string} newJob.taskName
   * @param {object} newJob.parameters
   * @private
   */
  _onMasterMessage(newJob) {
    const response = new Response(newJob.id);

    const task = this.tasks.get(newJob.taskName);
    if (!task) {
      const error = `Task "${newJob.taskName}" was found.`;
      this.log('error', error);
      this._sendToMaster(response.withError(error));
    }

    try {
      const returnValue = task.handler.call(null, newJob.parameters);
      if (returnValue && typeof returnValue.then === 'function') {
        returnValue.then(result => {
          this._sendToMaster(response.withResult(result));
        }).catch(error => {
          this._sendToMaster(response.withError(error));
        });
      } else {
        this._sendToMaster(response.withResult(returnValue));
      }
    } catch(error) {
      this._sendToMaster(response.withError(error));
    }
  }

  /**
   * Send results back to the master.
   *
   * @param {Response} response
   * @private
   */
  _sendToMaster(response) {
    if (this.workers === 0) {
      this._onWorkerMessage(LOCAL_WORKER_ID, response.serialize());
    }
    if (!cluster.isWorker) { return; }
    process.send(response.serialize());
  }

  /**
   * Send a message to a worker.
   *
   * @param {number} workerId
   * @param {Job} newJob
   * @private
   */
  _sendToWorker(workerId, newJob) {
    if (!cluster.isMaster) { return; }
    if (workerId === LOCAL_WORKER_ID) {
      this._onMasterMessage(newJob.serialize());
    }
    cluster.workers[workerId].send(newJob.serialize());
  }

  /**
   *
   * @param {Job} [newJob]
   * @private
   */
  _tryNextJob(newJob) {
    // if a job was provided, add it to the queue
    if (newJob) {
      this.queuedJobs.push(newJob);
    }

    // if there is nothing to do, return here
    if (this.queuedJobs.length === 0) {
      return;
    }

    const workerId = this._getIdleWorker();
    if (workerId !== null) {
      const job = this.queuedJobs.shift();
      this.runningJobs.set(job.id, job);
      this.busyWorkers.set(workerId, job.id);
      job.start = Date.now();
      this.log('info', `Job #${job.id} (${job.taskName}) started on worker #${workerId}` +
        ` (waited ${job.waitTime}ms).`
      );
      this._sendToWorker(workerId, job);
    }
  }

  /**
   * @returns {number|null} workerId
   * @private
   */
  _getIdleWorker() {
    // let jobs run locally when workers=0
    if (this.workers === 0) { return LOCAL_WORKER_ID; }

    const workerIds = Object.keys(cluster.workers);
    for (let i = 0; i < workerIds.length; ++i) {
      const worker = cluster.workers[workerIds[i]];
      // if worker is connected AND is alive AND is not busy
      if (worker.isConnected() && !worker.isDead() && !this.busyWorkers.has(worker.id)) {
        return worker.id;
      }
    }
    return null;
  }

  /**
   * @param {string} taskName
   * @param {object} taskParameters
   * @returns {Promise.<*>}
   */
  startJob(taskName, taskParameters) {
    if (this.workers === undefined) {
      return Promise.reject(new Error('The cluster was not started.'));
    }
    const task = this.tasks.get(taskName);
    if (!task) {
      return Promise.reject(new Error(`Task "${taskName}" not found.`));
    }

    try {
      task.checkParameters(taskParameters);
    } catch(error) {
      return Promise.reject(error.message);
    }

    return new Promise((resolve, reject) => {
      const job = new Job(taskName, taskParameters, resolve, reject);
      this.log('info', `Job #${job.id} (${taskName}) was created.`);
      this._tryNextJob(job);
    });
  }
}

module.exports = ClusterManager;
