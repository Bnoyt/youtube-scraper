/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * Used to manage a dataSource (graph server info + searchIndex server info).
 * - to connect to graph server and searchIndex server
 *
 * - Created on 2015-01-09.
 */
'use strict';

// int libs
const crypto = require('crypto');

// ext libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../index');
const Config = LKE.getConfig();
const Utils = LKE.getUtils();
const Log = LKE.getLogger(__filename);
const Db = LKE.getSqlDb();
const Errors = LKE.getErrors();

// locals
const GraphDAO = require('../../dao/graph/graphDAO');
const IndexDAO = require('../../dao/index/indexDAO');
const GraphSchemaBuilder = require('./graphSchemaBuilder');
const Progress = require('./progress');

const DUMMY_VALUE_COUNT = 100000;

/**
 * Data source features
 *
 * @typedef {object} LkDataSourceFeatures
 * @property {object} schema                   whether this source is capable of generating a detailed schema
 * @property {boolean} schema.counts           whether the schema contains counts. If set to false it will freeze the schema
 * @property {boolean} schema.properties       whether the schema contains properties
 * @property {boolean} schema.inferred         whether the schema feature is able to discover inferred node/edge types
 * @property {boolean} typing                  whether this source is able to produce type information for properties
 * @property {boolean} edgeProperties          whether edge properties are supported
 * @property {boolean} immutableNodeCategories true if node categories are immutable
 * @property {number} minNodeCategories        the minimum number of categories for a node
 * @property {number} maxNodeCategories        the maximum number of categories for a node
 * @property {boolean} canCount                whether one among the graph or the index can count nodes and edges
 * @property {boolean} alerts                  whether alerts are supported
 * @property {string[]} dialects               list of supported graph-query dialects
 * @property {boolean} shortestPath            whether it can compute a shortest path
 * @property {boolean} externalIndex           whether the index is external
 * @property {boolean} alternativeIds          whether alternative IDs are supported by the graph DAO
 * @property {boolean} fuzzy                   whether the index allows fuzzy search queries
 * @property {boolean} canIndexEdges           whether the index can index edges
 * @property {boolean} canIndexCategories      whether the index can index categories
 * @property {boolean} versions                whether the index can provide versions
 * @property {string} advancedQueryDialect     whether the index can provide advanced search queries
 * @property {boolean} searchHitsCount         whether the search result will contain 'totalHits' or 'moreResults'
 */

/**
 * Create a DataSource
 *
 * @param {number} sourceId index of the source configuration in the dataSources config array.
 * @param {Data} dataService the data service
 * @constructor
 */
function DataSource(sourceId, dataService) {
  if (typeof sourceId !== 'number' || isNaN(sourceId)) {
    throw Errors.technical('bug', '"sourceId" is required');
  }

  this.sourceId = sourceId;
  this.dataService = dataService;
  this.pollIntervalMillis = Config.get('advanced.pollInterval', 10) * 1000;
  this._pollGraphState = {timer: null, promise: null};
  this._pollIndexState = {timer: null, promise: null};

  this.indexationRetries = 10;

  this._resetSource();
}

/**
 * Computes the information of a data-source by concatenating
 * "[graphServerHost]:[graphServerPort]:[graphStoreId]".
 *
 * @param {string} graphServerHost hostname of the source graph server
 * @param {string|number} graphServerPort port of the source graph server
 * @param {string} graphStoreId unique identifier of the database-store in the source graph server
 * @returns {string} the information of the data-source
 */
DataSource.computeSourceInfo = function(graphServerHost, graphServerPort, graphStoreId) {
  return graphServerHost + ':' + graphServerPort + ':' + graphStoreId;
};

/**
 * @param {string} sourceInfo a data-source identification key
 * @returns {string|undefined} an 8 characters HEX string (truncated from full SHA256 HEX of sourceInfo)
 */
DataSource.computeSourceKey = function(sourceInfo) {
  if (sourceInfo === undefined) { return undefined; }
  const sha256Hash = crypto.createHash('sha256');
  sha256Hash.update(sourceInfo, 'utf8');
  return sha256Hash.digest('hex').substr(0, 8);
};

