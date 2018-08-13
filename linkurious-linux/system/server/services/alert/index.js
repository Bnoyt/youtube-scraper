/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-05-16.
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../index');
const Scheduler = LKE.getScheduler();
const Utils = LKE.getUtils();
const Log = LKE.getLogger(__filename);
const Data = LKE.getData();
const Db = LKE.getSqlDb();
const Config = LKE.getConfig();
const Errors = LKE.getErrors();

// locals
const AlertDAO = require('./AlertDAO');

const ALERT_GROUP = 'alert';
const DEFAULT_NUMBER_OF_VIEWERS_IN_GET_MATCHES = 7;

/**
 * It will delete old unconfirmed matches that lived beyond their expiration date.
 *
 * @returns {Bluebird<void>}
 */
function cleanUpOldMatches() {
  return AlertDAO.cleanUpOldMatches();
}

class AlertService {

  constructor() {
    this._alertIdToSchedulerTaskId = new Map();
    this._semaphores = new Map();
  }

  /**
   * Format an alert instance to a public alert:
   * - Add `nextRun` if `isAdmin` is true
   *
   * @param {AlertInstance} alertInstance
   * @param {boolean}       isAdmin
   * @returns {PublicAlert}
   * @private
   */
  _formatToPublicAlert(alertInstance, isAdmin) {
    const publicAlert = Db.models.alert.instanceToPublicAttributes(alertInstance);

    if (isAdmin) {
      const schedulerTaskId = this._alertIdToSchedulerTaskId.get(alertInstance.id);

      // schedulerTaskId doesn't exist if the alert is not enabled or the alert service is not started
      if (Utils.hasValue(schedulerTaskId)) {
        const nextRun = new Date(Scheduler.getTimeToSchedule(
          schedulerTaskId
        ));
        const currentTime = new Date();

        // nextRun can be a date of the past, e.g. if the scheduler failed or it has yet to schedule
        if (nextRun < currentTime) {
          // in that case, we set it as the current time
          publicAlert.nextRun = currentTime;
        } else {
          publicAlert.nextRun = nextRun;
        }
      } else {
        publicAlert.nextRun = null;
      }
    }

    return publicAlert;
  }

  /**
   * Format a match instance to a public match:
   * - Create the `columns` property (if `columnsDescription` is defined)
   * - Filter the `user` property
   * - Create the `viewers` property
   *
   * @param {MatchInstance} matchInstance
   * @param {Array<{type: string, columnName: string, columnTitle: string}>} [columnsDescription]
   * @returns {PublicMatch}
   * @private
   */
  _formatToPublicMatch(matchInstance, columnsDescription) {
    const publicMatch = Db.models.match.instanceToPublicAttributes(
      matchInstance, columnsDescription
    );

    // 1) filter the `user` property
    if (Utils.hasValue(matchInstance.user)) {
      publicMatch.user = {
        id: matchInstance.user.id,
        username: matchInstance.user.username,
        email: matchInstance.user.email
      };
    } else {
      publicMatch.user = null;
    }

    if (Utils.noValue(matchInstance.matchActions)) {
      publicMatch.viewers = [];
      return /**@type {PublicMatch}*/ (publicMatch);
    }

    // 2) discover who are the viewers and their infos
    // viewers are users who performed an "open" match action on the match
    const viewerToDateMap = new Map();
    const viewerToUserObject = new Map();

    for (const action of matchInstance.matchActions) {
      const previousTime = viewerToDateMap.get(action.userId);

      if (Utils.noValue(previousTime) || previousTime < action.createdAt) {
        viewerToDateMap.set(action.userId, action.createdAt);
      }

      if (!viewerToUserObject.has(action.userId)) {
        viewerToUserObject.set(action.userId, {
          id: action.user.id,
          username: action.user.username,
          email: action.user.email
        });
      }
    }

    // 3) sort viewers by date and limit the number of viewers
    let viewerToDate = Array.from(viewerToDateMap.entries());
    viewerToDate = _.orderBy(viewerToDate, item => item[1], ['desc']);
    viewerToDate.slice(0, DEFAULT_NUMBER_OF_VIEWERS_IN_GET_MATCHES);

    // 4) populate the match object with the viewers
    publicMatch.viewers = _.map(viewerToDate, item => {
      const viewer = viewerToUserObject.get(item[0]);
      viewer.date = item[1];
      return viewer;
    });

    return /**@type {PublicMatch}*/ (publicMatch);
  }

  /**
   * Format a match action instance to a public match action:
   * - Filter the `user` property
   *
   * @param {MatchActionInstance} matchActionInstance
   * @returns {PublicMatchAction}
   * @private
   */
  _formatToPublicMatchAction(matchActionInstance) {
    const publicMatchAction = Db.models.matchAction.instanceToPublicAttributes(matchActionInstance);

    // 1) filter the `user` property
    if (Utils.hasValue(matchActionInstance.user)) {
      publicMatchAction.user = {
        id: matchActionInstance.user.id,
        username: matchActionInstance.user.username,
        email: matchActionInstance.user.email
      };
    } else {
      publicMatchAction.user = null;
    }

    return publicMatchAction;
  }

