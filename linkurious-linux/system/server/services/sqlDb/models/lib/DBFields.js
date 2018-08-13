/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-10-08.
 */
'use strict';

// internal libs
const crypto = require('crypto');

// external libs
const Sequelize = require('sequelize');
const randomstring = require('randomstring');

// services
const LKE = require('../../../index');
const Log = LKE.getLogger(__filename);
const Utils = LKE.getUtils();

const DBFields = {};

DBFields._hashPassword = function(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 256, 'sha1');
};

/**
 * Store a password in a Sequelize instance.
 * The instance must have a "password" and a "salt" field.
 * - "password" must be a 512 char string.
 * - "salt" must be a 24 char string.
 *
 * @param {any}    instance Any SequelizeInstance with a password and a salt field
 * @param {string} password
 */
DBFields.storePassword = function(instance, password) {
  if (password === null || password === undefined) {
    instance.setDataValue('salt', null);
    instance.setDataValue('password', null);
    return;
  }

  const salt = crypto.randomBytes(12);
  const hashedPassword = DBFields._hashPassword(password, salt);
  instance.setDataValue('salt', salt.toString('hex'));
  instance.setDataValue('password', hashedPassword.toString('hex'));
};

/**
 * Check if password match with the password store in the Sequelize instance.
 *
 * @param {any}    instance
 * @param {string} password
 * @returns {boolean}
 */
DBFields.checkPassword = function(instance, password) {
  if (instance.password === null || instance.password === undefined) {
    // if there is no password to check, return true no matter what
    return true;
  }

  if (password === null || password === undefined) {
    // if the provided password is missing, return false no matter what
    return false;
  }

  const salt = Buffer.from(instance.salt, 'hex');
  const hashedPassword = DBFields._hashPassword(password, salt);
  return instance.password === hashedPassword.toString('hex');
};

/**
 * Generate a JSON field stored as a string and parsed as a JS object.
 *
 * @param {string}  fieldName      Field name set in the database
 * @param {any}     [defaultValue]
 * @param {boolean} [longField]    Whether to use a LONGTEXT field
 * @param {string}  [dialect]      Current SQL dialect (can change whether a LONGTEXT field will be used)
 * @returns {any} a Sequelize.DefineAttributeColumnOptions
 */
DBFields.generateJsonField = function(fieldName, defaultValue, longField, dialect) {
  const useLong = longField && dialect !== 'sqlite';
  return {
    // in SQLite, there is NO max content size for TEXT
    // in MySQL, TEXT fields has a limit of 65535 chars. LONGTEXT can store 4294967295 chars (4GB)
    type: Sequelize.TEXT(useLong ? 'long' : ''),
    get: function() {
      const v = this.getDataValue(fieldName);
      if (v === null || v === undefined) {
        return defaultValue !== undefined ? defaultValue : v;
      }
      try {
        // first try
        return JSON.parse(v);
      } catch(error) {
        Log.warn(`JsonField parse exception for ${
          fieldName}, will try to parse partially. Error: ${error + ''}`
        );

        // second try
        const result = Utils.tryParseJson(v);
        if (result.parsed !== undefined) {
          // second try succeeded
          Log.warn(
            `JsonField partial parse succeeded for ${fieldName}. Discarded: ${result.discarded}`
          );
          return result.parsed;
        } else {
          // second try failed
          Log.error(`JsonField partial parse failed for ${
            fieldName}. Error: ${result.error + ''}. Value was: "${v}"`
          );
          return defaultValue;
        }
      }
    },
    set: function(v) {
      this.setDataValue(fieldName, JSON.stringify(v));
    }
  };
};

/**
 * Generate a date field stored as an integer and parsed as a JS Date object.
 *
 * @param {string}  fieldName
 * @param {boolean} allowNull
 * @returns {any} a Sequelize.DefineAttributeColumnOptions
 */
DBFields.generateIntegerDateField = function(fieldName, allowNull) {
  return {
    allowNull: allowNull,
    type: Sequelize.BIGINT,
    get: function() {
      const value = this.getDataValue(fieldName);
      // in MSSQL Sequelize.BIGINT returns a string so we coerce it to number
      return value !== undefined && value !== null ? new Date(Number(value)) : value;
    },
    set: function(newDate) {
      let v = undefined;
      if (newDate instanceof Date && isFinite(newDate.getTime())) {
        v = newDate.getTime();
      }
      this.setDataValue(fieldName, v);
    }
  };
};

DBFields.DEUNIQUE_SUFFIX = '_deunique_%';

/**
 * Generate a string field stored as an unique string and.
 * We use a second field of the same model to de-unique a field.
 * e.g.:
 * Model group with `fieldName` = "name" and `keyFieldName` = "sourceKey"
 *
 * If we set "example group name" as a group name and the source key is "12345678",
 * the resulting field in SQL will be "example group name_12345678"
 *
 * @param {string} fieldName
 * @returns {any} a Sequelize.DefineAttributeColumnOptions
 */
DBFields.generateStringFieldInUnique = function(fieldName) {
  return {
    allowNull: false,
    type: Sequelize.STRING,
    unique: true,
    get: function() {
      const value = this.getDataValue(fieldName);

      if (!Utils.isNEString(value)) {
        return value;
      }

      const indexOfKey = value.indexOf('_deunique_');

      if (indexOfKey !== -1) {
        return value.substring(0, indexOfKey);
      } else {
        return value;
      }
    },
    set: function(value) {
      const randomText = randomstring.generate({
        length: 8,
        charset: 'alphanumeric'
      });

      this.setDataValue(fieldName, value + '_deunique_' + randomText);
    }
  };
};

module.exports = DBFields;
