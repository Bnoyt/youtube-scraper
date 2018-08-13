/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-11-30.
 */
'use strict';

// external libs
const Store = require('express-session').Store;

// services
const LKE = require('../index');
const Utils = LKE.getUtils();

// our libs
const CappedQueue = require('../../../lib/CappedQueue');

const DEFAULT_MAX_LENGTH_QUEUE_2_STAGE_AUTH = 100;
const DEFAULT_FLOATING_LICENSE_RESERVED_TIME_MS = 30 * 60 * 1000; // 30 minutes

/**
 * The following error:
 *
 * error TS2425: Class 'Store' defines instance member property 'all',
 * but extended class 'SessionStore' defines it as instance member function.
 *
 * is due to SessionStore being an ES6 class and Store an ES5 (equivalent) class.
 */
// @ts-ignore ES6 subclass of an ES5 superclass
class SessionStore extends Store {
  /**
   * A session store in memory.
   *
   * - The store allows only 1 session per user.
   * - The session is never set if it doesn't contain the user or the `twoStageAuth` flag
   * - `TwoStageAuth`-only sessions are put in a queue with a maxLength of DEFAULT_MAX_LENGTH_QUEUE_2_STAGE_AUTH.
   * - If the queue reaches the maxLength, the latest session is destroyed.
   * - The session is not created if:
   *   - the number of sessions if equal to the floating licenses number, and
   *   - the user is not an admin, and
   *   - all sessions were touched by less than DEFAULT_FLOATING_LICENSE_RESERVED_TIME_MS minutes.
   *
   * @param {number} [floatingLicenses]            Number of floating licenses to allow
   * @param {number} [twoStageSessions]            Number of two-stage sessions to allow to exist concurrently
   * @param {number} [floatingLicenseReservedTime] Number of milliseconds after which a session can be released
   * @constructor
   */
  constructor(floatingLicenses, twoStageSessions, floatingLicenseReservedTime) {
    super();

    this.floatingLicensesInUse = floatingLicenses > 0;
    this.floatingLicenseReservedTime = floatingLicenseReservedTime ||
      DEFAULT_FLOATING_LICENSE_RESERVED_TIME_MS;

    this.userIdToSessionId = new Map();
    this.sessions = new Map();
    this.twoStageSessionQueue = new CappedQueue(twoStageSessions ||
      DEFAULT_MAX_LENGTH_QUEUE_2_STAGE_AUTH);
    this.floatingLicensesSessionQueue = new CappedQueue(floatingLicenses);
  }

  /**
   * Get all active sessions.
   *
   * @param {function(void, LkSession[])} callback
   */
  // @ts-ignore ES6 subclass of an ES5 superclass
  all(callback) {
    callback && callback(null, Array.from(this.sessions.values()));
  }

  /**
   * Clear all sessions.
   *
   * @param {function} callback
   */
  // @ts-ignore ES6 subclass of an ES5 superclass
  clear(callback) {
    this.userIdToSessionId.clear();
    this.sessions.clear();
    this.twoStageSessionQueue.clear();
    this.floatingLicensesSessionQueue.clear();
    callback && callback();
  }

  /**
   * Destroy the session associated with the given session ID.
   *
   * @param {string}   sessionId
   * @param {function} callback
   */
  // @ts-ignore ES6 subclass of an ES5 superclass
  destroy(sessionId, callback) {
    if (this.sessions.has(sessionId)) {
      this.userIdToSessionId.delete(this.sessions.get(sessionId).userId);
    }
    this.sessions.delete(sessionId);
    this.twoStageSessionQueue.delete(sessionId);
    this.floatingLicensesSessionQueue.delete(sessionId);
    callback && callback();
  }

  /**
   * Get number of active sessions.
   *
   * @param {function(void, number)} callback
   */
  // @ts-ignore ES6 subclass of an ES5 superclass
  length(callback) {
    callback && callback(null, this.sessions.size);
  }

  /**
   * Fetch session by the given session ID.
   *
   * @param {string}                    sessionId
   * @param {function(void, LkSession)} callback
   */
  // @ts-ignore ES6 subclass of an ES5 superclass
  get(sessionId, callback) {
    callback && callback(null, this.sessions.get(sessionId));
  }

