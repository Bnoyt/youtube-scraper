/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-06-11.
 */
'use strict';

// ext libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../index');
const Db = LKE.getSqlDb();
const Data = LKE.getData();
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();

const GraphQueryDAO = module.exports = {};

/**
 * Create a new graph query
 *
 * @param {object} options
 * @param {string} [options.name]
 * @param {string} options.content
 * @param {string} options.dialect
 * @param {string} options.sourceKey ey of a data-source
 * @param {WrappedUser} currentUser
 * @returns {Promise.<GraphQuery>}
 */
GraphQueryDAO.createQuery = function(options, currentUser) {
  Utils.check.object('option', options);
  Utils.check.exist('currentUser', currentUser);
  Utils.check.nonEmpty('sourceKey', options.sourceKey);
  Utils.check.nonEmpty('content', options.content);
  Utils.check.nonEmpty('dialect', options.dialect);
  Utils.check.values('dialect',
    options.dialect,
    Data.resolveSource(options.sourceKey).graph.features.dialects
  );

  return Db.models.graphQuery.create({
    name: options.name,
    content: options.content,
    userId: currentUser.id,
    dialect: options.dialect
  }).then(_filterGraphQuery);
};

/**
 * List all the given user's queries that are available for a given data-source
 *
 * @param {string} sourceKey key of a data-source
 * @param {WrappedUser} currentUser
 * @returns {Promise.<GraphQuery[]>}
 */
GraphQueryDAO.listQueries = function(sourceKey, currentUser) {
  Utils.check.exist('currentUser', currentUser);
  Utils.check.nonEmpty('sourceKey', sourceKey);

  const supportedDialects = Data.resolveSource(sourceKey).graph.features.dialects;
  const where = {userId: currentUser.id, dialect: supportedDialects};
  return Promise.resolve(Db.models.graphQuery.findAll({where: where})).map(_filterGraphQuery);
};

/**
 * Get a Graph Query by id
 *
 * @param {number} id ID of the retrieved query
 * @param {WrappedUser} currentUser
 * @returns {Promise.<GraphQuery>}
 */
GraphQueryDAO.getQuery = function(id, currentUser) {
  return _findQuery(id, currentUser).then(_filterGraphQuery);
};

/**
 * Delete Graph Query by id
 *
 * @param {number} id ID of the retrieved query
 * @param {WrappedUser} currentUser
 * @returns {Promise.<GraphQuery>}
 */
GraphQueryDAO.deleteQuery = function(id, currentUser) {
  return _findQuery(id, currentUser).then(query => {
    return query.destroy();
  });
};

/**
 * Update an existing Graph Query
 *
 * @param {number} id
 * @param {Object} properties
 * @param {string} properties.name
 * @param {string} properties.content
 * @param {WrappedUser} currentUser
 * @returns {Promise.<GraphQuery>}
 */
GraphQueryDAO.updateQuery = function(id, properties, currentUser) {
  Utils.check.objectKeys('properties', properties, ['name', 'content']);

  return _findQuery(id, currentUser).then(query => {
    _.forEach(properties, (value, key) => {
      query[key] = value;
    });
    return query.save();
  }).then(_filterGraphQuery);
};

/**
 * Unwrap (sequelize) a GraphQuery object and filter its the fields
 *
 * @param {GraphQuery} query
 * @returns {GraphQuery}
 * @private
 */
function _filterGraphQuery(query) {
  // unwrap sequelize object if necessary
  if (typeof query.get === 'function') { query = query.get(); }
  query = _.pick(query, ['id', 'name', 'content', 'dialect', 'updatedAt', 'createdAt']);
  if (query.name === null) { delete query.name; }
  return query;
}

/**
 * Resolve a GraphQuery by ID.
 * - id value is checked to be a positive integer
 * - currentUser is checked to exist
 * - promise is rejected with a 'not_found' error if the query is not found
 *
 * @param {number} id
 * @param {WrappedUser} currentUser
 * @returns {Promise.<GraphQuery>}
 * @private
 */
function _findQuery(id, currentUser) {
  Utils.check.posInt('id', id);
  Utils.check.exist('currentUser', currentUser);

  const where = {userId: currentUser.id, id: id};
  return Db.models.graphQuery.find({where: where}).then(query => {
    if (!query) {
      return Errors.business(
        'not_found', 'Graph query #' + id + ' was not found for this user.', true
      );
    }
    return query;
  });
}
