/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 * - Created on 2014-12-09.
 *
 * Wrapper for Access-Right checking in data service.
 *
 * It ensures that the user calling these methods has:
 * - the right to read what he is reading;
 * - the right to write what he is writing.
 *
 * When retuning LkNodes and LkEdges, it filters out
 * hidden properties for the current data-source.
 */
'use strict';

// ext libs
const Promise = require('bluebird');
const _ = require('lodash');

// services
const LKE = require('../index');
const Utils = LKE.getUtils();
const audit = LKE.getAuditTrail();

// locals
const Data = require('./index');

function DataProxy() {}
module.exports = DataProxy;

/**
 * Defines a function `funcName` in DataProxy, that just passes a call
 * to the Data service without alteration.
 *
 * @param {string} funcName the name of the function to call in the Data service
 */
function proxy(funcName) {
  DataProxy[funcName] = function() { return Data[funcName].apply(Data, arguments); };
}

/**
 * Defines a function `funcName` in DataProxy, that will call
 * `checkBefore(user, args...)` before invoking `Data.[funcName]`.
 * After the call, `checkAfter(user, result, args...)` is invoked.
 *
 * `checkBefore` and `checkAfter` must respectively, if defined,
 * return a promise when invoked. If one of the promises fails, the API call will fail.
 *
 * @param {string} funcName name of the function to call in the Data service
 * @param {function} [checkBefore] a function returning a promise, called with (user, args...)
 * @param {function} [checkAfter] a function returning a promise, called with (user, result, args...)
 */
function check(funcName, checkBefore, checkAfter) {
  DataProxy[funcName] = function() {
    // extract user (additional last argument)
    if (arguments.length === 0) {
      throw new Error('missing user argument in "' + funcName + '" call');
    }
    const user = arguments[arguments.length - 1];
    if (!user || user.id === undefined) {
      throw new Error('missing user argument in "' + funcName + '" call');
    }

    const newArgs = new Array(arguments.length - 1);
    for (let i = 0, l = arguments.length - 1; i < l; ++i) {
      newArgs[i] = arguments[i];
    }
    // 'before' check (user, args)
    const checkBeforeArgs = [user].concat(newArgs);
    const before = checkBefore ? checkBefore.apply(null, checkBeforeArgs) : Promise.resolve();
    if (!before || !before.then) {
      throw new Error('checkBefore or "' + funcName + '" failed to return a promise');
    }

    //var start = Date.now(), durationBefore, durationAfter;
    return before.then(() => {
      // run function
      //durationBefore = Date.now() - start;
      //start = Date.now();
      return Data[funcName].apply(Data, newArgs);
    }).then(result => {
      if (!checkAfter) { return result; }
      // 'after' check (user, result)
      const checkAfterArgs = [user, result].concat(newArgs);
      return checkAfter.apply(null, checkAfterArgs);
    })/*.then(function(r) {
      durationAfter = Date.now() - start;
      console.log('PROXY/' + funcName + ' before:' + durationBefore + ' after:' + durationAfter);
      return Promise.resolve(r);
    })*/;
  };
}

proxy('resolveSource');

check('getSourceStates', null, (user, result) => {
  return user.hasAction('admin.connect', undefined, false).then(canConnect => {
    return result.filter(source => {
      // visible: (not connected AND user can connect sources) OR (connected AND visible to current user)
      return (
        (!source.key && canConnect) ||
        (source.key && user.canSeeDataSource(source.key, false))
      );
    });
  });
});

proxy('getIndexedSource');

proxy('getSimpleSchema');

// Index Search API

proxy('indexSource');

proxy('asyncIndexSource');

check('searchIndex', (user, type, searchString, options, sourceKey) => {
  const getReadable = type === 'node'
    ? user.readableCategories(sourceKey)
    : user.readableTypes(sourceKey);
  return getReadable.then(readable => {
    // if all is readable, don't touch the filter in the options.
    if (readable[0] === '*') { return; }

    // since 'categoriesOrTypes' is not used by the API, we can simply overwrite the option here
    options.categoriesOrTypes = readable;
  });
}, (user, result, type, searchString, options, sourceKey) => {
  if (options.full) {
    result.results.forEach(group => {
      if (type === 'node') {
        group.children = user.filterNodeProperties(sourceKey, group.children);
      } else {
        group.children = user.filterEdgeProperties(sourceKey, group.children);
      }
    });
  }
  return result;
});

