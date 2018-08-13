/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-12-05.
 */
'use strict';

// ext libs
const _ = require('lodash');
const Promise = require('bluebird');

// our libs
const EphemeralSoftLocks = require('../../../lib/EphemeralSoftLock');

// services
const LKE = require('../index');
const Db = LKE.getSqlDb();
const DataProxy = LKE.getData(true);
const Config = LKE.getConfig();
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();
const WidgetDAO = LKE.getWidgetDAO();
const Layout = LKE.getLayout();
const Log = LKE.getLogger(__filename);
/**@type {AlertService}*/
const AlertManager = LKE.getAlert();

// locals
const VisualizationChecker = require('./VisualizationChecker');

// consts
const PUBLIC_FOLDER_FIELDS = ['id', 'title', 'parent', 'sourceKey'];
const VIZ_PUBLIC_FIELDS = [
  'id',
  'title',
  'folder',
  'nodes',
  'edges',
  'nodeFields',
  'edgeFields',
  'design',
  'filters',
  'sourceKey',
  'user',
  'userId',
  'sandbox',
  'createdAt',
  'updatedAt',
  'alternativeIds',
  'mode',
  'layout',
  'geo'
];

const ADD_ALL_LIMIT = Config.get('advanced.searchAddAllThreshold');

const VisualizationDAO = module.exports = {};

const vizLocks = new EphemeralSoftLocks(60, lock => {
  return Errors.business(
    'visualization_locked',
    'This visualization is currently locked by ' +
    lock.owner.username + ' (' + lock.owner.email + '). ' +
    'Your changes will not be saved unless you take over. ' +
    'If you take over, ' + lock.owner.username + ' will be blocked from continuing to edit.' +
    'This lock will expire automatically in ' + Utils.humanDuration(lock.timeLeft) + '.',
    true
  );
}, ['email', 'username']);

/**
 * Create a new folder
 *
 * @param {String} title
 * @param {string|number} parent ID of the parent visualizationFolder
 * @param {string} sourceKey key of a data-source
 * @param {WrappedUser} currentUser the currently connected use (wrapped)
 * @returns {Promise.<visualizationFolder>}
 */
VisualizationDAO.createFolder = function(title, parent, sourceKey, currentUser) {
  if (Utils.noValue(parent)) { parent = -1; }
  Utils.check.nonEmpty('title', title);
  Utils.check.nonEmpty('sourceKey', sourceKey);
  Utils.check.exist('currentUser', currentUser);
  Utils.check.integer('parent', parent, -1);

  return _checkFolderCollision(parent, sourceKey, currentUser, title).then(() => {
    return Db.models.visualizationFolder.create({
      title: title,
      parent: parent === null || parent === undefined ? -1 : parent,
      sourceKey: sourceKey,
      userId: currentUser.id
    });
  }).then(_filterFolderFields);
};

function _filterFolderFields(folder) {
  return Promise.resolve(_.pick(folder, PUBLIC_FOLDER_FIELDS));
}

/**
 * Find a folder owned by `user`, with id `id` and sourceKey `sourceKey`.
 *
 * @param {number} folderId
 * @param {string} sourceKey
 * @param {WrappedUser} user
 * @returns {Promise.<visualizationFolder>} rejected if no folder is found
 * @private
 */
function _findFolder(folderId, sourceKey, user) {
  // root folder explicitly (id=-1) or implicitly (undefined ID)
  if (folderId === -1 || folderId === undefined) {
    // special case for "abstract" root folder
    return Promise.resolve({id: folderId, userId: user.id, sourceKey: sourceKey});
  }
  return Db.models.visualizationFolder.find({
    where: {id: folderId, sourceKey: sourceKey, userId: user.id}
  }).then(folder => {
    if (!folder) {
      return Errors.business(
        'not_found',
        `Folder #${folderId} was not found for user #${user.id} in data-source "${sourceKey}".`,
        true
      );
    }
    return folder;
  });
}

/**
 * Check for title collision for folders: checks is a folder with title=`title` exists in
 * folder where id=`parentFolderId`.
 *
 * @param {number} parentFolderId
 * @param {string} sourceKey
 * @param {WrappedUser} user
 * @param {string} title
 * @returns {Promise} rejected in case of collision
 * @private
 */
function _checkFolderCollision(parentFolderId, sourceKey, user, title) {
  return Db.models.visualizationFolder.find({
    where: {parent: parentFolderId, sourceKey: sourceKey, userId: user.id, title: title}
  }).then(folder => {
    if (folder) {
      return Errors.business('folder_collision', null, true);
    }
  });
}

/**
 * Update a folder property.
 * Checked in this code:
 * - must the the owner of the folder to edit it
 * - cannot edit properties (id, sourceKey, userId): will fail
 * - cannot move the folder to a folder
 *
 * @param {string|number} folderId ID of the visualizationFolder to update
 * @param {string} propertyKey the property key of the visualizationFolder to update
 * @param {*} propertyValue the new value to set for the given property key
 * @param {WrappedUser} currentUser the currently connected use (wrapped)
 * @returns {Promise.<visualizationFolder>}
 */