DataSource.prototype = {
  config: undefined,
  storeId: undefined,

  /**
   * Set manually when we should not interact with this source anymore:
   * - will stop polling graph/index servers
   * - can be removed from sources list
   *
   * @type boolean
   */
  destroyed: false,
  _connecting: false,

  /**
   * The progress of the indexation of null if the source is not currently indexing.
   *
   * @type Progress
   */
  indexingProgress: null,

  /**
   * The GraphDAO of this data-source
   *
   * @type GraphDAO
   */
  graph: undefined,
  graphConnected: false,
  graphConnectPromise: null,
  graphConnectError: null,

  /**
   * The IndexDAO of this data-source
   *
   * @type IndexDAO
   */
  index: undefined,
  indexConnected: false,
  indexConnectPromise: null,
  indexConnectError: null,

  /**
   * @returns {boolean} true if the data-source is currently connected
   */
  isConnected: function() {
    return this.graphConnected && this.indexConnected;
  },

  /**
   * codes: offline, connecting, needConfig, needFirstIndex, needReindex, indexing, ready
   *
   * return {{code:string, reason:string}}
   */
  getState: function() {
    if (this.destroyed) {
      return {
        code: 'offline',
        reason: 'Data-source is invalid (please restart Linkurious).'
      };
    }

    // connecting
    if (this.graphConnectPromise) {
      return {
        code: 'connecting',
        reason: 'Trying to connect to graph database ...',
        error: this.graphConnectError
      };
    }
    if (this.indexConnectPromise) {
      return {
        code: 'connecting',
        reason: 'Trying to connect to search index ...',
        error: this.indexConnectError
      };
    }
    if (this._connecting) {
      return {
        code: 'connecting',
        reason: 'Trying to connect to data-source ...',
        error: null
      };
    }

    // offline
    if (!this.graphConnected || !this.indexConnected) {
      if (!this.graphConnected && this.graphConnectError) {
        return {
          code: 'offline',
          reason: 'Could not connect to graph database server.',
          error: this.graphConnectError
        };
      }

      if (!this.indexConnected && this.indexConnectError) {
        return {
          code: 'offline',
          reason: 'Could not connect to index server.',
          error: this.indexConnectError
        };
      }

      return {
        code: 'offline',
        reason: 'Disconnected from data-source.'
      };
    }

    // online:

    // indexing
    if (this.isIndexing()) {
      const p = this.indexingProgress;
      return {
        code: 'indexing',
        reason: 'Currently indexing ' + p.getRate() +
        '. Progress: ' + p.getPercent() + '%. Time left: ' + p.getTimeLeft()
      };
    }

    // needConfig (source was never configured and never indexed)
    if (this.needConfig()) {
      return {
        code: 'needConfig',
        reason: 'An administrator needs to configure this data-source for indexation.'
      };
    }

    // needFirstIndex (source was configured, but was NEVER indexed)
    if (this.needFirstIndex()) {
      return {
        code: 'needFirstIndex',
        reason: 'The data-source needs to be indexed at least once.',
        error: this.state.indexationError
      };
    }

    // needReindex (source was already indexed, configuration changed, re-index is required)
    if (this.needReindex()) {
      return {
        code: 'needReindex',
        reason: 'The data-source needs to be re-indexed',
        error: this.state.indexationError
      };
    }

    // ready :)
    return {code: 'ready', reason: 'The data-source is ready.'};
  },

  sourceInfoCache: undefined,
  sourceKeyCache: undefined,

  /**
   * @returns {boolean} true if this source is currently indexing
   */
  isIndexing: function() {
    return !!this.indexingProgress;
  },

  /**
   * The hashed version of the value returned by `getSourceInfo`, shorter and non-human readable.
   * Used for API communication.
   *
   * The sourceKey actually identifies the data-source (a graph database on a specific server/port).
   * This ID is used to make accessRights and visualizations relative to a data-source.
   *
   * @param {boolean} [ignoreOffline] If true, won't throw an error if we cannot read the source info.
   * @returns {string} an 8 char HEX string identifying a data-source uniquely.
   */
  getSourceKey: function(ignoreOffline) {
    if (this.sourceKeyCache === undefined) {
      if (Utils.hasValue(this.config.manualSourceKey)) {
        Utils.checkSourceKey(this.config.manualSourceKey, 'manualSourceKey');
        this.sourceKeyCache = this.config.manualSourceKey;
      } else {
        this.sourceKeyCache = DataSource.computeSourceKey(this.getSourceInfo(ignoreOffline));
      }
    }
    return this.sourceKeyCache;
  },

  /**
   * A string describing the data-source uniquely, as returned by DataSource.computeSourceInfo.
   *
   * @param {boolean} [ignoreOffline=false] If true, won't throw an error if we cannot read the source info.
   * @returns {string|undefined} the long version of this data-source's unique identifier
   */
  getSourceInfo: function(ignoreOffline) {
    if (!this.storeId) {
      if (ignoreOffline) { return undefined; }
      throw Errors.technical('bug', 'DataSource.getSourceInfo called before storeId is set');
    }
    if (this.sourceInfoCache === undefined) {
      const hp = Utils.extractHostPort(this.config.graphdb.url);
      if (!hp) {
        throw Errors.business('invalid_parameter',
          'Cannot extract host and port from graph URL (' + this.getSourceName() + ')'
        );
      }
      this.sourceInfoCache = DataSource.computeSourceInfo(hp.host, hp.port, this.storeId);
    }
    return this.sourceInfoCache;
  },

  /**
   * Returns the name of the source (or a default generated name if config.name if not set).
   *
   * @returns {string}
   */
  getSourceName: function() {
    return 'data-source ' + (this.config.name
      ? ('"' + this.config.name + '"')
      : ('#' + this.sourceId)
    );
  },

  /**
   * A display name for this source.
   *
   * @returns {string}
   */
  getDisplayName: function() {
    if (this.state && this.state.name) {
      return this.state.name;
    } else if (this.config.name) {
      return this.config.name;
    } else {
      return 'Database #' + this.sourceId;
    }
  },

  /**
   * @private
   * @param {boolean} initial whether this event is the initial connection or not.
   * @param {boolean} good true if this is good news
   * @param {string} message
   */
  _onConnectionEvent: function(initial, good, message) {
    if (initial) { return; }
    Log[good ? 'info' : 'error'](message);
  },

  /**
   * @returns {Promise}
   * @private
   */
  _connectGraph: function() {
    const self = this;
    const name = self.getSourceName();

    const connect = () => {
      self.graphConnectError = null;
      return self.graph.connect().then(version => {
        self.graphVersion = version;

        // if a storeId is already set (reconnecting), check that it has not changed
        if (!self.storeId) { return; }
        return self.getStoreId().then(storeId => {
          if (self.storeId !== storeId) {
            // reset also cancels the current graph connection promise
            self._resetSource();
            const message = 'Please retry connecting the data-source (the database has changed).';
            return Errors.business('critical', message, true);
          }
        });
      }).then(() => {
        self.graphConnected = true;
        self._onConnectionEvent(true, true, 'Connected to graph database (' + name + ')');
      }).catch(e => {
        self.graphConnectError = e.message ? e.message : 'Unknown error';
        return Promise.reject(e);
      });
    };

    const actionName = 'connecting to graph database (' + name + ')';
    const maxRetries = Config.get('advanced.connectionRetries', 5);
    const giveUp = error => (
      // used for bad credentials, inconsistent parameters
      error.key === 'invalid_parameter' ||

      // this version of the graph server is not supported: give up
      error.key === 'not_supported' ||

      // a user action is needed to allow this graph server to be used: give up
      error.key === 'source_action_needed' ||

      // there was a credentials error: give up
      error.message.includes('username and password') ||

      // the storeId has changed: give up
      error.message.includes('database has changed')
    );

    if (self.graphConnectPromise) {
      self.graphConnectPromise.cancel();
      self.graphConnectPromise = null;
    }
    return self.graphConnectPromise = Utils.retryPromise(
      actionName,
      connect,
      {delay: 5000, retries: maxRetries, giveUp: giveUp}
    ).finally(() => {
      self.graphConnectPromise = null;
    });
  },

  /**
   * @returns {Promise}
   * @private
   */
  _connectIndex: function() {
    const self = this;
    const name = self.getSourceName();

    const connect = () => {
      self.indexConnectError = null;
      return self.index.connect().then(version => {
        self.indexVersion = version;
        self.indexConnected = true;
        self._onConnectionEvent(true, true, 'Connected to search index (' + name + ')');
        return Promise.resolve();
      }).catch(e => {
        self.indexConnectError = e.message ? e.message : 'Unknown error';
        return Promise.reject(e);
      });
    };

    const actionName = 'connecting to search index (' + name + ')';
    const retries = Config.get('advanced.connectionRetries', 5);

    if (self.indexConnectPromise) {
      self.indexConnectPromise.cancel();
      self.indexConnectPromise = null;
    }

    return self.indexConnectPromise = Utils.retryPromise(actionName, connect, {
      delay: 5000,
      retries: retries,
      giveUp: error => (
        // used for bad credentials, inconsistent parameters
        error.key === 'invalid_parameter' ||

        // this version of the index server is not supported: give up
        error.key === 'not_supported' ||

        // a user action is needed to allow this index server to be used: give up
        error.key === 'source_action_needed'
      )
    }).finally(() => {
      self.indexConnectPromise = null;
    });
  },

  /**
   * Detect the store ID.
   * Can be called only once the Graph DAO is connected.
   *
   * @returns {Promise.<String|LkError>}
   */
  getStoreId: function() {
    return this.graph.getStoreId();
  },

  /**
   * Check if a set of alternative IDs is legal for this data-source
   *
   * @param {object} alternativeIds
   * @param {string} [alternativeIds.node]
   * @param {string} [alternativeIds.edge]
   */
  checkAlternativeIdKeys: function(alternativeIds) {
    if (!alternativeIds) { return; }

    // if an alternative node ID was provided
    if (alternativeIds.node !== undefined) {
      const configAltNodeId = this.config.graphdb.alternativeNodeId;
      if (Utils.noValue(configAltNodeId)) {
        // no alternative node ID is authorized
        throw Errors.business(
          'invalid_parameter',
          `No alternative node ID is authorised for data-source #${this.sourceId}.`
        );
      } else if (configAltNodeId !== alternativeIds.node) {
        // wrong alternative node id
        throw Errors.business(
          'invalid_parameter',
          `Alternative node ID "${alternativeIds.node}" should be "${configAltNodeId}".`
        );
      }
    }

    // if an alternative edge ID was provided
    if (alternativeIds.edge !== undefined) {
      const configAltEdgeId = this.config.graphdb.alternativeEdgeId;
      if (Utils.noValue(configAltEdgeId)) {
        // no alternative edge ID is authorized
        throw Errors.business(
          'invalid_parameter',
          `No alternative edge ID is authorised for data-source #${this.sourceId}.`
        );
      } else if (configAltEdgeId !== alternativeIds.edge) {
        // wrong alternative node id
        throw Errors.business(
          'invalid_parameter',
          `Alternative edge ID "${alternativeIds.edge}" should be "${configAltEdgeId}".`
        );
      }
    }
  },

  /**
   * Called once the graph-provider is online, just before connecting to the index-provider.
   *
   * Detects/reads the store ID, then load the state of the current store.
   * Updates the 'lastSeen' field of the state.
   *
   * @returns {Promise}
   * @private
   */
  _initSource: function() {
    const self = this;
    return self.getStoreId().then(storeId => {
      self.storeId = storeId;

      // compute the sourceKey (caches the value)
      const sourceKey = self.getSourceKey();

      return Db.models.group.ensureBuiltins(sourceKey);
    }).then(() => {
      const sourceKey = self.getSourceKey();

      // check for other sources with the same key
      for (const source of this.dataService.sources) {
        if (source.sourceId === this.sourceId) { continue; }
        if (source.isConnected() && source.getSourceKey() === sourceKey) {
          // a different source with the same key exists
          this._resetSource();
          const message = 'This data-source is already configured once.';
          this.graphConnectError = message;
          return Promise.reject({message: message});
        }
      }

      const whereAndValues = {
        where: {key: sourceKey},
        defaults: {
          indexedDate: null,
          info: self.getSourceInfo(),
          lastSeen: new Date(),
          name: self.config.name,
          graphVendor: this.config.graphdb.vendor,
          indexVendor: this.config.index.vendor,
          needReindex: false
        }
      };
      // find (or create if never seen before) the data-source state entry in DB
      return Db.models.dataSourceState.findOrCreate(whereAndValues).spread((state, isNew) => {
        self.state = state;

        // if the state is not new
        if (!isNew) {
          const update = {};

          // update the lastSeen field
          update.lastSeen = new Date();

          // update the data-source name
          if (self.config.name) { update.name = self.config.name; }

          // if the index vendor has changed, require a re-index
          const currentIndexVendor = state.indexVendor || 'elasticSearch';
          if (currentIndexVendor !== this.config.index.vendor) {
            update.needReindex = true;
            update.indexationError = 'The index vendor was changed, please re-index.';
          }

          // remember vendors
          update.indexVendor = this.config.index.vendor;
          update.graphVendor = this.config.graphdb.vendor;

          return state.updateAttributes(update);
        }
      });
    }).catch(Errors.LkError, error => {
      // keep the error message for client display
      this.indexConnectError = error.message;
      return Promise.reject(error);
    });
  },

  /**
   * Returns true if the source's index-mapping has changed since last indexation
   *
   * @returns {boolean} true if the source needs to be re-indexed.
   */
  needReindex: function() {
    return this.state.needReindex;
  },

  /**
   * Returns true if the source has NEVER been indexed before.
   *
   * @returns {boolean} true if this source has never been indexed before
   */
  needFirstIndex: function() {
    return !this.state.indexedDate;
  },

  /**
   * Check if no index mapping has been configured.
   *
   * @returns {boolean} true if none of the index mapping has been set
   */
  needConfig: function() {
    if (this.index.features.external) { return false; }
    return Utils.noValue(this.state.noIndexNodeProperties) &&
      Utils.noValue(this.state.hiddenNodeProperties) &&
      Utils.noValue(this.state.noIndexEdgeProperties) &&
      Utils.noValue(this.state.hiddenEdgeProperties);
  },

  /**
   * - Sets an index mapping field (if unset), in order to disable the `needConfig` check.
   * - Sets needReindex to true if already indexed before
   * - Save the state
   *
   * @returns {Promise}
   * @private
   */
  _setStateBeforeIndexing: function() {
    // disable needConfig
    if (Utils.noValue(this.state.noIndexNodeProperties)) {
      this.state.noIndexNodeProperties = [];
    }

    // if not indexing for the first time, remember that indexing is unfinished
    if (!this.needFirstIndex()) {
      // Set need-reindex to true here, set to false when the indexation is done.
      // This persist the fact that an indexation is needed, even if the indexation fails.
      this.state.needReindex = true;
    }

    this.state.indexationError = 'The indexation was launched but did not complete.';

    return this.state.save();
  },

  /**
   * Set the 'indexedDate' of this dataSource state to now and 'needReindex' to false.
   *
   * @returns {Promise}
   * @private
   */
  _setIndexationSuccess: function() {
    this.state.indexedDate = new Date();
    this.state.needReindex = false;
    this.state.indexationError = null;
    return this.state.save();
  },

  /**
   * Persist the indexation error in the state and save the state
   *
   * @param {*} error
   * @returns {Promise}
   * @private
   */
  _setIndexationError: function(error) {
    if (error === undefined || null) {
      error = 'Unknown error';
    } else if (typeof(error) !== 'string') {
      if (error.message) {
        error = error.message;
      } else if (typeof(error) === 'object') {
        error = JSON.stringify(error);
      } else {
        error = error + '';
      }
    }

    this.state.indexationError = error
      ? (error.message ? error.message : error + '')
      : 'Unknown error during indexation.';
    return this.state.save();
  },

  /**
   * @param {boolean} [includeHidden=true] include hidden properties
   * @returns {string[]}
   */
  getNoIndexNodeProperties: function(includeHidden) {
    let noIndex = this.state.noIndexNodeProperties;
    if (Utils.noValue(noIndex)) { noIndex = []; }

    if (includeHidden !== false) {
      noIndex = noIndex.concat(this.getHiddenNodeProperties());
    }
    return _.sortedUniq(noIndex.sort());
  },

  /**
   * @returns {string[]}
   */
  getHiddenNodeProperties: function() {
    let hidden = this.state.hiddenNodeProperties;
    if (Utils.noValue(hidden)) { hidden = []; }
    return _.sortedUniq(hidden.sort());
  },

  /**
   * @param {string[]} noIndex
   * @returns {Promise}
   */
  setNoIndexNodeProperties: function(noIndex) {
    const self = this;
    if (this.index.features.external) { return Promise.resolve(); }
    return self._checkNeedReindex('node', null, noIndex).then(() => {
      self.state.noIndexNodeProperties = noIndex;
      return self.state.save();
    });
  },

  /**
   * @param {string[]} hidden
   * @returns {Promise}
   */
  setHiddenNodeProperties: function(hidden) {
    const self = this;
    if (this.index.features.external) { return Promise.resolve(); }
    return this._checkNeedReindex('node', hidden, null).then(() => {
      self.state.hiddenNodeProperties = hidden;
      return self.state.save();
    });
  },

  /**
   * @param {boolean} [includeHidden=true] include hidden properties
   * @returns {string[]}
   */
  getNoIndexEdgeProperties: function(includeHidden) {
    let noIndex = this.state.noIndexEdgeProperties;
    if (Utils.noValue(noIndex)) { noIndex = []; }

    if (includeHidden !== false) {
      noIndex = noIndex.concat(this.getHiddenEdgeProperties());
    }
    return _.sortedUniq(noIndex.sort());
  },

  /**
   * @returns {string[]}
   */
  getHiddenEdgeProperties: function() {
    let hidden = this.state.hiddenEdgeProperties;
    if (Utils.noValue(hidden)) { hidden = []; }
    return _.sortedUniq(hidden.sort());
  },

  /**
   * @param {string[]} noIndex
   * @returns {Promise}
   */
  setNoIndexEdgeProperties: function(noIndex) {
    const self = this;
    if (this.index.features.external) { return Promise.resolve(); }
    return self._checkNeedReindex('edge', null, noIndex).then(() => {
      self.state.noIndexEdgeProperties = noIndex;
      return self.state.save();
    });
  },

  /**
   * @param {string[]} hidden
   * @returns {Promise}
   */
  setHiddenEdgeProperties: function(hidden) {
    const self = this;
    if (this.index.features.external) { return Promise.resolve(); }
    return self._checkNeedReindex('edge', hidden, null).then(() => {
      self.state.hiddenEdgeProperties = hidden;
      return self.state.save();
    });
  },

  /**
   * Check if the current state if one of the legal states. Returns a rejected promise if not.
   *
   * @param {string} actionName the name oif the action (to create the error message)
   * @param {string[]} legalStates the list of states that are allowed
   * @param {boolean} [justWarn=false] if true, will no reject the promise but just log a warning
   * @returns {Promise.<boolean|LkError>}
   * @private
   */
  _checkState: function(actionName, legalStates, justWarn) {
    const state = this.getState().code;
    let message = '';
    let ok = true;

    if (!_.includes(legalStates, state)) {
      message = '"' + actionName + '" requires the data-source to be in one of these states: ' +
        legalStates + ' (current state: ' + state + ')';
      ok = false;
    }

    if (!ok) {
      if (justWarn) {
        Log.warn(message);
      } else {
        return Errors.business('illegal_source_state', message, true);
      }
    }
    return Promise.resolve(ok);
  },

  /**
   * Detect actual changes in the index mapping and request a re-index when changes happen.
   *
   * @param {string} type (node or edge)
   * @param {string[]|null} newHidden new hidden properties (or null if no changes were made)
   * @param {string[]|null} newNoIndex new no-index values (or null if no changes were made)
   * @returns {Promise.<undefined|LkError>}
   *
   * @private
   */
  _checkNeedReindex: function(type, newHidden, newNoIndex) {
    // check if the source state allow this change right now
    const self = this;

    const legalStates = ['ready', 'needConfig', 'needFirstIndex', 'needReindex'];
    return self._checkState('Updating the index-mapping', legalStates).then(() => {

      // check if the params are valid
      if (newHidden !== null && !Array.isArray(newHidden)) {
        return Errors.business(
          'invalid_parameter',
          'Hidden ' + type + ' properties must be an array',
          true
        );
      }
      if (newNoIndex !== null && !Array.isArray(newNoIndex)) {
        return Errors.business(
          'invalid_parameter',
          'Not-indexed ' + type + ' properties must be an array',
          true
        );
      }

      // compute the changes that will happen
      const t = _.startCase(type);
      const currentSkipIndex = self['getNoIndex' + t + 'Properties'](true);
      const nextHidden = newHidden || self['getHidden' + t + 'Properties']();
      const nextNoIndex = newNoIndex || self['getNoIndex' + t + 'Properties'](false);
      const nextSkipIndex = _.union(nextHidden, nextNoIndex);

      // differences = added + removed
      const differences = _.union(
        _.difference(currentSkipIndex, nextSkipIndex), // added
        _.difference(nextSkipIndex, currentSkipIndex) // removed
      );

      // set the re-index flag if the mapping is going to change
      if (differences.length > 0) {
        self.state.needReindex = true;
      }
    });
  },

  /**
   * Filter hidden properties from a node or an array of nodes
   *
   * @param {LkNode|LkNode[]} nodeOrNodes Node (or array thereof)
   * @param {boolean} [filterNoIndex=false] filter NoIndex properties as well
   * @returns {LkNode|LkNode[]}
   */
  filterNodeProperties: function(nodeOrNodes, filterNoIndex) {
    nodeOrNodes = Utils.clone(nodeOrNodes);

    if (!nodeOrNodes) { return nodeOrNodes; }

    const filter = filterNoIndex ? this.getNoIndexNodeProperties() : this.getHiddenNodeProperties();
    if (Array.isArray(nodeOrNodes)) {
      for (let i = 0; i < nodeOrNodes.length; ++i) {
        nodeOrNodes[i].data = _.omit(nodeOrNodes[i].data, filter);
      }
    } else {
      nodeOrNodes.data = _.omit(nodeOrNodes.data, filter);
    }
    return nodeOrNodes;
  },

  /**
   * Filter hidden properties from an edge or an array of edges
   *
   * @param {LkEdge|LkEdge[]} edgeOrEdges Edge (or array thereof)
   * @param {boolean} [filterNoIndex=false] filter NoIndex properties as well
   * @returns {LkEdge|LkEdge[]}
   */
  filterEdgeProperties: function(edgeOrEdges, filterNoIndex) {
    edgeOrEdges = Utils.clone(edgeOrEdges);

    if (!edgeOrEdges) { return edgeOrEdges; }

    const filter = filterNoIndex ? this.getNoIndexEdgeProperties() : this.getHiddenEdgeProperties();
    if (Array.isArray(edgeOrEdges)) {
      for (let i = 0; i < edgeOrEdges.length; ++i) {
        edgeOrEdges[i].data = _.omit(edgeOrEdges[i].data, filter);
      }
    } else {
      edgeOrEdges.data = _.omit(edgeOrEdges.data, filter);
    }
    return edgeOrEdges;
  },

  /**
   * @private
   */
  _initGraphDAO: function() {
    if (this.graph) { return; }
    try {
      this.graph = GraphDAO.createInstance(
        this.config.graphdb.vendor,
        this.config.graphdb
      );
    } catch(e) {
      if (e instanceof Errors.LkError) {
        Log.error(e.message);
        this.graphConnectError = e.message;
      }
      throw e;
    }
  },

  /**
   * Called once the graphDAO is initialized and connected.
   *
   * @private
   */
  _initIndexDAO: function() {
    if (this.index) { return; }
    try {
      this.index = IndexDAO.createInstance(
        this.config.index.vendor,
        this.config.index,
        this.graph
      );
    } catch(e) {
      if (e instanceof Errors.LkError) {
        this.indexConnectError = e.message;
      }
      throw e;
    }
  },

  /**
   * @throws {LkError} if the source is not ready
   */
  assertReady: function() {
    if (this.getState().code !== 'ready') {
      throw Errors.business(
        'dataSource_unavailable',
        'Data-source #' + this.sourceId + ' is not ready.'
      );
    }
  },

  /**
   * Checks if the graph or index config have changed
   *
   * @returns {boolean} whether the graph or index config have changed
   * @private
   */
  _configChanged: function() {
    const original = _.pick(this.config, ['index', 'graphdb']);
    const current = Config.get('dataSources.' + this.sourceId);
    const diff = Utils.objectDiff(original, current, {'root.index.indexName': true});
    if (diff.length > 0) {
      Log.info('configuration of data-source #' + this.sourceId + ' has changed.');
    }
    return diff.length > 0;
  },

  isReadOnly: function() {
    return !!this.config.readOnly;
  },

  /**
   * Inverse of _initSource (more or less):
   * - forget StoreID
   * - forget state
   * - unset graph DAO instance
   * - unset index DAO instance
   * - renew GraphSchemaBuilder
   *
   * @param {boolean} [forceDestroy=false] Force destroying (don't rebuild)
   * @private
   */
  _resetSource: function(forceDestroy) {
    this.config = Config.get('dataSources.' + this.sourceId);

    this.sourceInfoCache = undefined;
    this.sourceKeyCache = undefined;

    this.destroyed = false;

    // stop polling
    this._pollGraphState.promise = null;
    if (this._pollGraphState.timer) {
      clearTimeout(this._pollGraphState.timer);
    }
    this._pollIndexState.promise = null;
    if (this._pollIndexState.timer) {
      clearTimeout(this._pollIndexState.timer);
    }

    // disconnect graph and/or index
    this.disconnect();

    // reset connection state
    this.graphConnected = false;
    if (this.graphConnectPromise) {
      this.graphConnectPromise.cancel();
      this.graphConnectPromise = null;
    }
    this.graphConnectError = null;

    this.indexConnected = false;
    if (this.indexConnectPromise) {
      this.indexConnectPromise.cancel();
      this.indexConnectPromise = null;
    }
    this.indexConnectError = null;

    // forget DAOs
    this.graph = undefined;
    this.index = undefined;

    // set after connection
    this.indexVersion = 'unknown';
    this.graphVersion = 'unknown';
    this.storeId = undefined;
    this.state = undefined;
    this.indexingProgress = null;

    // forget schema builder
    this.graphSchemaBuilder = undefined;

    if (forceDestroy) {
      this.destroyed = true;

    } else if (!this.config) {
      this.destroyed = true;
      throw Errors.business(
        'invalid_parameter',
        'data-source #' + this.sourceId + ' does not exists anymore (missing configuration).'
      );

    } else {
      this.graphSchemaBuilder = new GraphSchemaBuilder(this);
    }
  },

  /**
   * Destroy this data-source
   */
  destroy: function() {
    this._resetSource(true);
  },

  /**
   * Will safely disconnect what needs to be disconnected.
   * Don't worry, this does not throw in case of failure.
   */
  disconnect() {
    if (this.graph) {
      this.graph.disconnect();
    }
    if (this.index) {
      this.index.disconnect();
    }
  },

  /**
   * Connect (or reconnect) to a disconnected data-source
   *
   * @param {boolean} [ignoreErrors=false] whether to catch promise rejections and ignore them
   * @returns {Promise}
   */
  connect: function(ignoreErrors) {
    const self = this;

    const configChanged = this._configChanged();
    // offline, connecting, needConfig, needFirstIndex, needReindex, ready
    const legalStates = configChanged
      ? ['offline', 'connecting', 'needConfig', 'needFirstIndex', 'needReindex', 'ready']
      : ['offline'];

    return self._checkState('Connecting', legalStates, true).then(ok => {
      if (!ok) { return; }

      if (configChanged) {
        // make the data-source new and fresh again
        self._resetSource();
      }

      return Promise.resolve().then(() => {
        self._initGraphDAO();
        self._connecting = true;
      }).then(() => {
        return self._connectGraph();
      }).then(() => {
        /**
         * we must init the source _after_ connecting to the graph but _before_ connecting to the
         * index because we need to detect the storeId from the graph in some cases, and the store Id
         * is needed to decide to which index we will to connect to.
         */
        return self._initSource();
      }).then(() => {
        // set the name of the index to connect to in IndexDAO configuration
        self.config.index.indexName = 'linkurious_' + self.getSourceKey();
        self._initIndexDAO();

        return self._connectIndex();
      }).then(() => {
        // start polling graph and index regularly once the both are connected
        self._onConnect();
      }).then(() => {
        // source connected successfully
        Log.info('Data-source #%s connected successfully (graph:%s v%s - index:%s v%s)',
          self.sourceId,
          self.config.graphdb.vendor, self.graphVersion,
          self.config.index.vendor, self.indexVersion
        );
      }).catch(error => {
        const indexConfig = self.config.index;
        const graphConfig = self.config.graphdb;

        // source could not connect
        const indexURL = Utils.hasValue(indexConfig.host)
          ? `http${indexConfig.https ? 's' : ''}://${indexConfig.host}:${indexConfig.port}`
          : '-';

        Log.warn('Data-source #%s could not connect (%s: %s / %s: %s): %s',
          self.sourceId,
          graphConfig.vendor, graphConfig.url,
          indexConfig.vendor, indexURL,
          (error.message ? error.message : error)
        );

        Log.debug('Data-source connection error: ', error);

        if (ignoreErrors) { return; }
        return Promise.reject(error);
      }).finally(() => {
        self._connecting = false;
      });
    });
  },

  /**
   * Get the status of the search for this data-source.
   * State: "ongoing", "needed", "done", "unknown".
   *
   * @returns {Promise.<{
   *   state:string,
   *   indexing_progress:number,
   *   indexing_status:string,
   *   node_count:number,
   *   edge_count:number,
   *   index_size:number,
   *   indexed_source:string
   * }>}
   */
  getSearchStatus: function() {
    const indexedSourceKey = this.dataService.getIndexedSource();
    // offline, connecting, needConfig, needFirstIndex, needReindex, ready
    const stateCode = this.getState().code;

    // ongoing
    if (stateCode === 'indexing') {
      const status = `Currently indexing ${this.indexingProgress.getRate()}. ` +
        `Time left: ${this.indexingProgress.getTimeLeft()}.`;

      return Promise.resolve({
        indexing: 'ongoing',
        'indexing_progress': this.indexingProgress.getPercent(),
        'indexing_status': status,
        'node_count': this.nodeCountCache,
        'edge_count': this.edgeCountCache,
        'index_size': this.indexingProgress.getTotalIndexedItems(),
        'indexed_source': indexedSourceKey
      });
    }

    // needed
    if (
      stateCode === 'needConfig' || stateCode === 'needFirstIndex' || stateCode === 'needReindex'
    ) {
      return Promise.resolve({
        indexing: 'needed',
        'indexing_progress': null,
        'indexing_status': 'The database needs to be indexed.',
        'node_count': null,
        'edge_count': null,
        'index_size': null,
        'indexed_source': indexedSourceKey
      });
    }

    // done
    if (stateCode === 'ready') {
      return Promise.resolve({
        indexing: 'done',
        'indexing_progress': null,
        'indexing_status': 'The database is fully indexed.',
        'node_count': null,
        'edge_count': null,
        'index_size': null,
        'indexed_source': indexedSourceKey
      });
    }

    // unknown
    return Promise.resolve({
      indexing: 'unknown',
      'indexing_progress': null,
      'indexing_status': 'Unknown indexation status.',
      'node_count': null,
      'edge_count': null,
      'index_size': null,
      'indexed_source': indexedSourceKey
    });
  },

  /**
   * @type {LkDataSourceFeatures}
   */
  get features() {
    if (!this.graph || !this.index) { return {}; }

    //noinspection PointlessBooleanExpressionJS
    return {

      // look at the typedef of LkDataSourceFeatures for the meaning of these features
      schema: this.index.features.external ? this.index.features.schema : {
        // an internal index does a full scan on the graph so every sub-feature is always true
        counts: true,
        properties: true,
        inferred: true
      },
      typing: !!this.index.features.typing,
      edgeProperties: !!this.graph.features.edgeProperties,
      immutableNodeCategories: !!this.graph.features.immutableNodeCategories,
      minNodeCategories: this.graph.features.minNodeCategories,
      maxNodeCategories: this.graph.features.maxNodeCategories,
      serializeArrayProperties: this.graph.features.serializeArrayProperties,
      canCount: !!this.graph.features.canCount || !!this.index.features.canCount,
      alerts: !!this.graph.features.alerts,
      dialects: this.graph.features.dialects,
      shortestPaths: !!this.graph.features.shortestPaths,
      externalIndex: !!this.index.features.external,
      alternativeIds: !!this.graph.features.alternativeIds,
      fuzzy: !!this.index.features.fuzzy,
      canIndexEdges: !!this.index.features.canIndexEdges,
      canIndexCategories: !!this.index.features.canIndexCategories,
      versions: !!this.index.features.versions,
      advancedQueryDialect: this.index.features.advancedQueryDialect,
      searchHitsCount: this.index.features.searchHitsCount
    };
  },

  /**
   * Start polling the graph and index DAO to detect source disconnection.
   *
   * @private
   */
  _onConnect: function() {
    this._pollGraph();
    this._pollIndex();
  },

  /**
   * Checks the state of the index:
   * - if already checking, uses the promise of the ongoing check
   * - schedules the next check
   * - returns a promise of the check
   *
   * @param {boolean} [pollIfIndexing=false]
   * @returns {Promise}
   * @private
   */
  _pollGraph: function(pollIfIndexing) {
    const self = this;

    // stop polling if we are currently connecting (poll will restart after connect)
    if (self.graphConnectPromise) {
      return Promise.resolve();
    }

    if (self.destroyed || !self.graph) {
      self.graphConnected = false;
      return Promise.resolve();
    }

    // return the existing promise if we are already checking the state
    if (self._pollGraphState.promise) {
      return self._pollGraphState.promise;
    }

    // already scheduled, un-schedule
    if (self._pollGraphState.timer) {
      clearTimeout(self._pollGraphState.timer);
    }

    const reschedule = () => {
      self._pollGraphState.timer = setTimeout(() => {
        self._pollGraph();
      }, self.pollIntervalMillis);
    };

    // don't check the state of the graph/index while indexing
    if (self.isIndexing() && !pollIfIndexing) {
      reschedule();
      return Promise.resolve();
    }

    const name = self.getSourceName();
    Log.debug('polling graph database: ' + name);
    self._pollGraphState.promise = self.graph.checkUp().then(() => {
      reschedule();
    }).catch(() => {
      self.graphConnected = false;
      self._onConnectionEvent(false, false, `Lost connection to graph database ${name}`);

      return self._connectGraph().then(() => {
        self._onConnectionEvent(false, true, `Restored connection to graph database ${name}`);
        reschedule();
      }).catch(() => {
        // swallow error when reconnect fails and we give up
      });
    }).finally(() => {
      self._pollGraphState.promise = null;
    });

    return self._pollGraphState.promise;
  },

  /**
   * Checks the state of the index:
   * - if already checking, uses the promise of the ongoing check
   * - schedules the next check
   * - returns a promise of the check
   *
   * @param {boolean} [pollIfIndexing=false]
   * @returns {Promise}
   * @private
   */
  _pollIndex: function(pollIfIndexing) {
    const self = this;

    // stop polling if we are currently connecting (poll will restart after connect)
    if (self.indexConnectPromise) {
      return Promise.resolve();
    }

    if (self.destroyed || !self.index) {
      self.indexConnected = false;
      return Promise.resolve();
    }

    // return the existing promise if we are already checking the state
    if (self._pollIndexState.promise) {
      return self._pollIndexState.promise;
    }

    // already scheduled, un-schedule
    if (self._pollIndexState.timer) {
      clearTimeout(self._pollIndexState.timer);
    }

    const reschedule = () => {
      self._pollIndexState.timer = setTimeout(() => {
        self._pollIndex();
      }, self.pollIntervalMillis);
    };

    // don't check the state of the index while indexing
    if (self.isIndexing() && !pollIfIndexing) {
      reschedule();
      return Promise.resolve();
    }

    const name = self.getSourceName();
    Log.debug('polling search index: ' + name);
    self._pollIndexState.promise = self.index.checkUp().then(() => {
      reschedule();
    }).catch(() => {
      self.indexConnected = false;
      self._onConnectionEvent(false, false, 'Lost connection to search index (' + name + ')');

      return self._connectIndex().then(() => {
        self._onConnectionEvent(false, true, 'Restored connection to search index (' + name + ')');
        reschedule();
      }).catch(() => {
        // swallow error when reconnect fails and we give up
      });
    }).finally(() => {
      self._pollIndexState.promise = null;
    });

    return self._pollIndexState.promise;
  },

  /**
   * Update the source index/schema.
   *
   * @returns {Promise}
   */
  indexSource: function() {
    return Promise.resolve().then(() => {
      if (!this.index.features.external) {
        return this._indexSource();
      } else {
        return this._externalIndexSource();
      }
    });
  },

  /**
   * Update the graph schema from the index.
   *
   * @returns {Promise}
   * @private
   */
  _externalIndexSource: function() {
    const states = ['needFirstIndex', 'needReindex', 'ready'];
    return this._checkState('Indexing', states).then(() => {
      // create the indexing progress reporter
      this.indexingProgress = new Progress(Log, this.getSourceName() + ':');

      /**
       * If the schema doesn't provide counts we freeze the schema.
       * This means that no types are added or removed from the schema
       * other than in `_externalIndexSource`.
       *
       * This is due to the impossibility to track removed types without having the counts.
       */
      const schemaCanCount =
        Utils.hasValue(this.index.features.schema) && this.index.features.schema.counts;

      this.graphSchemaBuilder.init(!schemaCanCount);
      return this._setStateBeforeIndexing();
    }).then(() => {
      return this.graphSchemaBuilder.deleteAll(this.getSourceKey());
    }).then(() => {
      // don't index edges if not supported by the index or if explicitly skipped in the index options
      const skipEdges = this.index.getOption('skipEdgeIndexation', false);

      return Promise.props({
      // count the nodes in graph
      // TODO #948 remove dummy value
        nodeCount: this.graph.features.canCount
          ? this.graph.getNodeCount(true)
          : Promise.resolve(DUMMY_VALUE_COUNT),

        // count the edges in graph
        edgeCount: skipEdges
          ? 0
          : this.graph.features.canCount
            ? this.graph.getEdgeCount(true)
            : Promise.resolve(DUMMY_VALUE_COUNT)
      });
    }).then(results => {
      this.indexingProgress.start(results.nodeCount + results.edgeCount);
      this.nodeCountCache = results.nodeCount;
      this.edgeCountCache = results.edgeCount;

      Log.info(`Refreshing source ${this.getSourceName()} external index (if required)`);
      return this.index.indexSource(this.indexingProgress);
    }).then(() => {
      this.indexingProgress.end();
    }).then(() => Promise.props({
      nodeTypes: this.index.getSchema('node', true),
      edgeTypes: this.index.getSchema('edge', true)
    })).then(schema => {
      Log.info(`Refreshing source ${this.getSourceName()} schema using external index`);
      this.graphSchemaBuilder.ingestTypes('node', schema.nodeTypes);
      this.graphSchemaBuilder.ingestTypes('edge', schema.edgeTypes);
      return this.graphSchemaBuilder.saveSchema();
    }).then(() => {
      // we signal the GraphDAO and the IndexDAO that the indexation is at the end, so it can perform additional tasks
      return this.graph.onAfterIndexation();
    }).then(() => {
      return this.index.onAfterIndexation();
    }).then(() => {
      // set the indexation date in state
      return this._setIndexationSuccess();
    }).catch(error => {
      // capture the indexation error
      return this._setIndexationError(error).then(() => {
        return Promise.reject(error);
      });
    }).finally(() => {
      this.indexingProgress = null;
    });
  },

  /**
   * Cleans the search-index, reads the whole graph database and writes it to search-index.
   *
   * @returns {Promise}
   */
  _indexSource: function() {
    const self = this;

    // initialize some useful variables
    let sourceKey;
    /**
     * @type {GraphDAO}
     */
    const graph = self.graph;
    /**
     * @type {IndexDAO}
     */
    const index = self.index;

    // don't index edges if not supported by the index or if explicitly skipped in the index options
    const skipEdges = this.index.getOption('skipEdgeIndexation', false);

    const chunkSize = Config.get('advanced.indexationChunkSize', 5000);
    const isBusinessError = err => Errors.LkError.isBusinessType(err.type);

    const legalStates = ['ready', 'needConfig', 'needFirstIndex', 'needReindex'];
    return self._checkState('Indexing', legalStates).then(() => {

      // create the indexing progress reporter
      self.indexingProgress = new Progress(Log, self.getSourceName() + ':');

      // initialize some useful variables
      sourceKey = self.getSourceKey();

      return graph.onInternalIndexation();
    }).then(() => {

      // initialize/reset the schema builder
      self.graphSchemaBuilder.init();

      return self._setStateBeforeIndexing();
    }).then(() => {
      return self.graphSchemaBuilder.deleteAll(sourceKey);
    }).then(() => {
      return Promise.props({
        // empty the ES index
        clear: index.clear(),

        // count the nodes in graph
        // TODO #948 remove dummy value
        nodeCount: graph.features.canCount
          ? graph.getNodeCount(true)
          : Promise.resolve(DUMMY_VALUE_COUNT),

        // count the edges in graph
        edgeCount: skipEdges
          ? 0
          : graph.features.canCount
            ? graph.getEdgeCount(true)
            : Promise.resolve(DUMMY_VALUE_COUNT)
      });
    }).then(results => {
      self.indexingProgress.start(results.nodeCount + results.edgeCount);
      self.nodeCountCache = results.nodeCount;
      self.edgeCountCache = results.edgeCount;

      // Index Nodes
      let indexedNodes = 0;

      const ingestNodesChunk = nodes => {
        // add to schema builder
        self.graphSchemaBuilder.ingestNodes(nodes);
        // add to index (we first filter away properties we don't want to index)
        nodes = nodes.map(node => this.filterNodeProperties(node, true));
        return index.addEntries('node', nodes).then(() => {
          indexedNodes += nodes.length;
          self.indexingProgress.add('node', nodes);
        });
      };

      const indexNodes = () => {
        if (indexedNodes > 0) {
          Log.info('Trying to resume nodes indexation at offset ' + indexedNodes);
        }
        // stream nodes and ingest them into the index
        return streamNodes(graph, ingestNodesChunk, chunkSize, indexedNodes);
      };

      return Utils.retryPromise('Index nodes', indexNodes, {
        delay: 15 * 1000,
        retries: self.indexationRetries,
        giveUp: isBusinessError
      });
    }).then(() => {
      if (skipEdges) {
        // skip edge indexation
        return;
        // TODO #918 we need edge schema also with internal indices when edges are not indexed
      }

      // Index edges
      let indexedEdges = 0;

      const ingestEdgesChunk = edges => {
        // add to schema builder
        self.graphSchemaBuilder.ingestEdges(edges);
        // add to index (we first filter away properties we don't want to index)
        edges = edges.map(edge => this.filterEdgeProperties(edge, true));
        return index.addEntries('edge', edges).then(() => {
          indexedEdges += edges.length;
          self.indexingProgress.add('edge', edges);
        });
      };

      const indexEdges = () => {
        if (indexedEdges > 0) {
          Log.info('Trying to resume edges indexation at offset ' + indexedEdges);
        }
        // stream edges and ingest them into the index
        return streamEdges(graph, ingestEdgesChunk, chunkSize, indexedEdges);
      };

      return Utils.retryPromise('Index edges', indexEdges, {
        delay: 15 * 1000,
        retries: self.indexationRetries,
        giveUp: isBusinessError
      });
    }).then(() => {
      self.indexingProgress.end();
      // save the updated graph schema
      return self.graphSchemaBuilder.saveSchema();
    }).then(() => {
      // commit the updated index
      Log.info('Flushing index data to disk ...');
      return index.commit();
    }).then(() => {
      // we signal the IndexDAO that the indexation is at the end, so it can perform additional tasks
      return this.index.onAfterIndexation();
    }).then(() => {
      return self._setIndexationSuccess();
    }).catch(error => {
      // capture the indexation error
      return self._setIndexationError(error).then(() => {
        // if the indexation failed, recheck the state of the graph and index
        // in case then went offline (polling never rejects)
        return self._pollGraph(true);
      }).then(() => {
        return self._pollIndex(true);
      }).then(() => {
        // then, reject the indexation promise with the indexation error
        return Promise.reject(error);
      });
    }).finally(() => {
      self.indexingProgress = null;
    });
  }
};