// Shortest Path API

check('getAllShortestPaths',
  (user, startNodeId, endNodeId, options, sourceKey) => {
    return _addReadableCategoriesOrTypes(user, sourceKey, options);
  },
  (user, paths, startNodeId, endNodeId, options, sourceKey) => {
    return user.canReadNode(sourceKey, startNodeId).then(() => {
      return user.canReadNode(sourceKey, endNodeId);
    }).then(() => {
      return Promise.reduce(paths, (filteredPaths, path) => {

      // Filter all paths. If a node is removed from a path, the path is removed from results
        return user.filterNodesContent(sourceKey, path, true, true).then(filteredPath => {
          if (filteredPath.length > 0) {
            filteredPaths.push(filteredPath);
          }
          return filteredPaths;
        });
      }, []);
    }).then(paths => {
      const pathNodes = _.union.apply(null, paths);
      return audit.read(
        user,
        sourceKey,
        'getAllShortestPaths',
        {startNodeId: startNodeId, endNodeId: endNodeId},
        {nodes: pathNodes}
      ).return(paths);
    });
  }
);

check('searchFull',
  (user, type, searchString, searchOptions, sourceKey, strictAdjacency, options) => {
    return _addReadableCategoriesOrTypes(user, sourceKey, options);
  },
  (user, nodes, type, searchString, searchOptions, sourceKey, _strictAdjacency, _options) => {
    // don't keep nodes with no edges if we are requesting edges
    const keepNodesWithNoEdges = type === 'node';
    return user.filterNodesContent(sourceKey, nodes, keepNodesWithNoEdges).then(filteredNodes => {
      return audit.read(
        user, sourceKey, 'searchFull', {searchString: searchString}, {nodes: filteredNodes}
      ).return(filteredNodes);
    });
  }
);

// Graph Node API

proxy('getNodeCount');

check(
  'getNode',
  // before
  (user, options) => {
    return _addReadableCategoriesOrTypes(user, options.sourceKey, options).then(() => {
      // check if the alternative ID is readable (if any)
      return user.canReadProperty('node', options.sourceKey, options.alternativeId);
    });
  },
  // after
  (user, node, options) => {
    return user.canReadNode(options.sourceKey, node).then(() => {
      return user.filterNodeContent(options.sourceKey, node);
    }).then(filteredNode => {
      return audit
        .read(user, options.sourceKey, 'getNode', {id: node.id}, {node: filteredNode})
        .return(filteredNode);
    });
  }
);

check('getNodesByEdgesID', null, (user, nodes, options) => {
  return user.filterNodesContent(options.sourceKey, nodes, false, false).then(filteredNodes => {
    return audit
      .read(user, options.sourceKey, 'getNodesByEdgesID', options, {nodes: filteredNodes})
      .return(filteredNodes);
  });
});

check('getNodesByID',
  (user, options) => {
    return _addReadableCategoriesOrTypes(user, options.sourceKey, options);
  },
  (user, nodes, options) => {
    return user.filterNodesContent(options.sourceKey, nodes, true, false);
  }
);

check('getEdgesByID', null, (user, edges, options) => {
  return user.filterEdgesContent(options.sourceKey, edges);
});

check('rawQuery', (user, options) => {
  Utils.check.exist('options', options);

  return _addReadableCategoriesOrTypes(user, options.sourceKey, options).then(() => {
    return user.hasAction('rawWriteQuery', options.sourceKey, false);
  }).then(canWrite => {
    options.canWrite = canWrite && options.canWrite;

    // if I can make raw queries in write mode, I can also make raw queries in read mode
    if (canWrite) { return; }

    return user.hasAction('rawReadQuery', options.sourceKey);
  });
}, (user, nodes, options) => {
  return user.filterNodesContent(options.sourceKey, nodes, true, false).then(filteredResult => {
    return audit.readWrite(
      user,
      options.sourceKey,
      'rawQuery',
      {query: options.query, dialect: options.dialect},
      {nodes: filteredResult}
    ).return(filteredResult);
  });
});

check('alertPreviewQuery', (user, options) => {
  Utils.check.exist('options', options);

  return _addReadableCategoriesOrTypes(user, options.sourceKey, options).then(() => {
    return user.hasAction('admin.alerts', options.sourceKey, false);
  });
}, (user, result, options) => {
  return Promise.resolve(result).map(match => {
    return user.filterNodesContent(options.sourceKey, match.nodes, true, false)
      .then(filteredNodes => { match.nodes = filteredNodes; });
  }).return(result);
});