VisualizationDAO.updateFolder = function(folderId, propertyKey, propertyValue, currentUser) {
  if (!propertyKey || Utils.noValue(propertyValue)) {
    return Errors.business('missing_field', '"key" and "value" are required', true);
  }
  if (Utils.noValue(currentUser)) {
    return Errors.business('missing_field', '"currentUser" is required', true);
  }
  Utils.check.values('key', propertyKey, ['title', 'parent']);

  // find folder
  return Db.models.visualizationFolder.findById(folderId).then(folder => {
    if (!folder) {
      return Errors.business('not_found', 'Folder #' + folderId + ' was not found.', true);
    }
    currentUser.canWriteFolder(folder);

    if (propertyKey === 'parent') {
      const parentId = propertyValue;
      // 0) updating parent folder: check that the target folder ID is legal
      Utils.check.integer('parent', parentId, -1);

      // 1) check that the move is structurally correct
      return Promise.resolve().then(() => {

        // 1.a) moving to root: special case shortcut
        if (parentId === -1) {
          return {id: -1, title: 'root'};
        }

        // 1.b) load folder tree
        return Db.models.visualizationFolder.findAll({where: {
          sourceKey: folder.sourceKey,
          userId: currentUser.id
        }, attributes: ['id', 'parent', 'title']}).then(folders => {
          folders = folders.map(f => f.get());
          /** @type {Map<String, visualizationFolder>} */
          const foldersById = Utils.indexBy(folders, folder => folder.id + '');

          // 2) check if new parent exists
          const newParent = foldersById.get(parentId + '');
          if (!newParent) {
            return Errors.business('not_found', 'Folder #' + parentId + ' was not found.', true);
          }

          // 3) check if folder was moved into its own tree
          let newParentAncestor = newParent;
          while (newParentAncestor && newParentAncestor.id !== -1) {
            if (newParentAncestor.id === folder.id) {
              return Errors.business(
                'invalid_parameter', 'Cannot move a folder into its own subtree.', true
              );
            }
            newParentAncestor = foldersById.get(newParentAncestor.parent + '');
          }

          return newParent;
        });
      }).then(newParent => {

        // 4) check for title collisions in the target directory
        return _checkFolderCollision(
          newParent.id, folder.sourceKey, currentUser, folder.title
        ).return(newParent);
      }).then(newParent => {
        folder.parent = newParent.id;
        return folder;
      });
    }

    if (propertyKey === 'title') {
      const newTitle = propertyValue;
      // check if this folder name is not already taken in the target folder
      return _checkFolderCollision(
        folder.parent, folder.sourceKey, currentUser, newTitle
      ).then(() => {
        folder.title = newTitle;
        return folder;
      });
    }

  }).then(updatedFolder => {
    // save and return saved folder
    return updatedFolder.save([propertyKey]).then(_filterFolderFields);
  });
};

/**
 * @param {string|number} folderId ID of a visualizationFolder
 * @param {WrappedUser} currentUser the currently connected use (wrapped)
 * @returns {Promise}
 */
VisualizationDAO.removeFolder = function(folderId, currentUser) {

  return Db.models.visualizationFolder.findById(folderId).then(folder => {
    if (folder === null) {
      throw Errors.business('not_found', 'Folder #' + folderId + ' was not found.');
    }
    currentUser.canWriteFolder(folder);

    // Folder has children if any visualisation or folder belongs to it
    return Promise.map([Db.models.visualizationFolder.findOne({where: {parent: folderId}}),
      Db.models.visualization.findOne({where: {folder: folderId}})], Utils.hasValue)
      .then(([containsFolders, containsVisualizations]) => {

        if (containsFolders || containsVisualizations) {
          return Errors.business('folder_deletion_failed', 'Cannot delete ' +
            'a folder that is not empty, move or delete the content ' +
            'before deleting the folder.', true);

        } else {
          return folder.destroy();
        }
      });
  });

};

/**
 * @param {string} sourceKey Key of a data-source
 * @param {WrappedUser} currentUser the currently connected use (wrapped)
 * @returns {Promise.<visualization[]>}
 * @private
 */
VisualizationDAO._getAll = function(sourceKey, currentUser) {
  // we load the shares just to add the count to the visualization object
  // if guest mode is not allowed, we don't count the shares towards the guest user
  const guestModeAllowed = Config.get('access.guestMode');
  let guestUserIdFilter;
  if (!guestModeAllowed) {
    guestUserIdFilter = {
      userId: {$ne: Db.models.user.GUEST_USER_ID}
    };
  }

  return Promise.resolve(Db.models.visualization.findAll({
    where: {sourceKey: sourceKey, userId: currentUser.id, sandbox: false},
    include: [{
      model: Db.models.visualizationShare,
      required: false,
      where: guestUserIdFilter
    }]
  })).map(visualization => {
    // remove the shares before returning
    visualization = visualization.get();
    visualization.shareCount = visualization.visualizationShares.length;
    delete visualization.visualizationShares;
    return visualization;
  });
};

/**
 *
 * @param {string|number|null} parentId
 * @param {visualizationFolder[]} folders
 * @param {visualization[]} visualizations
 * @param {object} widgetsByViz widgets by visualization ID
 * @returns {visualizationFolder[]}
 */
function buildTree(parentId, folders, visualizations, widgetsByViz) {
  const subTree = [];

  // folders
  folders.forEach(folder => {
    if (folder.parent === parentId) {
      const children = buildTree(folder.id, folders, visualizations, widgetsByViz);
      const newFolder = {
        id: folder.id,
        type: 'folder',
        title: folder.title
      };

      if (children) {
        newFolder.children = children;
      }
      subTree.push(newFolder);
    }
  });

  // files
  let widget;
  visualizations.forEach(visu => {
    if (visu.folder === parentId) {
      widget = widgetsByViz[visu.id];
      subTree.push({
        id: visu.id,
        type: 'visu',
        title: visu.title,
        shareCount: visu.shareCount,
        updatedAt: visu.updatedAt,
        createdAt: visu.createdAt,
        widgetKey: widget ? widget.key : widget
      });
    }
  });

  return subTree;
}

/**
 * Each returned folder has a `children` property containing Visualization and
 * VisualizationFolder objects.
 *
 * @param {string} sourceKey key of a data-source
 * @param {WrappedUser} currentUser the currently connected use (wrapped)
 * @returns {Promise.<Array<visualization|visualizationFolder>>}
 */
