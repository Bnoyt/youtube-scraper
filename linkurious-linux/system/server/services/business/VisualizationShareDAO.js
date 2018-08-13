/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-02-23.
 */
'use strict';

// ext libs
const Promise = require('bluebird');
const _ = require('lodash');

// services
const LKE = require('../index');
const Db = LKE.getSqlDb();
const Errors = LKE.getErrors();
const UserDAO = LKE.getUserDAO();

const VisualizationShareDAO = module.exports = {};

/**
 * Get all visualization shared with current user
 *
 * @param {string} sourceKey key of a data-source
 * @param {WrappedUser} currentUser
 * @returns {Promise.<{
 *   visualizationId:string,
 *   title:string,
 *   sourceKey:string,
 *   ownerId:number,
 *   right:string,
 *   ownerUsername:string,
 *   updatedAt:string
 * }>}
 */
VisualizationShareDAO.getSharedWithMe = function(sourceKey, currentUser) {
  const query = {
    where: {userId: currentUser.id},
    include: [{
      model: Db.models.visualization,
      where: {sourceKey: sourceKey},
      include: [Db.models.user]
    }]
  };
  return Promise.resolve(Db.models.visualizationShare.findAll(query)).map(share => {
    return {
      right: share.right,
      visualizationId: share.visualization.id,
      ownerId: share.visualization.userId,
      ownerUsername: share.visualization.user.username,
      sourceKey: share.visualization.sourceKey,
      title: share.visualization.title,
      updatedAt: JSON.parse(JSON.stringify(new Date(share.visualization.updatedAt)))
    };
  });
};

/**
 * Get all shares for a visualization
 *
 * @param {string|number} visualizationId
 * @returns {Promise.<{
 *   owner: {id: number, username: string, email: string, source: string},
 *   shares:{userId:number, username:string, email:string, visualizationId:number, right:string}[]
 * }>}
 */
VisualizationShareDAO.getShares = function(visualizationId) {
  const query = {
    where: {visualizationId: visualizationId},
    include: [Db.models.user]
  };
  return resolveVisualization(visualizationId).then(viz => {
    return UserDAO.getUser(viz.userId);
  }).then(owner => {
    return Promise.resolve(Db.models.visualizationShare.findAll(query)).map(share => {
      return {
        userId: share.userId,
        username: share.user.username,
        email: share.user.email,
        right: share.right,
        visualizationId: share.visualizationId
      };
    }).then(shares => {
      return {
        owner: owner,
        shares: shares
      };
    });
  });
};

/**
 * Add or update a visualizationShare
 *
 * @param {string|number} visualizationId
 * @param {string|number} userId
 * @param {string} right 'read' or 'write'
 * @param {WrappedUser} currentUser
 * @returns {Promise.<{userId:number, visualizationId:number, right:string, createdAt:string, updatedAt:string}>}
 */
VisualizationShareDAO.shareWithUser = function(visualizationId, userId, right, currentUser) {
  if (!_.includes(Db.models.visualizationShare.RIGHTS, right)) {
    return Errors.business(
      'invalid_parameter',
      'Right (' + right + ') must be one of ' + Db.models.visualizationShare.RIGHTS,
      true
    );
  }
  return checkOwner(visualizationId, currentUser).then(() => {
    const whereAndDefaults = {
      where: {visualizationId: visualizationId, userId: userId},
      defaults: {right: right}
    };
    return Db.models.visualizationShare.findOrCreate(whereAndDefaults).spread(vizShare => {
      // update the vizShare if the "right" is different
      if (vizShare.right !== right) {
        vizShare.right = right;
        return vizShare.save();
      }
      return vizShare;
    }).then(vizShare => {
      // remove the sequelize wrapper
      vizShare = vizShare.get();
      vizShare.userId = +vizShare.userId;
      vizShare.visualizationId = +vizShare.visualizationId;
      delete vizShare.id;
      return vizShare;
    });
  });
};

/**
 * Get a user's right for a visualization
 *
 * @param {Object} visualization
 * @param {number} visualization.userId
 * @param {number} visualization.id
 * @param {number} userId
 * @returns {Promise<string>} resolves to 'owner', 'write' or 'read' (or reject if no right exists)
 */
VisualizationShareDAO.getRight = function(visualization, userId) {
  if (visualization.userId === userId) {
    return Promise.resolve('owner');
  }
  return getShare(visualization.id, userId).then(share => {
    if (!share) {
      return Errors.access('read_forbidden', 'You don\'t have access to this visualization', true);
    }
    return share.right;
  });
};

/**
 * Delete a visualizationShare
 *
 * @param {string|number} visualizationId
 * @param {string|number} userId
 * @param {WrappedUser} currentUser
 * @returns {Promise}
 */
VisualizationShareDAO.unshare = function(visualizationId, userId, currentUser) {
  return checkOwner(visualizationId, currentUser).then(() => {
    return getShare(visualizationId, userId).then(share => {
      if (share) {
        return share.destroy();
      }
    });
  });
};

/**
 * Resolve a visualization
 *
 * @param {number} id a visualization id
 * @returns {Promise.<visualization>}
 */
function resolveVisualization(id) {
  const query = {where: {id: id}};
  return Db.models.visualization.find(query).then(viz => {
    if (!viz) {
      return Errors.business('not_found', 'Visualization "' + id + '" was not found', true);
    }
    return Promise.resolve(viz);
  });
}

/**
 * Check if the current user is the owner of a visualization
 *
 * @param {string|number} visualizationId
 * @param {WrappedUser} currentUser
 * @returns {Promise} resolved if the current user matches the viz' owner
 * @private
 */
function checkOwner(visualizationId, currentUser) {
  return resolveVisualization(visualizationId).then(viz => {
    // user is the original owner
    if (viz.userId === currentUser.id) {
      return;
    }

    return getShare(visualizationId, currentUser.id).then(share => {
      // user has delegated ownership
      if (share && share.right === 'owner') {
        return;
      }

      // user is not owner
      return Errors.access(
        'forbidden',
        'You can not change the share settings of a visualization that you don\'t own',
        true
      );
    });
  });
}

/**
 * @param {number} visualizationId
 * @param {number} userId
 * @returns {Promise.<visualizationShare>}
 * @private
 */
function getShare(visualizationId, userId) {
  const where = {visualizationId: visualizationId, userId: userId};
  return Db.models.visualizationShare.find({where: where});
}