check('getAdjacentNodes', (user, nodeIds, options, sourceKey) => {
  return _addReadableCategoriesOrTypes(user, sourceKey, options).then(() => {
    return user.canReadNodes(sourceKey, nodeIds);
  });
}, (user, nodes, nodeIds, filter, sourceKey) => {
  return user.filterNodesContent(sourceKey, nodes, false).then(filteredResult => {
    return audit.read(
      user, sourceKey, 'getAdjacentNodes', {nodeIds: nodeIds}, {nodes: filteredResult}
    ).return(filteredResult);
  });
});

check('getStatistics', (user, ids, sourceKey, options) => {
  Utils.check.array('ids', ids, 1);
  return _addReadableCategoriesOrTypes(user, sourceKey, options).then(() => {
    return Promise.each(ids, nodeId => user.canReadNode(sourceKey, nodeId));
  });
}, (user, statistics, itemIds, sourceKey) => {
  return Promise.props({
    supernode: statistics.supernode,
    supernodeDegree: statistics.supernodeDegree,
    supernodeDigest: statistics.supernodeDigest,
    degree: statistics.degree,
    digest: user.filterDigest(sourceKey, statistics.digest)
  });
});

check('createNode', (user, node, sourceKey) => {
  user.checkHiddenNodeProperties(sourceKey, node);
  return user.canEditCategories(sourceKey, node.categories || []);
}, (user, createdNode, node, sourceKey) => {
  const result = user.filterNodeProperties(sourceKey, createdNode);
  return audit.write(
    user, sourceKey, 'createNode', {createInfo: node}, {node: result}
  ).return(result);
});

check('updateNode', (user, nodeId, nodeUpdate, sourceKey) => {
  user.checkHiddenNodeProperties(sourceKey, nodeUpdate, nodeUpdate.deletedProperties);
  return user.canEditNode(sourceKey, nodeId).then(() => {
    return user.canEditCategories(
      sourceKey, [].concat(nodeUpdate.addedCategories).concat(nodeUpdate.deletedCategories)
    );
  });
}, (user, updatedNode, nodeId, node, sourceKey) => {
  const result = user.filterNodeProperties(sourceKey, updatedNode);
  return audit.write(
    user, sourceKey, 'updateNode', {updateInfo: node, nodeId: nodeId}, {node: result}
  ).return(result);
});

check('deleteNode', (user, nodeId, sourceKey) => {
  return user.canDeleteNode(sourceKey, nodeId);
}, (user, result, nodeId, sourceKey) => {
  return audit.write(user, sourceKey, 'deleteNode', {
    nodeId: nodeId
  })
    .return(result);
});

// Graph Edge API

proxy('getEdgeCount');

check('getAdjacentEdges', (user, options, sourceKey) => {
  let node = options.target;
  if (node === undefined) { node = options.source; }
  if (node === undefined) { node = options.adjacent; }

  const canReadNode = node === undefined
    ? Promise.resolve()
    : user.canReadNode(sourceKey, node);

  return canReadNode.then(() => {
    if (Utils.noValue(options.type)) {
      return Promise.resolve();
    } else {
      return user.canReadType(sourceKey, options.type);
    }
  });
}, (user, edges, options, sourceKey) => {
  return user.filterReadableEdges(sourceKey, edges)
    .then(edges => {
      return audit.read(
        user, sourceKey, 'getAdjacentEdges', {options: options}, {edges: edges}
      ).return(edges);
    });
});

check(
  'getEdge',
  // before
  (user, options) => {
    // check if the alternative ID is readable (if any)
    return user.canReadProperty('edge', options.sourceKey, options.alternativeId);
  },
  // after
  (user, edge, options) => {

    // check if the edge itself and its ends are readable
    return user.canReadEdge(options.sourceKey, edge).then(() => {

      // filter edge properties according to hidden properties
      edge = user.filterEdgeProperties(options.sourceKey, edge);

      // log in audit trail
      return audit
        .read(user, options.sourceKey, 'getEdge', {edgeId: edge.id}, {edge: edge})
        .return(edge);
    });
  }
);