VisualizationDAO.getTree = function(sourceKey, currentUser) {
  const userId = currentUser.id;
  return Promise.join(
    this._getAll(sourceKey, currentUser),
    Db.models.visualizationFolder.findAll({where: {sourceKey: sourceKey, userId: userId}}),
    Db.models.widget.findAll({where: {userId: userId}, attributes: ['visualizationId', 'key']}),
    (visualizations, folders, widgets) => {
      const widgetsByViz = _.keyBy(widgets, 'visualizationId');
      return Promise.resolve(buildTree(-1, folders, visualizations, widgetsByViz));
    }
  );
};

/**
 * Migrate nodeFields and edgeFields
 *
 * @param {visualization} viz visualization
 */
VisualizationDAO.migrateFields = function(viz) {
  // #293 migrate nodeFields and edgeFields
  _.forEach(['nodeFields', 'edgeFields'], key => {
    let orgValue = viz[key];
    if (!orgValue) { orgValue = []; }
    // already migrated
    if (!Array.isArray(orgValue)) { return; }
    // migrate
    viz[key] = {fields: orgValue, captions: {}};
  });
};

/**
 *
 * @param {string|Number} vizId
 * @param {boolean} populated whether to include resolved nodes and edges in the result
 *                  if false, 'right' and 'user' will not be included in the visualization.
 * @param {WrappedUser} user the currently connected user
 * @param {object} [options]
 * @param {boolean} [options.noVersion=false]
 * @param {boolean} [options.withDigest=false] Whether to include the digest in the returned nodes
 * @param {boolean} [options.withDegree=false] Whether to include the degree in the returned nodes
 * @returns {Promise.<visualization>}
 */
VisualizationDAO.getById = function(vizId, populated, user, options) {
  if (!options) { options = {}; }

  return _findViz(vizId, true).then(viz => {

    // throw an error if the required data-source is not available
    DataProxy.resolveSource(viz.sourceKey).assertReady();

    return user.getVisualizationRight(viz).then(right => {
      // unwrap sequelize object, add right (of current user) and user (owner information)
      viz = _filterVizFields(viz);
      viz.right = right;

      // #293 migrate nodeFields and edgeFields
      VisualizationDAO.migrateFields(viz);

      if (!populated) {
        return viz;
      }

      // list of errors for nodes and edges that existed when the
      // visualization was created, but are missing now.
      const edgeErrors = [], nodeErrors = [];

      // in case alternative IDs are used, store the path of effective IDs
      const nodeIdPath = viz.alternativeIds.node === undefined
        ? 'id' : ['data', viz.alternativeIds.node];
      const edgeIdPath = viz.alternativeIds.edge === undefined
        ? 'id' : ['data', viz.alternativeIds.edge];

      // fetch nodes
      return DataProxy.getNodesByID({
        ids: _.map(viz.nodes, 'id'),
        sourceKey: viz.sourceKey,
        alternativeId: viz.alternativeIds.node,
        edges: 'none',
        ignoreMissing: true,
        withVersion: options.noVersion !== false,
        withDigest: options.withDigest,
        withDegree: options.withDegree
      }, user).then(nodes => {
        const vizNodesByID = _.keyBy(viz.nodes, 'id');
        viz.nodes = _.map(nodes, dbN => _node2VizNode(dbN, vizNodesByID[_.get(dbN, nodeIdPath)]));

        // needed in edge-filter step, in case some vizNodes are not readable by current user or
        // if the viz is using alternative IDs (edge.source and edge.target are native node DB IDs).
        const nodesByDbID = _.keyBy(viz.nodes, 'id');

        // fetch edges
        return DataProxy.getEdgesByID({
          ids: _.map(viz.edges, 'id'),
          sourceKey: viz.sourceKey,
          alternativeId: viz.alternativeIds.edge,
          ignoreMissing: true,
          withVersion: options.noVersion !== false
        }, user).then(edges => {

          // remove invalid edges (with node source/target in this visualization)
          return _.filter(
            edges,
            // edge must be defined AND have source and target in the nodes
            edge => !!edge &&
            nodesByDbID[edge.source] !== undefined &&
            nodesByDbID[edge.target] !== undefined
          );
        });
      }).then(edges => {
        const vizEdgesByID = _.keyBy(viz.edges, 'id');
        viz.edges = _.map(edges, dbE => _edge2VizEdge(dbE, vizEdgesByID[_.get(dbE, edgeIdPath)]));

        if (nodeErrors.length > 0) { viz.nodeErrors = nodeErrors; }
        if (edgeErrors.length > 0) { viz.edgeErrors = edgeErrors; }

        return viz;
      });
    });
  }).then(viz => {
    // in Starter Edition: Widget DAO is null
    if (!LKE.isEnterprise()) { return viz; }

    // set the widget key
    return WidgetDAO.getByVisualizationId(viz.id).then(widget => {
      viz.widgetKey = widget ? widget.key : null;
      return viz;
    });
  });
};

/**
 * Get the sandbox for a (data-source, user). Optionally return populated with a node/edge
 *
 * @param {object} options
 * @param {string} options.sourceKey key of a data-source
 * @param {string} [options.populate] Describes how the sandbox should be populated (must be one of `["visualizationId","expandNodeId","nodeId","edgeId","searchNodes","searchEdges","pattern","matchId"]`).
 * @param {number|string} [options.itemId] ID of the node, or edge to load (when `options.populate` is one of  `["visualizationId", "nodeId", "edgeId", "expandNodeId"]`).
 * @param {number} [options.matchId] ID of the alert match load (when `options.populate` is `"matchId"`).
 * @param {string} [options.searchQuery] Search query to search for nodes or edges (when `options.populate` is one of  `["searchNodes", "searchEdges"]`).
 * @param {number} [options.searchFuzziness] Search query fuzziness (when `options.populate` is one of  `["searchNodes", "searchEdges"]`).
 * @param {string} [options.patternQuery] Pattern query to match nodes and/or edges (when `populate` is `"pattern"`).
 * @param {string} [options.patternDialect] Pattern dialect (when `populate` is `"pattern"`).
 * @param {boolean} [options.doLayout] Whether to apply a server-side layout.
 * @param {boolean} [options.withDigest] Whether to include an adjacency digest in the result
 * @param {boolean} [options.withDegree] Whether to include the degree in the result
 * @param {WrappedUser} user the user currently logged in
 * @returns {Promise.<visualization>} the sandbox visualization
 */
