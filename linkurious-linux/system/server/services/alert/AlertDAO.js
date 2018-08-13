/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-05-12.
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../index');
const Log = LKE.getLogger(__filename);
const Db = LKE.getSqlDb();
const Utils = LKE.getUtils();
const Data = LKE.getData();
const Config = LKE.getConfig();
const Errors = LKE.getErrors();

// by default, an alert can generate 5000 new matches
const DEFAULT_MAX_MATCHES = 5000;

// by default, an alert query can run for 10 minutes
const DEFAULT_MAX_RUNTIME = 10 * 60 * 1000;

// by default, a match as a TTL of 0 days
const DEFAULT_MAX_MATCH_TTL = 0;

// we insert/update matches one hundred at a time
const SLICE_SIZE = 100;

// Biggest representable date
// http://www.ecma-international.org/ecma-262/5.1/#sec-15.9.1.1
const DATE_MAX_VALUE = new Date(8640000000000000);

// MatchAction.action to Match.status
const ACTION_TO_STATUS = new Map();
ACTION_TO_STATUS.set('confirm', 'confirmed');
ACTION_TO_STATUS.set('unconfirm', 'unconfirmed');
ACTION_TO_STATUS.set('dismiss', 'dismissed');

class AlertDAO {
  /**
   * Return the list of fields to show to a simple user.
   *
   * @param {boolean} keepAllFields Whether to return undefined (representing all fields) or the array of alert fields readable by non-admin users
   *
   * @returns {string[] | undefined} undefined if `keepAllFields` is true
   * @private
   */
  static _alertAttributes(keepAllFields) {
    if (keepAllFields) {
      // in sequelize, {attributes: undefined} returns all attributes
      return undefined;
    } else {
      return ['id', 'title', 'sourceKey', 'columns', 'enabled',
        'lastRun', 'updatedAt', 'createdAt'];
    }
  }

  /**
   * Get an alert by id.
   * Fields are masked for non-admin users if `keepAllFields` is false.
   *
   * @param {number}  alertId
   * @param {boolean} keepAllFields Whether to return an alert instance with all the fields or only the ones readable by non-admin users
   * @returns {Bluebird<AlertInstance>}
   */
  getAlert(alertId, keepAllFields) {
    Utils.check.posInt('id', alertId);

    const options = {where: {id: alertId}, attributes: AlertDAO._alertAttributes(keepAllFields)};
    return Db.models.alert.findOne(options).then(alert => {
      if (!alert) {
        return Errors.business('not_found', `Alert #${alertId} was not found.`, true);
      }
      return alert;
    });
  }

  /**
   * Validate an alert at creation or update.
   *
   * @param {AlertAttributes} alert
   * @param {boolean}         creating  Whether the check is for creating (true), or updating (false)
   * @param {string}          sourceKey Key of the data-source of the created/updated alert
   */
  static _checkAlert(alert, creating, sourceKey) {
    const maxMatchTTL = Config.get('alerts.maxMatchTTL', DEFAULT_MAX_MATCH_TTL);
    const maxMatches = Config.get('alerts.maxMatchesLimit', DEFAULT_MAX_MATCHES);

    const rules = {
      title: {required: creating, check: ['string', true, false, 1, 200]},
      sourceKey: {required: creating, check: (key, value) => Utils.checkSourceKey(value)},
      query: {required: creating, check: 'nonEmpty'},
      enabled: {required: creating, type: 'boolean'},
      columns: {required: false, check: (key, value) => {
        Utils.check.array(key, value, 0, 5);
        value.forEach((v, i) => {
          Utils.check.properties(key + '[' + i + ']', v, {
            type: {required: true, values: ['number', 'string']},
            columnName: {required: true, check: 'nonEmpty'},
            columnTitle: {required: true, check: 'nonEmpty'}
          });
        });
      }},
      cron: {required: creating, check: 'cronExpression'},
      matchTTL: {required: creating, check: ['integer', 0, maxMatchTTL]},
      maxMatches: {required: creating, check: ['integer', 0, maxMatches]},
      dialect: {required: creating, values: Data.resolveSource(sourceKey).graph.features.dialects}
    };

    Utils.check.properties('alert', alert, rules);
  }

