/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../../index');
const Config = LKE.getConfig();
const Utils = LKE.getUtils();
const Access = LKE.getAccess();
const Analytics = LKE.getAnalytics();
const DataProxy = LKE.getData(true);
const UserDAO = LKE.getUserDAO();

// locals
const api = require('../api');

/**
 * @typedef {object} LkDigestItem Number of nodes and edges grouped by node categories and edge types
 * @property {string[]} nodeCategories Categories of the nodes
 * @property {string}   edgeType       Type of the edges
 * @property {number}   nodes          Number of nodes
 * @property {number}   edges          Number of edges
 */

module.exports = function(app) {

  /**
   * @api {get} /api/status Get status
   * @apiName Status
   * @apiGroup Linkurious
   * @apiVersion 1.0.0
   *
   * @apiDescription Get the status of the Linkurious Server.
   *
   * @apiSuccess {object} status         Status of the server
   * @apiSuccess {number} status.code    Status code of the server (`100` : starting, `200` : OK, `>400` : problem)
   * @apiSuccess {string} status.name    Current server status
   * @apiSuccess {string} status.message Description of the current server status
   * @apiSuccess {number} status.uptime  Seconds since the server is up
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "status": {
   *       "code": 200,
   *       "name": "initialized",
   *       "message": "Linkurious ready to go :)",
   *       "uptime": 122
   *     }
   *   }
   */
  app.get('/api/status', api.respond(() => {
    return Promise.resolve({status: LKE.getStateMachine().get()});
  }));

  /**
   * @api {get} /api/dataSources Get data-sources status
   * @apiName DataSourcesStatus
   * @apiGroup Linkurious
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   *
   * @apiDescription Get the status of all the data-sources.
   * Users can only see data-sources with at least one group belonging to that data-source.
   * If a user has the "admin.connect" access right, he can also see all the disconnected
   * data-sources.
   *
   * @apiSuccess {object[]} sources                                   Data-sources
   * @apiSuccess {string}   sources.name                              Name of the data-source
   * @apiSuccess {number}   sources.configIndex                       Index of the data-source in the `dataSources` array in the configuration
   * @apiSuccess {string}   sources.key                               Unique key of this data-source (it's `null` if the data-source is not connected)
   * @apiSuccess {boolean}  sources.connected                         Whether the data-source is connected
   * @apiSuccess {string="offline","connecting",                      "needConfig","needFirstIndex","needReindex","indexing","ready"} sources.state Current state of the data-source
   * @apiSuccess {string}   sources.reason                            Explanation of the current state
   * @apiSuccess {string}   [sources.error]                           The error that caused the current state, if any
   * @apiSuccess {object}   sources.settings                          Settings of the data-source
   * @apiSuccess {object}   sources.settings.alternativeIds           Current source alternative IDs
   * @apiSuccess {string}   sources.settings.alternativeIds.node      Alternative node ID
   * @apiSuccess {string}   sources.settings.alternativeIds.edge      Alternative edge ID
   * @apiSuccess {string}   sources.settings.latitudeProperty         The default node property used for latitude
   * @apiSuccess {string}   sources.settings.longitudeProperty        The default node property used for longitude
   * @apiSuccess {boolean}  sources.settings.skipEdgeIndexation       Whether edges are not indexed for this source
   * @apiSuccess {boolean}  sources.settings.readOnly                 Whether the source is in readonly mode
   * @apiSuccess {object[]} sources.settings.specialProperties        Properties with special access rights for this source
   * @apiSuccess {string}   sources.settings.specialProperties.key    Key of the property
   * @apiSuccess {boolean}  sources.settings.specialProperties.read   Whether the property can be read
   * @apiSuccess {boolean}  sources.settings.specialProperties.create Whether the property can be created
   * @apiSuccess {boolean}  sources.settings.specialProperties.update Whether the property can be updated
   * @apiSuccess {object}   sources.features                          Features of the data-source
   * @apiSuccess {object}   sources.features.schema                   Whether the schema is available
   * @apiSuccess {boolean}  sources.features.schema.counts            Whether the schema can be modified or not (`false` implies that the schema is frozen)
   * @apiSuccess {boolean}  sources.features.schema.properties        Whether the properties of each category/type are included in the schema
   * @apiSuccess {boolean}  sources.features.schema.inferred          Whether the schema is able to discover inferred node/edge types
   * @apiSuccess {boolean}  sources.features.typing                   Whether property types are available in the schema
   * @apiSuccess {boolean}  sources.features.edgeProperties           Whether edge properties are allowed
   * @apiSuccess {boolean}  sources.features.immutableNodeCategories  Whether node categories are immutable
   * @apiSuccess {number}   sources.features.minNodeCategories        Minimum number of categories for a node
   * @apiSuccess {number}   sources.features.maxNodeCategories        Maximum number of categories for a node
   * @apiSuccess {boolean}  sources.features.canCount                 Whether one among the graph or the index can count nodes and edges
   * @apiSuccess {boolean}  sources.features.alerts                   Whether alerts are available
   * @apiSuccess {string[]} sources.features.dialects                 Dialects supported by the graph database
   * @apiSuccess {boolean}  sources.features.shortestPath             Whether shortest paths queries are allowed
   * @apiSuccess {boolean}  sources.features.externalIndex            Whether the search index is internal (e.g: elasticsearch) or external (e.g: DSE Search)
   * @apiSuccess {boolean}  sources.features.alternativeIds           Whether alternative IDs can be used
   * @apiSuccess {boolean}  sources.features.fuzzy                    Whether the search index allows fuzzy search queries
   * @apiSuccess {boolean}  sources.features.canIndexEdges            Whether the search index can index edges
   * @apiSuccess {boolean}  sources.features.canIndexCategories       Whether the search index can index categories
   * @apiSuccess {boolean}  sources.features.versions                 Whether nodes and edges versions are increased on edit
   * @apiSuccess {string}   sources.features.advancedQueryDialect     Whether the index provide advanced queries and with which 'dialect'
   * @apiSuccess {boolean}  sources.features.searchHitsCount          Whether the search result will contain 'totalHits' or 'moreResults'
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "sources": [
   *       {
   *         "name": "Database #0",
   *         "configIndex": 0,
   *         "key": "a2e3c50f",
   *         "connected": true,
   *         "state": "ready",
   *         "reason": "The data-source is ready.",
   *         "settings": {
   *           "alternativeIds": {
   *             "node": "name",
   *             "edge": "altEdgeID"
   *           },
   *           "skipEdgeIndexation": false,
   *           "readOnly": false,
   *           "specialProperties": [
   *             {
   *               "key": "propertyName",
   *               "read": true,
   *               "create": true,
   *               "update": false
   *             }
   *           ]
   *         },
   *         "features": {
   *           "schema": {
   *             "counts": true,
   *             "properties": true,
   *             "inferred": true
   *           },
   *           "typing": true,
   *           "edgeProperties": true,
   *           "immutableNodeCategories": false,
   *           "minNodeCategories": 0,
   *           "canCount": true,
   *           "alerts": true,
   *           "dialects": [
   *             "cypher"
   *           ],
   *           "shortestPaths": true,
   *           "externalIndex": false,
   *           "alternativeIds": true,
   *           "fuzzy": true,
   *           "canIndexEdges": true,
   *           "canIndexCategories": true,
   *           "versions": true,
   *           "advancedQueryDialect": "elasticsearch",
   *           "searchHitsCount": true
   *         }
   *       }, {
   *         "name": "Database #1",
   *         "configIndex": 1,
   *         "key": "ef984bb0",
   *         "connected": true,
   *         "state": "needFirstIndex",
   *         "reason": "The data-source needs to be indexed at least once.",
   *         "settings": {
   *           // ...
   *         },
   *         "features": {
   *           // ...
   *         }
   *       }, {
   *         "name": "Database #2",
   *         "configIndex": 2,
   *         "key": null,
   *         "connected": false,
   *         "state": "offline",
   *         "reason": "Could not connect to graph database server.",
   *         "error": "Connection refused (check your username and password)",
   *         "settings": {
   *           // ...
   *         },
   *         "features": {
   *           // ...
   *         }
   *       }
   *     ]
   *   }
   */
  app.get('/api/dataSources', api.respond(req => {
    const wrappedUser = Access.getCurrentWrappedUser(req);

    return DataProxy.getSourceStates(wrappedUser).then(sources => {
      return {sources: sources};
    });
  }));

  /**
   * @api {get} /api/version Get version
   * @apiName Version
   * @apiGroup Linkurious
   * @apiVersion 1.0.0
   *
   * @apiDescription Get Linkurious' current version information.
   *
   * @apiSuccess {string}  tag_name   Version tag
   * @apiSuccess {string}  name       Version name
   * @apiSuccess {boolean} prerelease Whether this is a pre-release
   * @apiSuccess {boolean} enterprise Whether this is Linkurious Enterprise or Linkurious Starter
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "tag_name": "v0.5.0",
   *     "name": "Nasty Nostradamus",
   *     "prerelease": true,
   *     "enterprise": true
   *   }
   */
  app.get('/api/version', api.respond(() => {
    return Promise.resolve(LKE.getRelease());
  }));

  /**
   * @api {get} /api/config Get the configuration
   * @apiName GetConfiguration
   * @apiGroup Linkurious
   * @apiVersion 1.0.0
   *
   * @apiDescription Get the configuration of Linkurious.
   *
   * @apiParam {number} [sourceIndex=0] Index of the data-source in the `dataSources` array in the configuration of which the `source` field in the response will be about
   *
   * @apiSuccess {object}   access                                   Access configuration
   * @apiSuccess {boolean}  access.authRequired                      Whether authentication is required
   * @apiSuccess {number}   access.loginTimeout
   * @apiSuccess {string="dashboard","workspace"} access.defaultPage Default page
   * @apiSuccess {object}   access.defaultPageParams
   * @apiSuccess {boolean}  access.dataEdition                       Whether it's possible to create, update and delete nodes and edges
   * @apiSuccess {boolean}  access.widget                            Whether the widget feature is enabled
   * @apiSuccess {object}   ogma                                     Configuration of Ogma
   * @apiSuccess {boolean}  enterprise                               Whether this is Linkurious Enterprise or Linkurious Starter
   * @apiSuccess {string}   domain                                   The server domain
   * @apiSuccess {string}   ssoProvider                              The current SSO provider (or `null` if none)
   * @apiSuccess {object}   defaultStyles                            Default styles configuration
   * @apiSuccess {object}   defaultCaptions                          Default captions configuration
   * @apiSuccess {object}   advanced                                 Advanced data-source settings applied to all data-sources
   * @apiSuccess {number}   advanced.maxPathLength                   Maximum path length returned by the shortest path API
   * @apiSuccess {number}   advanced.shortestPathsMaxResults         Maximum number of results returned by shortest paths API
   * @apiSuccess {number}   advanced.connectionRetries               Maximum number of retries when connecting/reconnecting to data-source
   * @apiSuccess {number}   advanced.pollInterval                    Number of seconds between "pings" to a data-source when connected
   * @apiSuccess {number}   advanced.indexationChunkSize             Number of nodes/edges read at once from a data-source when indexing it
   * @apiSuccess {number}   advanced.expandThreshold                 Number of expanded nodes that will trigger the "limit expand to" popup
   * @apiSuccess {number}   advanced.searchAddAllThreshold           Maximum number of added nodes using the "add all" in a search
   * @apiSuccess {number}   advanced.searchThreshold                 Maximum value of the `"size"` parameter in all search APIs
   * @apiSuccess {number}   advanced.minSearchQueryLength            Minimum number of characters in a search query before it is sent to the server
   * @apiSuccess {number}   advanced.rawQueryTimeout                 Timeout of pattern queries (`cypher`, `gremlin`, etc.) in milliseconds
   * @apiSuccess {number}   advanced.layoutWorkers
   * @apiSuccess {number}   advanced.defaultFuzziness
   * @apiSuccess {string}   advanced.extraCertificateAuthorities
   * @apiSuccess {string}   advanced.obfuscation
   * @apiSuccess {object}   palette                                  Palette configuration
   * @apiSuccess {object[]} leaflet                                  Leaflet layer configuration
   * @apiSuccess {string}   leaflet.name                             Name of the layer
   * @apiSuccess {string}   leaflet.urlTemplate                      Tile-URL template for this layer
   * @apiSuccess {string}   leaflet.attribution                      Copyright attribution text for this layer
   * @apiSuccess {number}   leaflet.minZoom                          Minimum valid zoom of the layer
   * @apiSuccess {number}   leaflet.maxZoom                          Maximum valid zoom of the layer
   * @apiSuccess {string}   leaflet.thumbnail                        Path of this layer's thumbnail, relative to client root
   * @apiSuccess {string}   leaflet.subdomains                       Subdomain letters to use in tile-URL template
   * @apiSuccess {string}   leaflet.id                               Layer ID (needed for MapBox layers)
   * @apiSuccess {string}   leaflet.accessToken                      Layer access token (user for MapBox layers)
   * @apiSuccess {string}   leaflet.overlay
   * @apiSuccess {object}   db                                       DB configuration (if admin)
   * @apiSuccess {object}   server                                   Server configuration (if admin)
   * @apiSuccess {object}   alerts                                   Alerts configuration (if admin)
   * @apiSuccess {number}   alerts.maxMatchTTL                       The maximum and default number of days after which the matches of this alert are going to be deleted
   * @apiSuccess {number}   alerts.maxMatchesLimit                   The maximum and default number of matches stored for an alert
   * @apiSuccess {number}   alerts.maxRuntimeLimit                   The maximum and default runtime limit for an alert update (in milliseconds)
   * @apiSuccess {number}   alerts.maxConcurrency                    The maximum number of alerts updated at the same time
   * @apiSuccess {object}   auditTrail                               AuditTrail configuration (if admin)
   * @apiSuccess {object}   defaultPreferences                       Default preferences of a newly created user (if admin)
   * @apiSuccess {object}   guestPreferences                         Preferences of the guest user (if admin)
   * @apiSuccess {object}   dataSource                               Data-source configuration (if admin)
   * @apiSuccess {string}   dataSource.name                          Name of the current data-source
   * @apiSuccess {boolean}  dataSource.readOnly                      Whether the current data-source is read-only
   * @apiSuccess {object}   dataSource.graphdb                       Graph configuration of the current data-source
   * @apiSuccess {object}   dataSource.index                         Index configuration of the current data-source
   * @apiSuccess {boolean}  needRestart                              Whether the Linkurious Server needs to be restarted
   */
  app.get('/api/config', api.respond(req => {
    return Promise.props({
      isAuthenticated: Access.isAuthenticated(req, false),
      canAdminConfig: Access.hasAction(req, 'admin.config', undefined, false)
    }).then(status => {

      // extract the names of enabled authentication strategies
      // (other than the default "local" strategy)
      let ssoProvider = null;
      _.forOwn(Config.get('access'), (value, key) => {
        if (key === 'oauth2' && value.enabled) {
          ssoProvider = value.provider;
        } else if (key === 'saml2' && value.enabled) {
          ssoProvider = 'saml2';
        }
      });

      // fields readable by everyone even not authenticated
      let config = {
        access: _.pick(Config.get('access'), [
          'authRequired',
          'guestMode',
          'loginTimeout',
          'defaultPage',
          'defaultPageParams',
          'dataEdition',
          'widget'
        ]),
        ogma: Config.get('ogma'),

        // virtual fields
        enterprise: LKE.isEnterprise(),
        domain: Config.get('server.domain', '127.0.0.1'),
        //todo: baseUrl: LKE.getBaseURL(),
        ssoProvider: ssoProvider
      };

      if (!status.isAuthenticated) {
        return config;
      }

      // fields readable by everyone authenticated
      config = _.merge(config, {
        defaultStyles: Config.get('defaultStyles'),
        defaultCaptions: Config.get('defaultCaptions'),
        advanced: Config.get('advanced'),
        palette: Config.get('palette'),
        leaflet: Config.get('leaflet')
      });

      if (!status.canAdminConfig) {
        return config;
      }

      // index of current source
      const sourceIndex = Utils.tryParsePosInt(
        req.param('sourceIndex', req.param('source_index', 0)),
        'sourceIndex'
      );

      // fields readable only by users with the action admin.config
      config = _.merge(config, {
        // users with admin.config can read the whole access object
        access: Config.get('access', undefined, undefined, true),

        db: Config.get('db', undefined, undefined, true),
        server: Config.get('server'),
        alerts: Config.get('alerts'),
        auditTrail: Config.get('auditTrail'),
        defaultPreferences: Config.get('defaultPreferences'),
        guestPreferences: Config.get('guestPreferences'),

        // virtual field
        dataSource: Config.get('dataSources.' + sourceIndex, undefined, undefined, true),
        needRestart: Config.needRestart
      });

      return config;
    });
  }));

  /**
   * @api {post} /api/config Update the configuration
   * @apiName UpdateConfiguration
   * @apiGroup Linkurious
   * @apiPermission action:admin.config
   * @apiVersion 1.0.0
   *
   * @apiDescription Update Linkurious' configuration.
   *
   * @apiParam {string}  [path]          The configuration path to override (use `dataSource.*` to edit the current data-source configuration)
   * @apiParam {any}     [configuration] The configuration value to set for the given path
   * @apiParam {number}  [sourceIndex=0] Index of the data-source in the `dataSources` array in the configuration
   * @apiParam {boolean} [reset=false]   Whether to reset the configuration to default values
   *                                     (the `configuration` parameter will be ignored).
   *                                     If the `path` parameter is specified, only the configuration
   *                                     corresponding to the specified path will be reset
   * @apiParamExample {json} Request-Example:
   *   {
   *     "path": "dataSource.name",
   *     "configuration": "New data-source name",
   *     "sourceIndex": 2
   *   }
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP 1.1 201 Created
   */
  app.post('/api/config', api.respond(req => {
    return Access.hasAction(req, 'admin.config').then(() => {

      // read the data-source index
      const sourceIndex = Utils.tryParsePosInt(
        req.param('sourceIndex', req.param('source_index', 0)),
        'sourceIndex'
      );

      // dataSource is a read-write virtual field that can be used to set the data-source by index
      // we convert any path containing `dataSource` to the actual path used in the configuration
      const clientPath = req.param('path');
      let serverPath = undefined;
      if (Utils.hasValue(clientPath)) {
        Utils.check.nonEmpty('path', clientPath);
        if (clientPath.match(/^dataSource(\..+|$)/)) {
          serverPath = clientPath.replace(/^dataSource/, `dataSources.${sourceIndex}`);
        } else {
          serverPath = clientPath;
        }
      }

      if (Utils.parseBoolean(req.param('reset'))) {
        return Config.reset(serverPath);
      } else {
        Utils.check.nonEmpty('path', clientPath);
        const config = req.param('configuration');
        return Config.set(serverPath, config, true);
      }
    });
  }, 201));

  /**
   * @api {post} /api/analytics Save an event
   * @apiName SaveEvent
   * @apiGroup Linkurious
   * @apiVersion 1.0.0
   *
   * @apiDescription Save an event to the analytics' log file. All events follow the Segment Spec.
   *
   * @apiParam {string="identify","track","page"} type Type of message
   * @apiParam {number}  [userId]     ID of the user
   * @apiParam {string}  [event]      Name of the action that the user has performed
   * @apiParam {string}  [name]       Name of the page that the user has seen
   * @apiParam {object}  [properties] Free-form dictionary of properties of the event/page
   * @apiParam {object}  [traits]     Free-form dictionary of traits of the user
   * @apiParam {string}  [timestamp]  Timestamp when the message itself took place, defaulted to the current time, in ISO-8601 format
   * @apiParam {object}  [context]    Dictionary of extra information of the user
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 204 No Content
   */
  app.post('/api/analytics', api.respond(req => {
    return Analytics.postEvent(req.body, Access.getCurrentUser(req, false), true);
  }, 204));

  /**
   * @api {get} /api/users Get users
   * @apiName GetUsers
   * @apiGroup Users
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   *
   * @apiDescription Get all the users or filter them by username, e-mail or group id.
   *
   * @apiParam {string} [starts_with] Return only users which username or e-mail starts with this
   * @apiParam {string} [contains]    Return only users which username or e-mail contains this
   * @apiParam {number} [group_id]    Return only users belongings to this group
   * @apiParam {number} [offset]      Offset from the first result
   * @apiParam {number} [limit]       Page size (maximum number of returned users)
   * @apiParam {string="id","username","email"} [sort_by="id"]         Sort by id, username or e-mail
   * @apiParam {string="asc","desc"}            [sort_direction="asc"] Direction used to sort the users
   *
   * @apiSuccess {number}           found               Number of hits
   * @apiSuccess {object[]}         results             Users
   * @apiSuccess {number}           results.id          ID of the user
   * @apiSuccess {string}           results.username    Username of the user
   * @apiSuccess {string}           results.email       E-mail of the user
   * @apiSuccess {string}           results.source      Source of the user (`"local"`, `"ldap"`, `"oauth2"`, etc.)
   * @apiSuccess {type:group[]}     results.groups      Groups the user belongs to
   * @apiSuccess {type:preferences} results.preferences Preferences of the user
   * @apiSuccess {object}           results.actions     Arrays of authorized actions indexed by data-source key.
   *                                                    The special key `"*"` lists actions authorized on all the data-sources
   * @apiSuccess {number}           results.visCount    Number of visualization owned by the user
   * @apiSuccess {string}           results.createdAt   Creation date in ISO-8601 format
   * @apiSuccess {string}           results.updatedAt   Last update date in ISO-8601 format
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "found": 2,
   *     "results": [
   *       {
   *         "id": 1,
   *         "username": "Unique user",
   *         "email": "user@linkurio.us",
   *         "source": "local",
   *         "groups": [
   *           {
   *             "id": 1,
   *             "name": "admin",
   *             "builtin": true,
   *             "sourceKey": "*"
   *           }
   *         ],
   *         "preferences": {
   *           "pinOnDrag": false,
   *           "locale": "en-US"
   *         },
   *         "actions": {
   *           "*": [
   *             "admin.users",
   *             "admin.alerts",
   *             "admin.connect",
   *             "admin.index",
   *             "admin.app",
   *             "admin.report",
   *             "admin.users.delete",
   *             "admin.config",
   *             "rawReadQuery",
   *             "rawWriteQuery"
   *           ]
   *         },
   *         "accessRights": {
   *           "*": {
   *             "nodes": {
   *               "edit": [],
   *               "write": ["*"]
   *             },
   *             "edges": {
   *               "edit": [],
   *               "write": ["*"]
   *             },
   *             "alerts": {
   *               "read": ["*"]
   *             }
   *           }
   *         },
   *         "visCount": 2,
   *         "createdAt": "2016-05-16T08:23:35.730Z",
   *         "updatedAt": "2016-05-16T08:23:35.730Z"
   *       },
   *       {
   *         "id": 2,
   *         "username": "newUser",
   *         "email": "new@linkurio.us",
   *         "source": "local",
   *         "groups": [
   *           {
   *             "id": 2,
   *             "name": "source manager",
   *             "builtin": true,
   *             "sourceKey": "584f2569"
   *           }
   *         ],
   *         "preferences": {
   *           "pinOnDrag": false,
   *           "locale": "en-US"
   *         },
   *         "actions": {
   *           "*": [],
   *           "584f2569": [
   *             "admin.users",
   *             "admin.alerts",
   *             "admin.connect",
   *             "admin.index",
   *             "rawReadQuery",
   *             "rawWriteQuery"
   *           ]
   *         },
   *         "accessRights": {
   *           "*": {
   *             "nodes": {
   *               "edit": [],
   *               "write": []
   *             },
   *             "edges": {
   *               "edit": [],
   *               "write": []
   *             },
   *             "alerts": {
   *               "read": []
   *             }
   *           },
   *           "584f2569": {
   *             "nodes": {
   *               "edit": [],
   *               "write": ["*"]
   *             },
   *             "edges": {
   *               "edit": [],
   *               "write": ["*"]
   *             },
   *             "alerts": {
   *               "read": ["*"]
   *             }
   *           }
   *         },
   *         "visCount": 0,
   *         "createdAt": "2016-05-16T08:23:35.730Z",
   *         "updatedAt": "2016-05-16T08:23:35.730Z"
   *       }
   *     ]
   *   }
   */
  app.get('/api/users', api.respond(req => {
    // check we are not an application
    Access.getUserCheck(req);

    return Access.isAuthenticated(req).then(() => {
      return UserDAO.findUsers({
        startsWith: req.param('starts_with'),
        contains: req.param('contains'),
        groupId: Utils.tryParsePosInt(req.param('group_id'), 'group_id', true),
        offset: Utils.tryParsePosInt(req.param('offset'), 'offset', true),
        limit: Utils.tryParsePosInt(req.param('limit'), 'limit', true),
        sortBy: req.param('sort_by'),
        sortDirection: req.param('sort_direction')
      });
    });
  }));
};