  /**
   * Commit the given session associated with the given sessionId to the store.
   *
   * @param {string}    sessionId
   * @param {LkSession} session
   * @param {function}  callback
   */
  // @ts-ignore ES6 subclass of an ES5 superclass
  set(sessionId, session, callback) {
    const userId = session.userId;
    const twoStageAuth = !!session.twoStageAuth;

    // if a user is not specified and the twoStageAuth is not set
    if (Utils.noValue(userId) && !twoStageAuth) {
      // don't do anything
      callback && callback();
      return;
    }

    // are we in the 1st stage of a two-stage auth? (user wasn't yet retrieved)
    if (Utils.noValue(userId) && twoStageAuth) {
      // the queue returns the last element so it can be deleted (if defined)
      this.sessions.delete(this.twoStageSessionQueue.add(sessionId));
      this.sessions.set(sessionId, session);

      callback && callback();
      return;
    }

    // we have a user, let's check if this user was already logged in
    const previousSessionId = this.userIdToSessionId.get(userId);
    if (previousSessionId) {
      // it was, so we delete its previous session
      this.sessions.delete(previousSessionId);
      this.userIdToSessionId.delete(userId);
      this.floatingLicensesSessionQueue.delete(previousSessionId);
    }

    // are we in the 2nd stage of a two-stage auth?
    if (Utils.hasValue(userId) && twoStageAuth) {
      // this session doesn't count anymore within the limit of 100 two-stage auth sessions
      this.twoStageSessionQueue.delete(sessionId);
    }

    // are we using floating licenses?
    if (this.floatingLicensesInUse) {
      // are all floating licenses in use?
      if (this.floatingLicensesSessionQueue.isFull()) {
        // yes and we have to kick another user out if possible

        // it's possible to kick in two case:
        //   - current user is an admin
        //   - the latest floating license was touched at least 30 minutes ago

        const latestFloatingSessionId = this.floatingLicensesSessionQueue.front();
        const latestFloatingSession = this.sessions.get(latestFloatingSessionId);
        if (session.admin ||
          latestFloatingSession.lastVisit + this.floatingLicenseReservedTime < Date.now()) {
          // delete the old session and set the error
          latestFloatingSession.error = session.admin
            ? SessionStore.Errors.FLOATING_KICKED
            : SessionStore.Errors.FLOATING_EXPIRED;
          this.floatingLicensesSessionQueue.delete(latestFloatingSessionId);

          // add the new session to the reserved licenses queue
          session.error = undefined;
          this.floatingLicensesSessionQueue.add(sessionId);
          this._updateLastVisit(session);
        } else {
          session.error = SessionStore.Errors.FLOATING_FULL;
        }
      } else {
        // no, we can easily get one
        session.error = undefined;
        this.floatingLicensesSessionQueue.add(sessionId);
        this._updateLastVisit(session);
      }
    }

    this.sessions.set(sessionId, session);
    this.userIdToSessionId.set(userId, sessionId);

    callback && callback();
  }

  /**
   * Touch the given session object associated with the given session ID.
   *
   * @param {string}    sessionId
   * @param {LkSession} session
   * @param {function}  callback
   */
  touch(sessionId, session, callback) {
    if (this.floatingLicensesInUse) {
      if (this.floatingLicensesSessionQueue.update(sessionId)) {
        this._updateLastVisit(this.sessions.get(sessionId));
      }
    }
    // nothing to do, we use session cookies that expires when the agent is closed
    // otherwise here we would update `cookie.expires`

    callback && callback();
  }

  /**
   * Update the session `lastVisit`.
   *
   * @param {LkSession} session
   * @private
   */
  _updateLastVisit(session) {
    session.lastVisit = Date.now();
  }
}

SessionStore.Errors = {
  FLOATING_EXPIRED: 'session_expired',
  FLOATING_KICKED: 'session_evicted',
  FLOATING_FULL: 'server_full'
};

module.exports = SessionStore;