// private static methods

/**
 * Read nodes stream and ingest them (write them to index)
 *
 * @param {Object} graph
 * @param {function} ingestNodes
 * @param {number} chunkSize
 * @param {number} offset
 * @returns {Promise}
 * @private
 */
function streamNodes(graph, ingestNodes, chunkSize, offset) {
  return graph.getNodeStream({offset: offset, chunkSize: chunkSize}).then(nodeStream => {
    return new Promise((resolve, reject) => {
      let nodesBuffer = [];

      const purgeBufferAndResume = () => {
        nodesBuffer = [];
        nodeStream.resume();
      };

      nodeStream.on('data', lkNode => {

        // add node to buffer
        nodesBuffer.push(lkNode);

        // if the buffer is full, write to elasticSearch
        if (nodesBuffer.length >= chunkSize) {
          nodeStream.pause();
          ingestNodes(nodesBuffer).then(purgeBufferAndResume, error => {
            Log.error('Indexing nodes: ingest failed.', error);
            reject(error);
          });
        }
      }).on('end', () => {
        ingestNodes(nodesBuffer).then(resolve, error => {
          Log.error('Indexing nodes: last ingest failed.', error);
          reject(error);
        });
      }).on('error', error => {
        Log.error('Indexing nodes: stream error.', error);
        reject(error);
      });
    });
  });
}