VisualizationDAO.getSandBox = function(options, user) {
  return Promise.resolve().then(() => {
    Utils.check.values(
      'populate',
      options.populate,
      [
        undefined,
        'visualizationId',
        'expandNodeId', 'nodeId', 'edgeId',
        'searchNodes', 'searchEdges',
        'pattern',
        'matchId'
      ]
    );
    switch (options.populate) {
      case 'visualizationId':
      case 'expandNodeId':
      case 'nodeId':
      case 'edgeId':
        Utils.check.exist('itemId', options.itemId);
        break;

      case 'matchId':
        Utils.check.posInt('matchId', options.matchId);
        break;

      case 'searchNode':
      case 'searchEdge':
        Utils.check.string('searchQuery', options.searchQuery, true);
        if (options.searchFuzziness !== undefined) {
          Utils.check.number('searchFuzziness', options.searchFuzziness, 0, 1);
        }
        break;

      case 'pattern':
        Utils.check.string('patternQuery', options.patternQuery, true);
        Utils.check.string('patternDialect', options.patternDialect, true);
        break;
    }
    return _findSandBox(options.sourceKey, user);
  }).then(sandbox => {
    sandbox = _filterVizFields(sandbox);
    if (!options.populate) { return sandbox; }
    sandbox.nodes = [];
    sandbox.edges = [];

    // populate the sandbox ...

    if (options.populate === 'visualizationId') {
      // ... with a visualization
      return this.getById(options.itemId, true, user, {
        withDigest: options.withDigest, withDegree: options.withDegree, withVersion: true
      }).then(visualization => {
        sandbox.nodes = visualization.nodes;
        sandbox.edges = visualization.edges;
        sandbox.design = visualization.design;
        sandbox.title = visualization.title;

        return sandbox;
      });
    } else if (options.populate === 'nodeId') {
      // ... with a node
      return DataProxy.getNode({
        id: options.itemId, withDigest: options.withDigest, withDegree: options.withDegree,
        withVersion: true, sourceKey: options.sourceKey
      }, user).then(node => {
        sandbox.nodes = [_node2VizNode(node, {x: 0, y: 0})];
        return sandbox;
      });

    } else if (options.populate === 'edgeId') {
      // ... with edge
      const o = {edgeIds: [options.itemId], sourceKey: options.sourceKey, withVersion: true,
        withDigest: options.withDigest, withDegree: options.withDegree};
      return DataProxy.getNodesByEdgesID(o, user).then(nodes => {
        sandbox.edges = _nodesEdges(nodes);
        sandbox.nodes = [
          _node2VizNode(nodes[0], {x: 0, y: 0}),
          _node2VizNode(nodes[1], {x: 30, y: -1})
        ];
        return sandbox;
      });

    } else if (options.populate === 'expandNodeId') {
      // ... with node and its neighbors
      return DataProxy.getAdjacentNodes(
        [options.itemId], {
          limit: ADD_ALL_LIMIT, withDigest: options.withDigest, withDegree: options.withDegree,
          withVersion: true
        },
        options.sourceKey,
        user
      ).then(nodes => {
        sandbox.edges = _nodesEdges(nodes);
        sandbox.nodes = _.map(nodes, node => _node2VizNode(node));
        return sandbox;
      });

    } else if (options.populate === 'searchNodes' || options.populate === 'searchEdges') {
      // ... with a search query
      const searchFullOptions = {
        fuzziness: options.searchFuzziness,
        size: ADD_ALL_LIMIT
      };

      // searchFull always includes versions
      return DataProxy.searchFull(
        options.populate === 'searchNodes' ? 'node' : 'edge',
        options.searchQuery,
        searchFullOptions,
        options.sourceKey,
        true,
        {withDigest: options.withDigest, withDegree: options.withDegree},
        user
      ).then(nodes => {
        sandbox.edges = _nodesEdges(nodes);
        sandbox.nodes = _.map(nodes, node => _node2VizNode(node));
        return sandbox;
      });

    } else if (options.populate === 'pattern') {
      // ... with a pattern matching query (cypher, gremlin, ...)
      return DataProxy.rawQuery({
        sourceKey: options.sourceKey,
        dialect: options.patternDialect,
        query: options.patternQuery,
        withVersion: true,
        withDigest: options.withDigest, withDegree: options.withDegree
      }, user).then(nodes => {
        sandbox.edges = _nodesEdges(nodes);
        sandbox.nodes = _.map(nodes, node => _node2VizNode(node));
        return sandbox;
      });
    } else if (options.populate === 'matchId') {
      return AlertManager.getMatch(options.matchId, user).then(match => {
        const nodeOptions = {ids: match.nodes, sourceKey: options.sourceKey, withVersion: true,
          withDigest: options.withDigest, withDegree: options.withDegree};
        const edgeOptions = {ids: match.edges, sourceKey: options.sourceKey, withVersion: true};

        return DataProxy.getNodesByID(nodeOptions, user).then(nodes => {
          sandbox.nodes = _.map(nodes, node => _node2VizNode(node));
          return DataProxy.getEdgesByID(edgeOptions, user);
        }).then(edges => {
          sandbox.edges = edges.map(edge => _edge2VizEdge(edge));
          return sandbox;
        });
      });
    }
  }).then(sandbox => {
    // note: layout.incremental is persisted and restored, but not layout.algorithm or layout.mode

    if (options.doLayout && sandbox.nodes.length >= 1) {
      return _doLayout(sandbox);
    } else {
      // layout not requested or not needed
      sandbox.layout = {incremental: sandbox.layout.incremental};
      return sandbox;
    }
  });
};