  /**
   * Create a new alert.
   *
   * @param {AlertAttributes} alert
   * @param {WrappedUser}     currentUser
   * @returns {Bluebird<AlertInstance>}
   */
  createAlert(alert, currentUser) {
    Utils.check.object('alert', alert);
    alert = _.defaults(alert, {
      maxMatches: Config.get('alerts.maxMatchesLimit', DEFAULT_MAX_MATCHES),
      matchTTL: Config.get('alerts.maxMatchTTL', DEFAULT_MAX_MATCH_TTL)
    });

    Utils.check.exist('currentUser', currentUser);

    AlertDAO._checkAlert(alert, true, alert.sourceKey);

    return Db.models.alert.create({
      title: alert.title,
      sourceKey: alert.sourceKey,
      query: alert.query,
      dialect: alert.dialect,
      enabled: alert.enabled,
      columns: alert.columns,
      cron: alert.cron,
      matchTTL: alert.matchTTL,
      lastRun: null,
      lastRunProblem: null,
      maxMatches: alert.maxMatches,
      userId: currentUser.id
    });
  }

  /**
   * Get all the alerts within a given source if `sourceKey` is defined, otherwise,
   * get all the alerts from any data-source.
   * Fields are masked for non-admin users if `keepAllFields` is false.
   *
   * @param {string}  sourceKey     Key of the data-source. `null` to get alerts from all data-source
   * @param {boolean} keepAllFields Whether to return an alert instance with all the fields or only the ones readable by non-admin users
   * @returns {Bluebird<AlertInstance[]>}
   */
  getAlerts(sourceKey, keepAllFields) {
    const where = {};
    if (Utils.hasValue(sourceKey)) {
      Utils.checkSourceKey(sourceKey);
      where.sourceKey = sourceKey;
    }

    return Db.models.alert.findAll({
      where: where,
      attributes: AlertDAO._alertAttributes(keepAllFields),
      order: [['id', 'desc']]
    });
  }

  /**
   * Delete all the matches and match actions of a given alert.
   * Match actions are deleted automatically with on delete cascade.
   *
   * @param {number} alertId
   * @returns {Bluebird<void>}
   */
  deleteMatchAndActions(alertId) {
    return Db.models.match.destroy({
      where: {alertId: alertId}
    }).return();
  }

  /**
   * Delete an alert, all its matches and match actions.
   *
   * @param {number} alertId
   * @returns {Bluebird<void>}
   */
  deleteAlert(alertId) {
    Utils.check.posInt('id', alertId);
    return this.deleteMatchAndActions(alertId).then(() => {
      return Db.models.alert.destroy({where: {id: alertId}});
    }).return();
  }

  /**
   * Update an alert.
   *
   * `id`, `sourceKey`, `userId`, `lastRun` and `lastRunProblem` cannot be updated and
   * will be silently ignored.
   *
   * @param {number}          alertId
   * @param {AlertAttributes} newProperties
   * @returns {Bluebird<AlertInstance>}
   */
  updateAlert(alertId, newProperties) {
    Utils.check.posInt('id', alertId);
    Utils.check.object('newProperties', newProperties);

    // ignored fields from newProperties (they cannot be changed)
    ['id', 'sourceKey', 'userId', 'lastRun', 'lastRunProblem'].forEach(key => {
      delete newProperties[key];
    });

    return this.getAlert(alertId, true).then(alert => {
      // check the new properties
      AlertDAO._checkAlert(newProperties, false, alert.sourceKey);

      _.forEach(newProperties, (value, key) => {
        alert[key] = value;
      });

      return alert.save();
    });
  }

  /**
   * Do an action on a match.
   *
   * @param {MatchInstance} match
   * @param {string}        action ("open", "confirm", "dismiss", "unconfirm")
   * @param {WrappedUser}   currentUser
   * @returns {Bluebird<MatchActionInstance>}
   */
  doMatchAction(match, action, currentUser) {
    Utils.check.object('match', match);
    Utils.check.values('action', action, Db.models.matchAction.ACTION_VALUES);
    Utils.check.exist('currentUser', currentUser);

    return Db.sequelize.transaction(t => {
      // some actions don't change the status, in that case `newStatus` is undefined
      const newStatus = ACTION_TO_STATUS.get(action);

      // check if the match already has this status, fail if so
      if (newStatus !== undefined && match.status === newStatus) {
        return Errors.business(
          'redundant_action', `The match already has this status (${newStatus}).`, true
        );
      }

      // create the new match action
      const newAction = {action: action, userId: currentUser.id, matchId: match.id};
      return Db.models.matchAction.create(newAction, {transaction: t}).then(newAction => {

        // update the match status (if needed)
        if (newStatus === undefined) { return newAction; }
        match.status = newStatus;
        match.statusUserId = currentUser.id;
        return match.save({transaction: t})
          .return(newAction);
      });
    });
  }

