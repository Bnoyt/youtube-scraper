/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-10-08.
 */
'use strict';

// external libs
const _ = require('lodash');

// services
const LKE = require('../../index');
const Db = LKE.getSqlDb();

// locals
const DBFields = require('./lib/DBFields');

const PUBLIC_FIELDS = ['id', 'username', 'email', 'source', 'preferences'];
const UNIQUE_USER_ID = 1;
const UNIQUE_USER_DEFAULTS = {
  id: UNIQUE_USER_ID,
  username: 'Unique user',
  email: 'user@linkurio.us',
  source: 'local',
  password: '-',
  preferences: {}
};

const GUEST_USER_EMAIL = 'guest@linkurio.us';
const GUEST_USER_DEFAULTS = {
  username: 'Guest',
  email: GUEST_USER_EMAIL,
  source: 'local',
  password: '-',
  preferences: {}
};

module.exports = function(sequelize, DataTypes) {

  const userModel = sequelize.define('user', {
    username: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    salt: {
      type: DataTypes.STRING(24),
      allowNull: false
    },
    password: {
      type: DataTypes.STRING(512),
      allowNull: false,
      set: function(password) {
        DBFields.storePassword(this, password);
      }
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      get: function() {
        const valueSource = this.getDataValue('source');
        const valueLdap = this.getDataValue('ldap');
        // if the ldap field is set to true (only possible in user created in or before v1.3.6)
        // overrides the source value
        return valueLdap ? 'ldap' : valueSource;
      }
    },
    preferences: DBFields.generateJsonField('preferences', {}),

    // @backward-compatibility ldap field was deprecated by the source field
    ldap: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false // null is not allowed, so we leave a default value
    }
  }, {
    charset: 'utf8',
    classMethods: {
      associate: models => {
        models.group.belongsToMany(userModel, {through: 'userGroups'});
      },
      initialValues: () => {
        // Persist the unique user
        return userModel.findOrCreate({
          // we check also for the OLDER unique user id (-1)
          where: {id: [UNIQUE_USER_ID, -1]},
          include: [{model: Db.models.group, include: [Db.models.accessRight]}],
          defaults: UNIQUE_USER_DEFAULTS
        }).spread((uniqueUser, created) => {
          userModel.UNIQUE_USER_ID = uniqueUser.id;

          // findOrCreate doesn't set groups to empty array on create but it will set it on find
          if (!created && uniqueUser.groups.length > 0) { // in LKE 1 the unique user wasn't assigned to any group
            return;
          }
          return uniqueUser.addGroup(Db.models.group.ADMIN_GROUP).return();
        }).then(() => {
          // Persist the guest user
          return userModel.findOrCreate({
            where: {email: GUEST_USER_EMAIL},
            defaults: GUEST_USER_DEFAULTS
          });
        }).spread(guestUser => {
          userModel.GUEST_USER_ID = guestUser.id;
        });
      },
      instanceToPublicAttributes: instanceToPublicAttributes
    },

    instanceMethods: {
      /**
       * @param {string} password
       * @returns {boolean}
       */
      comparePassword: function(password) {
        return DBFields.checkPassword(this, password);
      }
    }
  });

  userModel.PUBLIC_FIELDS = PUBLIC_FIELDS;

  return userModel;
};

/**
 * @param {UserInstance} userInstance
 * @param {boolean}      [withDates]  Whether to populate the creation and update dates
 * @returns {Partial<PublicUser>} only missing actions
 */
function instanceToPublicAttributes(userInstance, withDates) {
  let fields = PUBLIC_FIELDS;
  if (withDates) {
    fields = fields.concat(['createdAt', 'updatedAt']);
  }

  return /**@type {Partial<PublicUser>}*/ (_.pick(userInstance, fields));
}