/**
 * @param {visualization} visualization
 * @returns {Promise.<visualization>}
 * @private
 */
function _doLayout(visualization) {
  // server-side layout requested and needed
  visualization.layout = {
    algorithm: 'force',
    incremental: visualization.layout ? visualization.layout.incremental : false
  };
  return Layout.layout(visualization);
}

/**
 *
 * @param {object} viz
 * @param {string} viz.sourceKey key of a data-source
 * @param {string} viz.title
 * @param {string|number} [viz.folder] ID of visualizationFolder (or null for root)
 *
 * @param {object} viz.nodeFields
 * @param {object[]} viz.nodeFields.fields Array of {name:string, active:boolean}
 * @param {object} viz.nodeFields.captions Key: nodeCategory:string. Value: {active:boolean, displayName:boolean, properties:string[]}
 *
 * @param {object} viz.edgeFields
 * @param {object[]} viz.edgeFields.fields Array of {name:string, active:boolean}
 * @param {object} viz.edgeFields.captions Key: edgeType:string. Value: {active:boolean, displayName:boolean, properties:string[]}
 *
 * @param {object[]} viz.nodes
 * @param {string|number} viz.nodes.id Node ID (seen `alternativeIds` to use non-native IDs).
 * @param {boolean} [viz.nodes.selected=false]
 * @param {object} viz.nodes.nodelink
 * @param {number} viz.nodes.nodelink.x
 * @param {number} viz.nodes.nodelink.y
 * @param {boolean} [viz.nodes.nodelink.fixed=false]
 * @param {object} [viz.nodes.geo]
 * @param {number} [viz.nodes.latitude]
 * @param {number} [viz.nodes.latitudeDiff]
 * @param {number} [viz.nodes.longitude]
 * @param {number} [viz.nodes.longitudeDiff]
 *
 * @param {object[]} viz.edges
 * @param {string|number} viz.edges.id Edge IDs (seen `alternativeIds` to use non-native IDs).
 * @param {boolean} [viz.edges.selected=false]
 *
 * @param {Object} [viz.design]
 * @param {Object} [viz.design.styles]
 * @param {Object} [viz.design.palette]
 *
 * @param {object[]} viz.filters
 *
 * @param {object} [viz.alternativeIds]
 * @param {string} [viz.alternativeIds.node] alternative (non-native) node ID
 * @param {string} [viz.alternativeIds.edge] alternative (non-native) edge ID
 *
 * @param {string} viz.mode Current mode ("nodelink" or "geo").
 *
 * @param {object} viz.layout Last used Layout.
 * @param {string} viz.layout.algorithm Layout algorithm ("force" or "hierarchical")
 *
 * @param {string} [viz.layout.mode] Layout mode (depends on algorithm)
 * @param {object} [viz.geo]
 * @param {string} [viz.geo.latitudeProperty]
 * @param {string} [viz.geo.longitudeProperty]
 * @param {string[]} [viz.geo.layers] Enabled tiles layers
 *
 * @param {WrappedUser} currentUser the currently connected use (wrapped)
 * @returns {Promise.<visualization>}
 */
VisualizationDAO.createVisualization = function(viz, currentUser) {
  if (!currentUser) {
    return Errors.business('missing_field', '"currentUser" is required', true);
  }

  Utils.check.object('visualization', viz);

  // default values
  if (Utils.noValue(viz.folder)) { viz.folder = -1; }
  if (!viz.filters) { viz.filters = []; }
  if (!viz.mode) { viz.mode = 'nodelink'; }
  if (Utils.noValue(viz.alternativeIds)) { viz.alternativeIds = {}; }
  if (Utils.noValue(viz.layout)) { viz.layout = {}; }
  if (Utils.noValue(viz.geo)) { viz.geo = {}; }
  if (Utils.noValue(viz.geo.layers)) { viz.geo.layers = []; }
  if (Utils.noValue(viz.nodeFields)) {
    viz.nodeFields = {fields: [], captions: Config.get('defaultCaptions.nodes', {})};
  }
  if (Utils.noValue(viz.edgeFields)) {
    viz.edgeFields = {fields: [], captions: Config.get('defaultCaptions.edges', {})};
  }

  // validate visualization object
  VisualizationChecker.checkCreation('visualization', viz);

  DataProxy
    .resolveSource(viz.sourceKey)
    .checkAlternativeIdKeys(viz.alternativeIds);

  const getDesign = viz.design
    ? Promise.resolve(viz.design)
    : VisualizationDAO.getSandBox({sourceKey: viz.sourceKey}, currentUser).get('design');

  return getDesign.then(design => {
    return Db.models.visualization.create({
      title: Utils.noValue(viz.title) ? 'Untitled Visualization' : viz.title,
      sandbox: false,
      folder: viz.folder,
      nodes: viz.nodes,
      edges: viz.edges,
      nodeFields: viz.nodeFields,
      edgeFields: viz.edgeFields,
      alternativeIds: viz.alternativeIds,
      design: design,
      filters: viz.filters,
      sourceKey: viz.sourceKey,
      userId: currentUser.id,
      mode: viz.mode,
      layout: viz.layout,
      geo: viz.geo,
      version: 2
    });
  }).then(_filterVizFields);
};

/**
 * @param {visualization} _viz
 * @returns {visualization}
 * @private
 */