  /**
   * Get all the matches for a given alert.
   * The user that performed the last action is populated.
   * The actions are populated and filtered (only open actions of the non-current user are returned).
   * The users of the open actions are populated.
   *
   * @param {number}      alertId
   * @param {WrappedUser} currentUser
   * @param {object}      options
   * @param {string}      [options.sortDirection]
   * @param {string}      [options.sortBy]
   * @param {number}      [options.offset=0]
   * @param {number}      [options.limit=20]
   * @param {string}      [options.status]
   * @returns {Bluebird<MatchInstance[]>}
   */
  getMatches(alertId, currentUser, options) {
    Utils.check.posInt('alertId', alertId);

    options = _.defaults(options, {offset: 0, limit: 20});

    Utils.check.properties('options', options, {
      offset: {required: true, check: 'posInt'},
      limit: {required: true, check: 'posInt'},
      sortDirection: {required: false, values: ['asc', 'desc']},
      // sortBy can be 'date' or a given column index from 0 to 4
      sortBy: {required: false, values: ['date', '0', '1', '2', '3', '4']},
      status: {required: false, values: Db.models.match.STATUS_VALUES}
    });

    const where = {alertId: alertId};
    if (Utils.hasValue(options.status)) {
      where.status = options.status;
    }

    return this.getAlert(alertId, true).then(alert => {
      // if no sortDirection is given, sort by 'desc'
      const sortDirection = options.sortDirection ? options.sortDirection : 'desc';

      // if no sortBy is given, sort by creation date
      let sortBy = options.sortBy ? options.sortBy : 'date';

      let orderOptions;

      if (sortBy === 'date') {
        // creation date
        orderOptions = [['id', sortDirection]];
      } else {
        // we sort by a column
        // 1) check that the column exist in the alert
        const columnDefinition = alert.columns[sortBy];
        if (Utils.hasValue(columnDefinition)) {
          sortBy = columnDefinition.type === 'string'
            ? 'columnString' + sortBy : 'columnNumber' + sortBy;

          orderOptions = [[sortBy, sortDirection], ['id', 'desc']];
        } else {
          // don't fail, just sort by creation date
          orderOptions = [['id', 'desc']];
        }
      }

      return Db.models.match.findAll({
        where: where,
        order: orderOptions,
        offset: options.offset,
        limit: options.limit,
        include: [Db.models.user, {
          model: Db.models.matchAction,
          required: false,
          where: {
            userId: {$ne: currentUser.id},
            action: 'open'
          },
          include: [Db.models.user]}]
      });
    }).map(match => {
      return this._updateMatchToVersion2(match);
    });
  }

  /**
   * Get the count for each possible status of all the matches for a given alert.
   *
   * @param {number} alertId
   * @returns {Bluebird<{unconfirmed: number, confirmed: number, dismissed: number}>}
   */
  getMatchCount(alertId) {
    return Db.models.match.findAll({
      where: {
        alertId: alertId
      },
      attributes: [
        'status',
        [Db.sequelize.fn('count', Db.sequelize.col('id')), 'actionCount']
      ],
      group: ['match.status']
    }).then(rows => {
      const queryResultMap = new Map();
      _.forEach(rows, row => {
        queryResultMap.set(row.status, row.get().actionCount);
      });

      return {
        unconfirmed: queryResultMap.get('unconfirmed') || 0,
        confirmed: queryResultMap.get('confirmed') || 0,
        dismissed: queryResultMap.get('dismissed') || 0
      };
    });
  }

  /**
   * If the match is version 1, update it to version 2 and return it.
   *
   * Since matches v2, node and edge ids are stored exclusively as strings.
   *
   * @param {MatchInstance} matchInstance
   * @returns {Bluebird<MatchInstance>}
   * @private
   * @backward-compatibility
   */
  _updateMatchToVersion2(matchInstance) {
    if (matchInstance.version > 1) {
      return Promise.resolve(matchInstance);
    } else {
      // originally node and edge ids in Linkurious could have been both string and numbers
      // we force them to be string now
      matchInstance.nodes = _.map(matchInstance.nodes, nodeId => '' + nodeId);
      matchInstance.edges = _.map(matchInstance.edges, edgeId => '' + edgeId);

      return matchInstance.save();
    }
  }