  /**
   * Schedule all the alerts in the system.
   * For each enabled alert, if lastRun is null, it will execute the query the next time compatible
   * with `alert.cron`. If lastRun isn't null, it will check if it should have executed in the past.
   * If true, it will execute the query immediately.
   */
  start() {
    try {
      Scheduler.setGroupConcurrency(ALERT_GROUP, Config.get('alerts.maxConcurrency', 1));

      // cleanup old matches everyday at 00:00 (local timezone)
      Scheduler.scheduleTask(cleanUpOldMatches, '0 0 * * *', {group: ALERT_GROUP});

      return AlertDAO.getAlerts(null, true).then(alerts => {
        for (const alert of alerts) {
          if (alert.enabled) {
            const id = Scheduler.scheduleTask(
              this.runAlert.bind(this, alert),
              alert.cron,
              {
                group: ALERT_GROUP,
                lastRun: alert.lastRun ? alert.lastRun : new Date(alert.createdAt)
              }
            );
            this._alertIdToSchedulerTaskId.set(alert.id, id);
          }
        }
        this._isAlertServiceStarted = true;
      });
    } catch(err) {
      Log.error('The alert manager couldn\'t schedule the alert due to invalid arguments.');
    }
  }

  /**
   * Run the alert.
   * It will query the db, generate the matches and update `alert.lastRun` to new Date().
   *
   * @param {AlertInstance} alert
   * @returns {Bluebird<AlertRunProblem | null>} null, if there were no problems
   */
  runAlert(alert) {
    return Data.alertQuery({
      dialect: alert.dialect,
      query: alert.query,
      sourceKey: alert.sourceKey,
      limit: alert.maxMatches
    }).then(queryMatchStream => {
      /**
       * If at least one match is created, partial will be set to true so that if we have a problem
       * we know that it depends on some particular matches.
       */
      return this.createMatchesInBulk(queryMatchStream, alert);
    }).catch(err => {
      if (err instanceof Promise.CancellationError) {
        throw err;
      }

      Log.error('RunAlert: Could not create matches in bulk: ', err);

      if (Utils.hasValue(err.message)) {
        return {error: err.message, partial: false};
      }

      return {error: err, partial: false};
    }).then(problem => {
      // "problem" is null if there wasn't any problem
      alert.lastRunProblem = problem;
      alert.lastRun = new Date();
      return alert.save().catch(err => {
        if (!(err instanceof Promise.CancellationError)) {
          Log.error(`RunAlert: Could not update alert #${alert.id} in the database.`, err);
        }
      }).return(problem);
    });
  }

  /**
   * AlertDAO.createMatchesInBulk under semaphore lock for the alert.
   *
   * @param {Readable<QueryMatch>} queryMatchStream
   * @param {AlertInstance}        alert
   * @returns {Bluebird<AlertRunProblem | null>} null, if there were no problems
   */
  createMatchesInBulk(queryMatchStream, alert) {
    return this._acquireAlertSemaphore(alert.id).then(() => {
      return AlertDAO.createMatchesInBulk(queryMatchStream, alert);
    }).finally(() => this._releaseAlertSemaphore(alert.id));
  }

  /**
   * Create a new alert and schedule its first run.
   *
   * @param {AlertAttributes} newAlert
   * @param {WrappedUser}     currentUser
   * @returns {Bluebird<PublicAlert>}
   */
  createAlert(newAlert, currentUser) {
    return AlertDAO.createAlert(newAlert, currentUser).then(alert => {
      if (alert.enabled && this._isAlertServiceStarted) {
        const id = Scheduler.scheduleTask(
          this.runAlert.bind(this, alert),
          alert.cron,
          {group: ALERT_GROUP, lastRun: new Date(0)} // new alerts will schedule immediately
        );
        this._alertIdToSchedulerTaskId.set(alert.id, id);
      }
      return this._formatToPublicAlert(alert, true);
    });
  }

  /**
   * Get all the alerts within a given source.
   * Fields are masked for non-admin users if `allFields` is false.
   *
   * @param {string}      sourceKey
   * @param {boolean}     allFields
   * @param {WrappedUser} currentUser
   * @returns {Bluebird<PublicAlert[]>}
   */
  getAlerts(sourceKey, allFields, currentUser) {
    Utils.check.exist('currentUser', currentUser);
    return AlertDAO.getAlerts(sourceKey, allFields)
      .map(alert => this._formatToPublicAlert(alert, allFields))
      .filter(alert => currentUser.canReadAlert(sourceKey, alert.id, false));
  }