function _filterVizFields(_viz) {
  const viz = _.pick(_viz.get(), VIZ_PUBLIC_FIELDS);

  // default alternative IDs
  if (!viz.alternativeIds) {
    viz.alternativeIds = {};
  }

  // default interaction mode
  if (!viz.mode) {
    viz.mode = 'nodelink';
  }

  // default layout
  if (!viz.layout) {
    viz.layout = {algorithm: 'force', mode: 'fast', incremental: false};
  }

  // fix (existing) sandboxes with missing design data
  if (!viz.design) { viz.design = {}; }
  if (!viz.design.palette) { viz.design.palette = Config.get('palette'); }
  if (!viz.design.styles) { viz.design.styles = Config.get('defaultStyles'); }

  if (!viz.nodeFields.captions) {
    viz.nodeFields.captions = Config.get('defaultCaptions.nodes', {});
  }
  if (!viz.edgeFields.captions) {
    viz.edgeFields.captions = Config.get('defaultCaptions.edges', {});
  }

  // default geo data (read from source config), reset for sandbox
  if (!viz.geo || viz.sandbox) {
    const source = DataProxy.resolveSource(viz.sourceKey);
    viz.geo = {
      latitudeProperty: source.config.graphdb.latitudeProperty,
      longitudeProperty: source.config.graphdb.longitudeProperty,
      // for a sandbox, the layers might be set, don't reset them in that case
      layers: viz.geo ? viz.geo.layers : []
    };
  }

  // filter the owner user (if set)
  if (viz.user) {
    viz.user = _.pick(viz.user, ['id', 'username', 'email']);
  }

  return viz;
}

/**
 * Count visualizations for a user
 *
 * @param {string} sourceKey Key of a data-source.
 * @param {boolean} [skipSourceKeyValidation=false] Whether to skip the validation of the sourceKey
 * @returns {Promise.<number>} the number of visualizations
 */
VisualizationDAO.getVisualizationCount = function(sourceKey, skipSourceKeyValidation) {
  if (!skipSourceKeyValidation) {
    Utils.checkSourceKey(sourceKey);
  }
  return Promise.resolve(Db.models.visualization.count({where: {
    sourceKey: sourceKey,
    sandbox: false
  }}));
};

/**
 * Duplicates a visualization and saves it in the same folder as the targeted visualization
 *
 * @param {object} options
 * @param {number} options.id ID of the visualization to duplicate.
 * @param {number} [options.folderId] ID of the target folder (defaults to same folder if user is not changing, or root folder is user is changing).
 * @param {string} [options.title] title of the target (defaults to `"Copy of [source title]"`).
 * @param {WrappedUser} wUser the currently connected user
 * @returns {Promise.<visualization>}
 */
VisualizationDAO.duplicateVisualization = function(options, wUser) {
  Utils.check.properties('options', options, {
    id: {required: true, check: 'posInt'},
    folderId: {check: ['number', -1]},
    title: {check: 'nonEmpty'}
  });

  let vizCopy;
  return _findViz(options.id).then(_visualization => {
    vizCopy = _visualization.get();

    // this will reject if currentUser has not at least read access to the visualization
    return wUser.getVisualizationRight(_visualization);
  }).then(() => {
    // remove instance-specific info
    delete vizCopy.id;
    delete vizCopy.createdAt;
    delete vizCopy.updatedAt;

    // set default folder
    if (Utils.noValue(options.folderId)) {
      if (vizCopy.userId === wUser.id) {
        // the source and target users are the same, keep the viz in the same folder
        options.folderId = vizCopy.folder;
      } else {
        // the source and target users are different, set viz at root folder or target user
        options.folderId = -1;
      }
    }

    // set the owner of the viz to the current user
    vizCopy.userId = wUser.id;

    // set the title
    if (Utils.hasValue(options.title)) {
      vizCopy.title = options.title;
    } else {
      vizCopy.title = 'Copy of ' + vizCopy.title;
    }

    // set the folder (checks that the folder is owned by the current user in current data-source)
    return _findFolder(options.folderId, vizCopy.sourceKey, wUser);
  }).then(folder => {
    vizCopy.folder = folder.id;

    // save the copy
    return Db.models.visualization.create(vizCopy);
  }).then(_filterVizFields);
};

/**
 * Update a visualization.
 * Checked in this code:
 * - to update the folder, `currentUser` must be the owner
 * - to update any other field, `currentUser` must has write access
 * - field (id, sourceKey, userId, sandbox) cannot be updated and will be silently ignored
 * - updating other fields not included in VIZ_EDITABLE_FIELDS will cause an error
 *
 * @param {Number} vizId ID of the visualization to update
 * @param {Object} newProperties map of properties to update with new values
 * @param {Object} [newProperties.folder]
 * @param {Object} [newProperties.title]
 * @param {Object} [newProperties.nodes]
 * @param {Object} [newProperties.edges]
 * @param {Object} [newProperties.design]
 * @param {Object} [newProperties.filters]
 * @param {Object} [newProperties.nodeFields]
 * @param {Object} [newProperties.edgeFields]
 * @param {Object} [newProperties.alternativeIds]
 * @param {object} options
 * @param {boolean} [options.forceLock=false] Take the edit-lock by force (if `currentUser` doesn't own it)
 * @param {boolean} [options.doLayout=false] Perform a server-side layout of the visualization graph.
 * @param {WrappedUser} currentUser the currently connected use (wrapped)
 * @returns {Promise.<visualization>}
 */