/**
 * Read the edge stream and ingest it
 *
 * @param {Object} graph
 * @param {function} ingestEdges
 * @param {number} chunkSize
 * @param {number} offset (to start indexing edges at a given offset from first edge)
 * @returns {Promise}
 * @private
 */
function streamEdges(graph, ingestEdges, chunkSize, offset) {
  return graph.getEdgeStream({offset: offset, chunkSize: chunkSize}).then(edgeStream => {
    return new Promise((resolve, reject) => {
      let edgesBuffer = [];

      const purgeBufferAndResume = () => {
        edgesBuffer = [];
        edgeStream.resume();
      };

      edgeStream.on('data', lkEdge => {

        // add edge to buffer
        edgesBuffer.push(lkEdge);

        // if the buffer is full, write to elasticSearch
        if (edgesBuffer.length >= chunkSize) {
          edgeStream.pause();
          ingestEdges(edgesBuffer).then(purgeBufferAndResume, error => {
            Log.error('Indexing edges: ingest failed.', error);
            reject(error);
          });
        }
      }).on('end', () => {
        ingestEdges(edgesBuffer).then(resolve, error => {
          Log.error('Indexing edges: last ingest failed.', error);
          reject(error);
        });
      }).on('error', error => {
        Log.error('Indexing edges: stream error.', error);
        reject(error);
      });
    });
  });
}

// export DataSource object

Object.seal(DataSource);
module.exports = DataSource;