  /**
   * Get an alert by id.
   * Fields are masked for non-admin users if `allFields` is false.
   *
   * @param {string}      sourceKey
   * @param {number}      alertId
   * @param {boolean}     allFields
   * @param {WrappedUser} currentUser
   * @returns {Bluebird<PublicAlert>}
   */
  getAlert(sourceKey, alertId, allFields, currentUser) {
    Utils.check.exist('currentUser', currentUser);
    return currentUser.canReadAlert(sourceKey, alertId).then(() => {
      return AlertDAO.getAlert(alertId, allFields);
    }).then(alert => this._formatToPublicAlert(alert, allFields));
  }

  /**
   * Create/acquire the semaphore for the given alert.
   *
   * @param {number} alertId
   * @returns {Bluebird<void>} resolved when the slot is available
   * @private
   */
  _acquireAlertSemaphore(alertId) {
    if (!this._semaphores.has(alertId)) {
      this._semaphores.set(alertId, Utils.semaphore(1));
    }
    return this._semaphores.get(alertId).acquire();
  }

  /**
   * Release/destroy the semaphore for the given alert.
   *
   * @param {number} alertId
   * @private
   */
  _releaseAlertSemaphore(alertId) {
    const semaphore = this._semaphores.get(alertId);
    semaphore.release();
    if (semaphore.queue.length === 0 && semaphore.active === 0) {
      this._semaphores.delete(alertId);
    }
  }

  /**
   * Delete an alert.
   *
   * @param {number}      id
   * @param {WrappedUser} currentUser
   * @returns {Bluebird<void>}
   */
  deleteAlert(id, currentUser) {
    return this._acquireAlertSemaphore(id).then(() => {
      Utils.check.exist('currentUser', currentUser);
      const schedulerTaskId = this._alertIdToSchedulerTaskId.get(id);

      // schedulerTaskId doesn't exist if the alert is not enabled or the alert service is not started
      if (Utils.hasValue(schedulerTaskId)) {
        Scheduler.cancel(schedulerTaskId);
      }
      return AlertDAO.deleteAlert(id).then(() => {
        this._alertIdToSchedulerTaskId.delete(id);
      });
    }).finally(() => this._releaseAlertSemaphore(id));
  }

  /**
   * Update an alert.
   *
   * id, sourceKey, userId, lastRun and lastRunProblem cannot be updated and will be silently
   * ignored.
   *
   * @param {number}          alertId
   * @param {AlertAttributes} newProperties
   * @param {WrappedUser} currentUser
   * @returns {Bluebird<PublicAlert>}
   */
  updateAlert(alertId, newProperties, currentUser) {
    return this._acquireAlertSemaphore(alertId).then(() => {
      Utils.check.exist('currentUser', currentUser);
      return AlertDAO.updateAlert(alertId, newProperties).then(alert => {
        // if the columns field was changed, all the matches and actions
        // of the update alert are deleted and the alert, if enabled, rescheduled immediately
        const needCleanAlert = Utils.hasValue(newProperties.columns);
        // if the cron field was changed, we reschedule immediately
        const needReschedule = Utils.hasValue(newProperties.cron);

        return Promise.resolve().then(() => {
          if (needCleanAlert) {
            Log.info(`Update of alert #${alertId} required to delete all previous matches.`);
            return AlertDAO.deleteMatchAndActions(alertId);
          }
        }).then(() => {
          const schedulerTaskId = this._alertIdToSchedulerTaskId.get(alert.id);

          // schedulerTaskId doesn't exist if the alert is not enabled or the alert service is not started
          if (Utils.hasValue(schedulerTaskId)) {
            Scheduler.cancel(schedulerTaskId);
          }
          if (alert.enabled) {
            const id = Scheduler.scheduleTask(
              this.runAlert.bind(this, alert),
              alert.cron,
              {
                group: ALERT_GROUP,
                lastRun: (needCleanAlert || needReschedule) ? new Date(0) : alert.lastRun
              }
            );
            if (this._isAlertServiceStarted) {
              this._alertIdToSchedulerTaskId.set(alert.id, id);
            }
          } else {
            this._alertIdToSchedulerTaskId.delete(alert.id);
          }

          return this._formatToPublicAlert(alert, true);
        });
      });
    }).finally(() => this._releaseAlertSemaphore(alertId));
  }