VisualizationDAO.updateVisualization = function(vizId, newProperties, options, currentUser) {
  if (!newProperties && !options.doLayout) {
    throw Errors.business('missing_field');
  }

  newProperties = _.defaults(newProperties);

  if (!currentUser) {
    throw Errors.business('missing_field', '"currentUser" is required');
  }
  if (typeof newProperties !== 'object') {
    throw Errors.business('invalid_parameter', 'new visualization fields must be given as a map');
  }

  Utils.check.objectKeys('options', options, ['forceLock', 'doLayout']);

  // ignore these fields from newProperties (they cannot be changed)
  delete newProperties.id;
  delete newProperties.sourceKey;
  delete newProperties.userId;
  delete newProperties.sandbox;

  // check for unexpected keys
  VisualizationChecker.checkUpdate('visualization', newProperties);

  return vizLocks.take(vizId, currentUser, options.forceLock).then(() => {
    // find the visualization in DB
    return _findViz(vizId);
  }).then(viz => {
    DataProxy.resolveSource(viz.sourceKey).checkAlternativeIdKeys(newProperties.alternativeIds);

    // if the folder is provided but did not change, ignore the change
    if (newProperties.folder !== undefined && viz.folder === newProperties.folder) {
      delete newProperties.folder;
    }

    // if the user wants to change the folder, he needs to be the owner
    const neededRight = newProperties.folder !== undefined ? 'owner' : 'write';

    return currentUser.hasVisualizationRight(viz, neededRight).then(() => {
      let updatePromise = Promise.resolve();

      // update all fields given as parameters
      _.forEach(newProperties, (value, key) => {
        if (key === 'folder') {
          // check that the folder exists + belongs to user + is in the same sourceKey as the viz
          updatePromise = _findFolder(value, viz.sourceKey, currentUser).then(folder => {
            viz.folder = folder.id;
          });
        } else {
          viz[key] = value;
        }
      });

      return updatePromise;
    }).then(() => {
      // layout not requested/required
      if (!options.doLayout || viz.nodes.length === 0) {
        return;
      }

      // layout visualization
      // 1) load populated viz
      const getOptions = {noVersion: true};
      return VisualizationDAO.getById(viz.id, true, currentUser, getOptions).then(populatedViz => {
        // 2) layout populated viz
        return _doLayout(populatedViz);
      }).then(laidOutViz => {
        // 3) patch current nodes with new coordinates
        const newNodes = new Array(laidOutViz.nodes.length);
        laidOutViz.nodes.forEach((n, i) => {
          const un = viz.nodes[i];
          if (!un.nodelink) { un.nodelink = {}; }
          if (un.nodelink.fixed !== true) {
            un.nodelink.x = n.nodelink.x;
            un.nodelink.y = n.nodelink.y;
          }
          newNodes[i] = un;
        });
        // 4) update "nodes" in updated viz with patched nodes
        viz.nodes = newNodes;
      });
    }).then(() => {
      return viz.save();
    });
  }).then(_filterVizFields);
};

/**
 * Update the sandbox visualization.
 *
 * @param {string} sourceKey key of a data-source
 * @param {object} newProperties
 * @param {object} [newProperties.design]
 * @param {object} [newProperties.nodeFields]
 * @param {object} [newProperties.edgeFields]
 * @param {WrappedUser} currentUser
 * @returns {Promise}
 */
VisualizationDAO.updateSandBox = function(sourceKey, newProperties, currentUser) {
  Utils.check.object('visualization', newProperties);

  // ignore these fields from newProperties (they cannot be changed)
  delete newProperties.id;
  delete newProperties.sourceKey;
  delete newProperties.userId;
  delete newProperties.sandbox;

  return _findSandBox(sourceKey, currentUser).then(viz => {
    // sandboxes: only edit nodeFields, edgeFields, design
    // #956 Patch sandbox should validate captions
    VisualizationChecker.checkUpdateSandbox('visualisation', newProperties);

    _.forEach(newProperties, (value, key) => {
      viz[key] = value;
    });

    return viz.save();
  }).return(undefined);
};

/**
 * Remove a visualization
 *
 * @param {string|Number} visualizationId
 * @param {WrappedUser} currentUser the currently connected use (wrapped)
 * @returns {Promise}
 */
VisualizationDAO.removeById = function(visualizationId, currentUser) {
  return _findViz(visualizationId).then(visualization => {
    return currentUser.hasVisualizationRight(visualization, 'owner').then(() => {
      return Promise.resolve(visualization.destroy());
    });
  });
};

/**
 * If the visualization is not up to date, update it to the latest version and return it.
 *
 * @param {any} visualization
 * @returns {Bluebird<visualization>}
 * @private
 * @backward-compatibility
 */
function _updateViz(visualization) {
  return _updateVizToVersion2(visualization).then(v2Viz => {
    return _updateVizToVersion3(v2Viz);
  });
}

/**
 * If the visualization is version 1, update it to version 2 and return it.
 *
 * Filters are stored in a different format.
 *
 * @param {any} visualization
 * @returns {Bluebird<visualization>}
 * @private
 * @backward-compatibility
 */
function _updateVizToVersion2(visualization) {
  if (visualization.version > 1) {
    return Promise.resolve(visualization);
  } else {

    visualization.filters = visualization.filters.map(filter => {
      // there are 5 types of filters in in visualization v1
      // - filters with key "node.data.categories"
      // - filters with key "node.data.properties.<propertyName>"
      // - filters with key "edge.data.type"
      // - filters with key "edge.data.properties.<propertyName>"
      // - filters with key "geo-coordinates"

      if (filter.key === 'geo-coordinates') {
        // Valid geo filter
        return {
          key: 'geo-coordinates'
        };
      }

      if (Utils.noValue(filter.options) || Utils.noValue(filter.key)) {
        Log.warn('This v1 filter was invalid: ', global.JSON.stringify(filter));
        return; // the filter is invalid
      }

      const values = _.keys(_.pickBy(filter.options.values));

      if (values.length === 0) {
        Log.warn('This v1 filter was invalid: ', global.JSON.stringify(filter));
        return; // the filter is invalid
      }

      if (filter.key === 'node.data.categories' ||
        filter.key.startsWith('node.data.properties.') ||
        filter.key === 'edge.data.type' ||
        filter.key.startsWith('edge.data.properties.')) {
        return {
          key: filter.key,
          values
        };
      }
    });

    // remove null filters, filters that were invalid
    visualization.filters = visualization.filters.filter(Utils.hasValue);

    visualization.version = 2;

    return visualization.save();
  }
}

/**
 * If the visualization is version 2, update it to version 3 and return it.
 *
 * Since visualizations v3, node and edge ids are stored exclusively as strings.
 *
 * @param {any} visualization
 * @returns {Bluebird<visualization>}
 * @private
 * @backward-compatibility
 */