check('createEdge', (user, edge, sourceKey) => {
  user.checkHiddenEdgeProperties(sourceKey, edge);
  return user.canEditType(sourceKey, edge.type);
}, (user, createdEdge, edge, sourceKey) => {
  const result = user.filterEdgeProperties(sourceKey, createdEdge);
  return audit.write(
    user, sourceKey, 'createEdge', {createInfo: edge}, {edge: result}
  ).return(result);
});

check('updateEdge', (user, edgeId, edgeUpdate, sourceKey) => {
  user.checkHiddenEdgeProperties(sourceKey, edgeUpdate, edgeUpdate.deletedProperties);
  return user.canEditEdge(sourceKey, edgeId);
}, (user, updatedEdge, edgeId, edge, sourceKey) => {
  const result = user.filterEdgeProperties(sourceKey, updatedEdge);

  return audit.write(
    user, sourceKey, 'updateEdge', {updateInfo: edge, edgeId: edgeId}, {edge: result}
  ).return(result);
});

check('deleteEdge', (user, edgeId, sourceKey) => {
  return user.canDeleteEdge(sourceKey, edgeId);
}, (user, result, edgeId, sourceKey) => {
  return audit.write(
    user, sourceKey, 'deleteEdge', {edgeId: edgeId}
  ).return(result);
});

//  schema

check('getSchemaNodeTypes', null, (user, nodeTypes, options) => {
  if (user.isAdmin()) { return Promise.resolve(nodeTypes); }

  const hidden = Data.resolveSource(options.sourceKey).getHiddenNodeProperties();
  return user.readableCategories(options.sourceKey).then(readable => {
    // can read all
    if (readable[0] === '*') { return nodeTypes; }

    // keep only readable subset
    const readableByName = Utils.arrayToMap(readable);
    return _.filter(nodeTypes, nodeType => {
      nodeType.properties = _filterProperties(nodeType.properties, hidden);
      // keep only nodeTypes of readable categories (inferred are readable by all)
      return nodeType.name.startsWith('inferred-') || readableByName[nodeType.name];
    });
  });
});

check('getSchemaEdgeTypes', null, (user, edgeTypes, options) => {
  if (user.isAdmin()) { return Promise.resolve(edgeTypes); }

  const hidden = Data.resolveSource(options.sourceKey).getHiddenEdgeProperties();
  return user.readableTypes(options.sourceKey).then(readable => {
    // can read all
    if (readable[0] === '*') { return edgeTypes; }

    // keep only readable subset
    const readableByName = Utils.arrayToMap(readable);
    return _.filter(edgeTypes, edgeType => {
      edgeType.properties = _filterProperties(edgeType.properties, hidden);
      // keep only readable edgeTypes of readable types
      return readableByName[edgeType.name];
    });
  });
});

check('getSchemaEdgeProperties', null, (user, edgeProperties, options) => {
  if (user.isAdmin() && !options.omitNoIndex) { return Promise.resolve(edgeProperties); }
  const hidden = options.omitNoIndex
    ? Data.resolveSource(options.sourceKey).getNoIndexEdgeProperties(true)
    : Data.resolveSource(options.sourceKey).getHiddenEdgeProperties();
  return Promise.resolve(_filterProperties(edgeProperties, hidden));
});

check('getSchemaNodeProperties', null, (user, nodeProperties, options) => {
  if (user.isAdmin() && !options.omitNoIndex) { return Promise.resolve(nodeProperties); }
  const hidden = options.omitNoIndex
    ? Data.resolveSource(options.sourceKey).getNoIndexNodeProperties(true)
    : Data.resolveSource(options.sourceKey).getHiddenNodeProperties();
  return Promise.resolve(_filterProperties(nodeProperties, hidden));
});

function _filterProperties(properties, hiddenProperties) {
  const hiddenByName = Utils.arrayToMap(hiddenProperties);
  return _.filter(properties, property => !hiddenByName[property.key]);
}

/**
 * Add to the object `options` the keys `readableCategories` and `readableTypes`.
 *
 * @param {WrappedUser} user
 * @param {string}      sourceKey
 * @param {any}         options
 * @private
 */
function _addReadableCategoriesOrTypes(user, sourceKey, options) {
  return Promise.join(user.readableCategories(sourceKey).then(categories => {
    if (categories[0] !== '*') {
      options.readableCategories = categories;
    } // else, if all is readable, the filter `readableCategories` is left undefined
  }), user.readableTypes(sourceKey).then(types => {
    if (types[0] !== '*') {
      options.readableTypes = types;
    }
  }));
}