  /**
   * Get all the matches for a given alert.
   *
   * All the matches have an addition field called 'viewers'.
   * It shows the last `DEFAULT_NUMBER_OF_VIEWERS_IN_GET_MATCHES` unique viewers (excluding the
   * current user) ordered by date.
   *
   * @param {string}      sourceKey
   * @param {number}      alertId
   * @param {object}      options
   * @param {string}      [options.sortDirection]
   * @param {string}      [options.sortBy]
   * @param {number}      [options.offset=0]
   * @param {number}      [options.limit=20]
   * @param {string}      [options.status]
   * @param {WrappedUser} currentUser
   * @returns {Bluebird<PublicMatch[]>}
   */
  getMatches(sourceKey, alertId, options, currentUser) {
    Utils.check.exist('currentUser', currentUser);
    let columnsDescription;
    return currentUser.canReadAlert(sourceKey, alertId).then(() => {
      return AlertDAO.getAlert(alertId, true).then(alert => {
        columnsDescription = alert.columns;
      });
    }).then(() => {
      return AlertDAO.getMatches(alertId, currentUser, options);
    }).map(match => this._formatToPublicMatch(match, columnsDescription));
  }

  /**
   * Get the count for each possible status of all the matches for a given alert.
   *
   * @param {string} sourceKey
   * @param {number} alertId
   * @param {WrappedUser} currentUser
   * @returns {Bluebird<{unconfirmed: number, confirmed: number, dismissed: number}>}
   */
  getMatchCount(sourceKey, alertId, currentUser) {
    Utils.check.exist('currentUser', currentUser);
    return currentUser.canReadAlert(sourceKey, alertId).then(() => {
      return AlertDAO.getMatchCount(alertId);
    });
  }

  /**
   * @param {number}      matchId
   * @param {WrappedUser} currentUser
   * @param {string}      [sourceKey]
   * @param {number}      [alertId]
   * @returns {Bluebird<MatchInstance>}
   * @private
   */
  _getMatch(matchId, currentUser, sourceKey, alertId) {
    Utils.check.posInt('matchId', matchId);
    Utils.check.exist('currentUser', currentUser);

    return AlertDAO.getMatch(matchId, currentUser).then(match => {
      if (Utils.hasValue(alertId) && alertId !== match.alertId) {
        return Errors.business(
          'invalid_parameter', `Match #${matchId} doesn't belong to alert #${alertId}.`, true
        );
      }
      if (Utils.hasValue(sourceKey) && sourceKey !== match.sourceKey) {
        return Errors.business(
          'invalid_parameter',
          `Match #${matchId} doesn't belong to data-source "${sourceKey}".`,
          true
        );
      }
      return currentUser.canReadAlert(match.sourceKey, match.alertId).return(match);
    });
  }

  /**
   * Get a match by id.
   *
   * @param {number}      matchId
   * @param {WrappedUser} currentUser
   * @param {string}      [sourceKey]
   * @param {number}      [alertId]
   * @returns {Bluebird<PublicMatch>}
   */
  getMatch(matchId, currentUser, sourceKey, alertId) {
    let columnsDescription;
    return Promise.resolve().then(() => {
      if (Utils.hasValue(alertId)) {
        return AlertDAO.getAlert(alertId, true).then(alert => {
          columnsDescription = alert.columns;
        });
      } // else we don't populate the columns property in the match
      // This case occurs in populate sandbox by match id (where the alert id is not immediately available)
    }).then(() => {
      return this._getMatch(matchId, currentUser, sourceKey, alertId);
    }).then(match => this._formatToPublicMatch(match, columnsDescription));
  }

  /**
   * Do an action on a match.
   *
   * @param {string}      sourceKey
   * @param {number}      alertId
   * @param {number}      matchId
   * @param {string}      action
   * @param {WrappedUser} currentUser
   * @returns {Bluebird<void>}
   */
  doMatchAction(sourceKey, alertId, matchId, action, currentUser) {
    return this._getMatch(matchId, currentUser, sourceKey, alertId).then(match => {
      return AlertDAO.doMatchAction(match, action, currentUser).return();
    });
  }

  /**
   * Get all the actions for a given match.
   *
   * @param {string}      sourceKey
   * @param {number}      alertId
   * @param {number}      matchId
   * @param {object}      options
   * @param {number}      [options.offset=0]
   * @param {number}      [options.limit=20]
   * @param {WrappedUser} currentUser
   * @returns {Bluebird<PublicMatchAction[]>}
   */
  getMatchActions(sourceKey, alertId, matchId, options, currentUser) {
    /**
     * _getMatch is used for access control.
     * We need to retrieve the match to be sure that `alertId` is equal to `match.alertId`
     */
    return this._getMatch(matchId, currentUser, sourceKey, alertId).then(() => {
      return AlertDAO.getMatchActions(matchId, options)
        .map(action => this._formatToPublicMatchAction(action));
    });
  }

  /**
   * Get the promise of the next execution of a given alert by id.
   *
   * @param {number} alertId
   * @returns {Bluebird<void>}
   */
  getPromise(alertId) {
    return Scheduler.getPromise(this._alertIdToSchedulerTaskId.get(alertId)).return();
  }
}

module.exports = new AlertService();