function _updateVizToVersion3(visualization) {
  if (visualization.version > 2) {
    return Promise.resolve(visualization);
  } else {
    // originally node and edge ids in Linkurious could have been both string and numbers
    // we force them to be string now
    visualization.nodes = _.map(visualization.nodes, node => {
      node.id = '' + node.id;
      return node;
    });
    visualization.edges = _.map(visualization.edges, edge => {
      edge.id = '' + edge.id;
      return edge;
    });

    visualization.version = 3;

    return visualization.save();
  }
}

/**
 * @param {number} visualizationId
 * @param {boolean} [includeUser=false] whether to fetch the owner of the viz
 * @returns {Promise.<visualization>}
 */
function _findViz(visualizationId, includeUser) {
  const options = {where: {id: visualizationId, sandbox: false}};
  if (includeUser) {
    options.include = [Db.models.user];
  }
  return Db.models.visualization.find(options).then(visualization => {
    if (visualization === null || visualization === undefined) {
      return Errors.business(
        'not_found', 'Visualization #' + visualizationId + ' was not found.', true
      );
    }

    if (!visualization.alternativeIds) {
      visualization.alternativeIds = {};
    }

    return visualization;
  }).then(_updateViz);
}

/**
 * @param {string} sourceKey
 * @param {WrappedUser} currentUser
 * @returns {Promise.<visualization>} sandbox
 * @private
 */
function _findSandBox(sourceKey, currentUser) {
  DataProxy.resolveSource(sourceKey).assertReady();

  const where = {
    sandbox: true,
    sourceKey: sourceKey,
    userId: currentUser.id
  };
  const values = {
    title: 'SandBox',
    nodes: [],
    edges: [],
    folder: -1,
    nodeFields: {fields: [], captions: Config.get('defaultCaptions.nodes', {})},
    edgeFields: {fields: [], captions: Config.get('defaultCaptions.edges', {})},
    design: {
      palette: Config.get('palette'),
      styles: Config.get('defaultStyles')
    },
    filters: [],
    version: 2
  };
  return Db.models.visualization.findOrCreate({
    where: where,
    defaults: values
  }).spread(sandbox => sandbox).then(_updateViz);
}

/**
 * Resets sandbox values to configuration-file values.
 *
 * @param {string} sourceKey Data-source for which sandbox will be reset.
 * @param {object} options
 * @param {boolean} [options.design] Reset sandbox design using `config.styles`, `config.palette`.
 * @param {boolean} [options.captions] Reset sandbox captions using `config.defaultCaptions`.
 * @returns {Promise}
 */
VisualizationDAO.resetSandboxes = function(sourceKey, options) {
  Utils.checkSourceKey(sourceKey);
  const updateOptions = {where: {sourceKey: sourceKey, sandbox: true}};

  return Promise.resolve().then(() => {

    // reset design?
    if (!options.design) { return; }
    return Db.models.visualization.update({
      design: {
        palette: Config.get('palette'),
        styles: Config.get('defaultStyles')
      }
    }, updateOptions).then(updateCount => {
      Log.info(`Design reset for ${updateCount} sandboxes (data-source: ${sourceKey}).`);
    });
  }).then(() => {

    // reset captions?
    if (!options.captions) { return; }
    return Db.models.visualization.update({
      nodeFields: {fields: [], captions: Config.get('defaultCaptions.nodes', {})},
      edgeFields: {fields: [], captions: Config.get('defaultCaptions.edges', {})}
    }, updateOptions).then(updateCount => {
      Log.info(`Captions reset for ${updateCount} sandboxes (data-source: ${sourceKey}).`);
    });
  });
};

/**
 * Merge node and vizNode content.
 *
 * @param {LkNode} node
 * @param {Object} [vizNode] visualization node
 * @param {number} [vizNode.nodelink.x]
 * @param {number} [vizNode.nodelink.y]
 * @param {boolean} [vizNode.nodelink.fixed]
 * @param {number} [vizNode.geo.latitude]
 * @param {number} [vizNode.geo.longitude]
 * @param {number} [vizNode.geo.latitudeDiff]
 * @param {number} [vizNode.geo.longitudeDiff]
 * @param {boolean} [vizNode.selected]
 * @returns {object}
 * @private
 */
function _node2VizNode(node, vizNode) {
  // generate random position
  if (vizNode === undefined) {
    vizNode = {nodelink: {x: 500 * Math.random(), y: 500 * Math.random()}};
  }

  // migrate old-format to new-format vizNode position info
  if (vizNode.x !== undefined && vizNode.y !== undefined) {
    vizNode = {nodelink: {x: vizNode.x, y: vizNode.y}};
  }

  return {
    id: node.id,
    nodelink: vizNode.nodelink ? vizNode.nodelink : {},
    geo: vizNode && vizNode.geo ? vizNode.geo : {},
    selected: vizNode.selected === true ? true : undefined,
    data: node.data,
    categories: node.categories,
    statistics: node.statistics,
    version: node.version
  };
}

/**
 * Merge edge and vizEdge content.
 *
 * @param {LkEdge} edge
 * @param {object} [vizEdge]
 * @param {object} vizEdge.selected
 * @returns {object} edge and vizEdge merged
 * @private
 */
function _edge2VizEdge(edge, vizEdge) {
  return {
    id: edge.id,
    type: edge.type,
    data: edge.data,
    source: edge.source,
    target: edge.target,
    selected: vizEdge && vizEdge.selected ? true : undefined,
    version: edge.version
  };
}

/**
 * @param {LkNode[]} nodes nodes with edges
 * @returns {LkEdge[]} unique edges
 * @private
 */
function _nodesEdges(nodes) {
  let edges = [];
  for (let i = 0, l = nodes.length; i < l; ++i) {
    edges = edges.concat(nodes[i].edges);
  }
  return _.values(_.keyBy(edges, 'id'));
}