  /**
   * Get a match by id. Reject if the match is not found.
   * The user model is populated.
   *
   * @param {number}      matchId
   * @param {WrappedUser} currentUser
   * @returns {Bluebird<MatchInstance>}
   */
  getMatch(matchId, currentUser) {
    if (!LKE.isEnterprise()) {
      return Errors.business('not_implemented', 'Not available in Starter Edition', true);
    }
    Utils.check.posInt('id', matchId);
    return Db.models.match.findOne({
      where: {id: matchId},
      include: [Db.models.user, {
        model: Db.models.matchAction,
        required: false,
        where: {
          userId: {$ne: currentUser.id},
          action: 'open'
        },
        include: [Db.models.user]}]
    }).then(match => {
      if (!match) {
        return Errors.business('not_found', `Match #${matchId} was not found.`, true);
      }

      return this._updateMatchToVersion2(match);
    });
  }

  /**
   * This function will create matches. It will throw an LkError if there was a problem not
   * depending on a single match. It will return an AlertRunProblem if there were problems with the
   * individual matches. It won't return anything if there were no problems.
   *
   * It won't create duplicate matches. (the unique key is the hash)
   * It also won't create new matches if `alert.maxMatches` was reached.
   *
   * @param {Readable<QueryMatch>} queryMatchStream
   * @param {AlertInstance}        alert
   * @returns {Bluebird<AlertRunProblem | null>} null, if there were no problems
   */
  createMatchesInBulk(queryMatchStream, alert) {
    Utils.check.object('alert', alert);

    const timeout = Config.get('alerts.maxRuntimeLimit', DEFAULT_MAX_RUNTIME);

    return Utils.mergeReadable(queryMatchStream, timeout).then(mergedStream => {
      const matches = mergedStream.result;
      const queryTimedOut = mergedStream.timeout;

      if (matches.length === 0) {
        return null;
      }

      // count the matches of this alert
      return Db.models.match.count({where: {alertId: alert.id}}).catch(err => {
        throw Errors.technical('critical', 'Couldn\'t query the DB (count): ' + err);
      }).then(matchCount => {

        // getDate returns the day in the current month (1-31), setDate will handle overflow by itself
        let expirationDate = new Date();
        if (alert.matchTTL !== 0) {
          expirationDate.setDate(expirationDate.getDate() + alert.matchTTL);
        } else {
          // if matchTTL is 0 the expiration date is the next run of the alert
          // here we set an infinite expiration date
          expirationDate = DATE_MAX_VALUE;
        }

        let runError;
        const matchesToCreate = new Map();

        for (const match of matches) {
          try {
            Utils.check.array('nodes', match.nodes);
            Utils.check.array('edges', match.edges);
            Utils.check.exist('properties', match.properties);

            const hash = Utils.hashMatch(match.nodes, match.edges, alert.id);

            const matchAttributes = {
              sourceKey: alert.sourceKey,
              alertId: alert.id,
              hash: hash,
              nodes: match.nodes,
              edges: match.edges,
              status: 'unconfirmed',
              expirationDate: expirationDate,
              version: 2
            };

            if (Utils.hasValue(alert.columns)) {
              alert.columns.forEach((column, idx) => {
                const scalarValue = match.properties[column.columnName];
                if (column.type === 'number' && typeof scalarValue === 'number') {
                  matchAttributes['columnNumber' + idx] = scalarValue;
                } else if (column.type === 'string' && Utils.isNEString(scalarValue)) {
                  matchAttributes['columnString' + idx] = scalarValue;
                } // else we silently ignore that the scalar value is undefined or of an incorrect type
              });
            }

            matchesToCreate.set(hash, matchAttributes);
          } catch(err) {
            runError = err;
          }
        }

        const duplicateHashes = [];

        const currentTime = new Date();

        // 1) find all match hashes that are already in database
        return Utils.sliceMap(Array.from(matchesToCreate.keys()), SLICE_SIZE, hashesSlice => {
          return Db.models.match.findAll({
            where: {hash: hashesSlice, alertId: alert.id},
            attributes: ['hash']
          }).catch(err => {
            throw Errors.technical('critical', 'Couldn\'t query the DB (find duplicates): ' + err);
          }).map(match => match.hash).then(hashes => {
            duplicateHashes.push.apply(duplicateHashes, hashes);
          });
        }, 1).then(() => {

          // 2) remove all duplicates from the "matches to create" map
          for (const hash of duplicateHashes) {
            matchesToCreate.delete(hash);
          }

          let newMatchesToCreate = Array.from(matchesToCreate.values());
          newMatchesToCreate = _.uniqBy(newMatchesToCreate, 'hash');

          // 3) enforce "maxMatches" and report an error if the max was reached
          if (matchCount + newMatchesToCreate.length > alert.maxMatches) {
            // if we reach the maximum, we report the error
            runError = Errors.business(
              'creation_failed',
              'Match couldn\'t be created  because "alert.maxMatches" was reached.'
            );
          }
          newMatchesToCreate = newMatchesToCreate.slice(0, alert.maxMatches - matchCount);

          // 4) update the expiration date of existing matches
          return Utils.sliceMap(duplicateHashes, SLICE_SIZE, hashesSlice => {
            return Db.models.match.update(
              // @ts-ignore type checking on sequelize update does not work correctly (it requires in input all the attributes)
              {expirationDate: expirationDate},
              {where: {hash: hashesSlice}}
            ).catch(err => {
              throw Errors.technical(
                'critical', 'Couldn\'t query the DB (update expirationDate): ' + err
              );
            });
          }, 1).return(newMatchesToCreate);
        }).then(newMatchesToCreate => {

          let problem = null;

          if (queryTimedOut) {
            problem = {
              error: Errors.business(
                'graph_request_timeout',
                `The graph database did not complete its response in ${timeout / 1000}s.`
              ),
              // the error is partial if at least 1 match was updated OR created
              partial: matchesToCreate.size > 0
            };
          }

          // A run error is more worth to show than a timeout
          if (runError) {
            problem = {
              error: runError,
              // the error is partial if at least 1 match was updated OR created
              partial: matchesToCreate.size > 0
            };
            Log.error('Could not create matches in bulk: ', runError);
          }

          // 5) actually create the new matches
          return Utils.sliceMap(newMatchesToCreate, SLICE_SIZE, matchesSlice => {
            return Db.models.match.bulkCreate(matchesSlice).catch(err => {
              throw Errors.technical('critical', 'Couldn\'t query the DB (create matches): ' + err);
            });
          }, 1).then(() => {
            // if matchTTL is 0, we will delete all the unconfirmed matches that were not updated
            if (alert.matchTTL === 0) {
              return Db.models.match.destroy({
                where: {
                  updatedAt: {
                    $lt: currentTime
                  },
                  status: {
                    $not: 'confirmed'
                  },
                  alertId: alert.id
                }
              });
            }
          }).return(problem);
        });
      });
    });
  }

  /**
   * Get all the actions for a given match.
   * The user is populated.
   *
   * @param {number} matchId
   * @param {object} [options]
   * @param {number} [options.offset=0]
   * @param {number} [options.limit=20]
   * @returns {Bluebird<MatchActionInstance[]>}
   */
  getMatchActions(matchId, options) {
    Utils.check.posInt('matchId', matchId);

    options = _.defaults(options, {offset: 0, limit: 20});

    Utils.check.posInt('offset', options.offset);
    Utils.check.posInt('limit', options.limit);

    return Db.models.matchAction.findAll({
      where: {matchId: matchId},
      offset: options.offset,
      limit: options.limit,
      order: [['id', 'desc']],
      include: [Db.models.user]
    });
  }

  /**
   * Deletes unconfirmed matches that lived beyond their expiration date (creation date + TTL).
   *
   * @returns {Bluebird<void>}
   */
  cleanUpOldMatches() {
    return Promise.resolve().then(() => { // We need to wrap in a bluebird promise (.cancellable() is invoked)
      return Db.models.match.destroy({
        where: {
          expirationDate: {
            $lt: new Date()
          },
          status: {
            $not: 'confirmed'
          }
        }
      });
    }).return();
  }
}

module.exports = new AlertDAO();
