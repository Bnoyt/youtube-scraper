/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-06-29.
 */
'use strict';

const _ = require('lodash');

const Promise = require('bluebird');
const Sequelize = require('sequelize');
const compareSemVer = require('./SemVer').compare;
const Check = require('valcheck');

const check = new Check(message => {
  throw new Error(message);
});

const DEFAULT_VERSION_TABLE = 'db_version';

const CHANGE_PARAMS = {
  dropTable: {required: ['tableName']},
  renameTable: {required: ['tableName', 'newTableName']},
  removeColumn: {required: ['tableName', 'columnName']},
  renameColumn: {required: ['tableName', 'columnName', 'newColumnName']},
  addColumn: {
    required: ['tableName', 'columnName', 'columnType', 'defaultValue', 'allowNull'],
    authorized: ['values', 'unique']
  },
  changeColumn: {
    required: ['tableName', 'columnName', 'columnType', 'defaultValue', 'allowNull'],
    authorized: ['values', 'unique', 'exceptDialects']
  }
};

/** @type {string[]} */
const CHANGE_TYPES = Object.keys(CHANGE_PARAMS);

/**
 * Database Schema Update
 *
 * @typedef {object} DBUpdate
 * @property {string} version     - Version SemVer string
 * @property {string} [comment]   - Optional comment string
 * @property {DBChange[]} changes - Changes array
 */

/**
 * Database Schema Change
 *
 * @typedef {object} DBChange
 * @property {string} type            - one of `["dropTable","renameTable","addColumn","deleteColumn","renameColumn","changeColumn"]`
 * @property {string} tableName       - name of the target table
 * @property {string[]} [exceptDialects]  - dialects for which not to apply this change.
 * @property {string} [newTableName]  - required when `type` is `"renameTable"`
 * @property {string} [columnName]    - required when `type` in `["addColumn", "deleteColumn", "renameColumn", "changeColumn"]`
 * @property {string} [newColumnName] - required when `type` is `"renameColumn"`
 * @property {string} [columnType]    - required when `type` in `["changeColumn", "addColumn"]`
 * @property {*} [defaultValue]       - required when `type` in `["changeColumn", "addColumn"]`
 * @property {boolean} [allowNull]    - required when `type` in `["changeColumn", "addColumn"]`
 */

/**
 * @param {String} database The name of the database
 * @param {String} [username=null] The username which is used to authenticate against the database
 * @param {String} [password=null] The password which is used to authenticate against the database
 * @param {Object} [options={}] Sequelize options
 * @param {string} [versionTable="db_version"] name of the version table
 * @constructor SequelizeUpdater
 */
function SequelizeUpdater(database, username, password, options, versionTable) {
  if (!versionTable) { versionTable = DEFAULT_VERSION_TABLE; }
  this.versionTable = versionTable;

  let maxConnections = 1;
  // MySQL and others require the connections to be 1 because they disable foreign key
  // based on session

  if (options.dialect === 'mssql') {
    maxConnections = 2;
    // MSSQL alter the tables to disable FKC (so we can have as many connections as we want)
    // But we need at least two since QueryInterface::removeColumn in Sequelize 3.30.x
    // cannot take a transaction in the options (PR already existing not backported to Sequelize 3)
  }

  // options.logging = true;

  this.sequelize = new Sequelize(database, username, password,
    _.defaults({pool: {maxConnections}}, options));
}

/**
 *
 * @param {DBUpdate[]} updates
 * @param {string} targetVersion current code version
 * @returns {Promise<DBUpdate[]>}
 */
SequelizeUpdater.prototype.run = function(updates, targetVersion) {
  check.nonEmpty('targetVersion', targetVersion);
  SequelizeUpdater.validate(updates);
  const self = this;

  // 1) get current version
  return self.getCurrentVersion(targetVersion).then(dbVersion => {

    // 2) get list of updates to apply
    const updatesToApply = updates.filter(update => {
      // if db-update is not already applied AND does not updates further than current code version
      return compareSemVer(update.version, dbVersion) > 0 &&
        compareSemVer(update.version, targetVersion) <= 0;
    }).sort((u1, u2) => {
      return compareSemVer(u1.version, u2.version);
    });

    // 3) read current tables names
    return self.sequelize.getQueryInterface().showAllTables().then(tableNames => {
      self.tableNames = tableNames;

      if (self.sequelize.options.dialect === 'mssql') {
        // we don't care about the schema that is always dbo
        self.tableNames = self.tableNames.map(t => t.tableName);
      }
    }).then(() => {
      // 4) apply relevant updates
      return self.applyUpdates(updatesToApply).return(updatesToApply);
    });
  });
};

/**
 *
 * @param {DBUpdate[]} updates
 * @returns {Promise}
 */
SequelizeUpdater.prototype.applyUpdates = function(updates) {
  const self = this;

  // if no updates to apply, don't bother to disable/enable foreign key checks.
  //if (updates.length === 0) { return Promise.resolve(updates); }

  // 1) read original value of FKC
  let orgFKC;
  return self._getFKC().then(_orgFKC => {
    orgFKC = _orgFKC;
    // 2) disable FKC
    return self._setFKC(false, true);
  }).then(() => {
    // 3) apply updates
    return Promise.each(updates, update => self._applyUpdate(update));
  }).then(() => {
    // 4) reset FKC to original value
    return self._setFKC(orgFKC);
  });
};

/**
 * @returns {Promise.<string>}
 * @private
 */
SequelizeUpdater.prototype._getFKC = function() {
  // sequelize supports: 'mysql', 'sqlite', 'postgres', 'mariadb'
  switch (this.sequelize.options.dialect) {
    case 'sqlite':
      return this._query('PRAGMA foreign_keys').then(r => r[0]['foreign_keys']);
    case 'mssql':
      return Promise.resolve(true); // always, true, FKC is per table
    case 'mysql':
    case 'postgres':
    case 'mariadb':
      return this._query('SELECT @@FOREIGN_KEY_CHECKS as fkc').then(r => r[0][0].fkc);
    default:
      throw new Error('Sequelize dialect not supported: "' + this.sequelize.options.dialect + '"');
  }
};

/**
 * @param {string} q
 * @returns {Promise<*>}
 * @private
 */
SequelizeUpdater.prototype._query = function(q) {
  return this.sequelize.query(q, {raw: true});
};

/**
 * @param {string|boolean} value
 * @param {boolean} [valueIsBoolean=false] interpret `value` as a boolean
 * @returns {Promise}
 * @private
 */
SequelizeUpdater.prototype._setFKC = function(value, valueIsBoolean) {
  // sequelize supports: 'mysql', 'sqlite', 'postgres', 'mariadb'
  switch (this.sequelize.options.dialect) {
    case 'sqlite':
      // boolean: (1 yes true on) / (0 no false off)
      return this._query(
        `PRAGMA foreign_keys = ${valueIsBoolean ? (value ? '1' : '0') : value}`
      );
    case 'mssql':
      return Promise.resolve(); // nothing to do
    case 'mysql':
    case 'postgres':
    case 'mariadb':
      return this._query(
        `SET FOREIGN_KEY_CHECKS = ${valueIsBoolean ? (value ? '1' : '0') : value}`
      ).delay(1000); // /!\ don't remove this delay: _setFKC does not seem to be synchronous.
    // TODO #729 check if delay is still needed. Probably obsolete, it was due to poolsize > 1
    default:
      throw new Error('Sequelize dialect not supported: "' + this.sequelize.options.dialect + '"');
  }
};

/**
 *
 * @param {DBUpdate} update
 * @returns {Promise}
 * @private
 */
SequelizeUpdater.prototype._applyUpdate = function(update) {
  return this.sequelize.transaction(transaction => {
    return Promise.each(update.changes, change => {
      return this._applyChange(change, transaction);
    }).then(() => {
      return this.setCurrentVersion(update.version, transaction);
    });
  });
};

/**
 *
 * @param {DBChange} change - A single DB change
 * @param {Transaction} transaction
 * @returns {Promise}
 * @private
 */
SequelizeUpdater.prototype._applyChange = function(change, transaction) {
  const q = this.sequelize.getQueryInterface();
  const options = {transaction: transaction};

  if (change.exceptDialects && change.exceptDialects.indexOf(this.sequelize.options.dialect) >= 0) {
    // if the current dialect is in change.exceptDialects, don't apply the change.
    return Promise.resolve();
  }

  // check if tableName is in the list of tables
  return Promise.resolve().then(() => {
    // if the change is for a table that does not exist (yet), ignore it
    if (change.tableName && this.tableNames.indexOf(change.tableName) === -1) {
      return;
    }

    switch (change.type) {
      case 'dropTable': return this.dropTable(q, change, options);

      case 'renameTable': return q.renameTable(change.tableName, change.newTableName, options);

      case 'removeColumn': return this.removeColumn(q, change, options);

      case 'renameColumn': return this.renameColumn(q, change, options);

      case 'addColumn':
        return q.addColumn(change.tableName, change.columnName, {
          type: getSequelizeType(change.columnType),
          allowNull: change.allowNull,
          defaultValue: change.defaultValue,
          values: change.values,
          unique: change.unique
        }, options);

      case 'changeColumn':
        return this.changeColumn(q, change, options);
    }

    throw new Error('unknown change type "' + change.type + '"');
  });
};

/**
 * @param {QueryInterface} q
 * @param {DBChange} change
 * @param {object} options
 * @returns {*}
 */
SequelizeUpdater.prototype.dropTable = function(q, change, options) {
  if (this.sequelize.options.dialect === 'mssql') {
    // We don't support MSSQL dropTable. We could, but we can just stop using the table.
    return Promise.resolve();
  }
  return q.getForeignKeysForTables([change.tableName], options)
    .get(change.tableName)
    .each(foreignKey => {
      // drop all foreign keys
      const sql = q.QueryGenerator.dropForeignKeyQuery(change.tableName, foreignKey);
      return this.sequelize.query(sql, options);
    }).then(() => {
      this.tableNames.splice(this.tableNames.indexOf(change.tableName), 1);
      return q.dropTable(change.tableName, options);
    });
};

/**
 * @param {QueryInterface} q
 * @param {DBChange} change
 * @param {object} options
 * @returns {Promise}
 */
SequelizeUpdater.prototype.removeColumn = function(q, change, options) {
  if (this.sequelize.options.dialect === 'sqlite') {
    // There is NO SAFE WAY to do this in SQLite without the risk of loosing cascaded foreign keys.
    // Sequelize will try to create a temporary table without the removed column and copy the data
    // over, then delete the original table. This causes rows in other tables referencing rows in
    // this table to de deleted (or to have the reference set to NULL) because of cascading.
    // There is no way to disable cascading is SQLite.
    return Promise.resolve();
  } else {
    return q.removeColumn(change.tableName, change.columnName, options);
  }
};

/**
 * @param {QueryInterface} q
 * @param {DBChange} change
 * @param {object} options
 * @returns {Promise}
 */
SequelizeUpdater.prototype.changeColumn = function(q, change, options) {
  return Promise.resolve().then(() => {
    if (this.sequelize.options.dialect === 'mssql') {
      // TODO #729 check every changeColumn involving unique constraint
      // IN MSSQL we first have to drop all the DEFAULT constraint
      return this._query(
        `EXEC sp_helpconstraint @objname = [${change.tableName}]`
      ).then(constraintR => {
        const previousConstraints = [];

        constraintR[0].forEach(r => {
          if (r.constraint_name && r.constraint_name.includes(`__${change.columnName}__`) &&
            (r.constraint_name.startsWith('DF'))
          ) {
            previousConstraints.push(r.constraint_name);
          }
        });

        return Promise.map(previousConstraints, c => {
          return this._query(
            `ALTER table [${change.tableName}] DROP CONSTRAINT "${c}"`
          );
        });
      });
    }
  }).then(() => {
    return q.changeColumn(change.tableName, change.columnName, {
      type: getSequelizeType(change.columnType),
      allowNull: change.allowNull,
      defaultValue: change.defaultValue,
      values: change.values,
      unique: change.unique
    }, options);
  });
};

/**
 * @param {QueryInterface} q
 * @param {DBChange} change
 * @param {object} options
 * @returns {Promise}
 */
SequelizeUpdater.prototype.renameColumn = function(q, change, options) {
  if (this.sequelize.options.dialect === 'sqlite') {
    // sqlite workaround to rename: create a new column and set the old value to null
    return q.describeTable(change.tableName, options).then(data => {
      const attr = {
        attribute: change.newColumnName,
        type: data[change.columnName].type,
        allowNull: true, // it has to be true, otherwise it cannot be created if there are rows
        defaultValue: data[change.columnName].defaultValue
      };
      return q.addColumn(change.tableName, change.newColumnName, attr, options).then(() => {
        // copy oldColumn to newColumn
        // we don't null the new column as it mays not allow null values
        return this.sequelize.query(
          `UPDATE ${q.quoteTable(change.tableName)} ` +
          `SET ${q.quoteIdentifier(change.newColumnName)} ` +
          `= ${q.quoteIdentifier(change.columnName)};`,
          options
        );
      }).then(() => {
        // if the column shouldn't allow null
        if (!data[change.columnName].allowNull) {
          attr.allowNull = false;
          // we change the new column to not allow null
          return q.changeColumn(change.tableName, change.newColumnName, attr, options).then(() => {
            attr.allowNull = true;
            // but the old one has to allow it because we don't remove it
            return q.changeColumn(change.tableName, change.columnName, attr, options);
          });
        }
      });
    });

  } else {
    return q.renameColumn(change.tableName, change.columnName, change.newColumnName, options);
  }
};

/**
 *
 * @param {string} version a SemVer string
 * @param {Transaction} transaction
 */
SequelizeUpdater.prototype.setCurrentVersion = function(version, transaction) {
  return this.sequelize.model(this.versionTable).findOne({
    where: {},
    transaction: transaction
  }).then(vInstance => {
    vInstance.version = version;
    return vInstance.save({transaction: transaction});
  });
};

/**
 * Get the current DB version.
 *
 * @param {string} defaultVersion
 * @returns {Promise.<string>} a semVer string
 */
SequelizeUpdater.prototype.getCurrentVersion = function(defaultVersion) {
  const Version = this.sequelize.define(this.versionTable, {
    version: {allowNull: false, type: Sequelize.STRING}
  });
  return this.sequelize.sync().then(() => {
    return Version.findOrCreate({where: {}, defaults: {version: defaultVersion}});
  }).spread(v => v.version);
};

/**
 * Check the validity of a list of updates.
 *
 * @param {DBUpdate[]} updates
 */
SequelizeUpdater.validate = function validate(updates) {
  check.array('updates', updates);
  updates.forEach((update, i) => {
    validateUpdate(update, 'updates[' + i + ']');
  });
};

// private methods

/**
 * @param {DBUpdate} update
 * @param {string} prefix
 */
function validateUpdate(update, prefix) {
  check.exist(prefix, update);
  check.nonEmpty(prefix + '.version', update.version);
  if (update.comment !== undefined) {
    check.nonEmpty(prefix + '.comment', update.comment);
  }
  check.array(prefix + '.changes', update.changes);
  update.changes.forEach((change, i) => {
    validateChange(change, prefix + '.changes[' + i + ']');
  });
}

/**
 * Legal types:
 * - STRING
 * - CHAR
 * - TEXT
 * - LONGTEXT (*)
 * - NUMBER
 * - INTEGER
 * - BIGINT
 * - FLOAT
 * - TIME
 * - DATE
 * - BOOLEAN
 * - BLOB
 * - DECIMAL
 * - NUMERIC
 * - ENUM
 * - REAL
 * - DOUBLE
 * - GEOMETRY
 * - GEOGRAPHY
 *
 * (*) converts to DataTypes.TEXT('long')
 *
 * @param {string} columnType
 * @returns {DataTypes}
 */
function getSequelizeType(columnType) {
  const t = Sequelize[columnType];
  switch (columnType) {
    case 'LONGTEXT': return Sequelize.TEXT('long');
    default:
      return typeof t === 'function' ? t() : undefined;
  }
}

/**
 * @param {DBChange} change
 * @param {string} prefix
 */
function validateChange(change, prefix) {
  // check that the change is defined
  check.exist(prefix, change);

  // check that the change-type is legal
  check.values(prefix + '.type', change.type, CHANGE_TYPES);

  // check that all required params for type change-type are there
  const requiredKeys = CHANGE_PARAMS[change.type].required.concat(['type']);
  const authorizedKeys = (CHANGE_PARAMS[change.type].authorized || []).concat(requiredKeys);
  check.objectKeys(prefix, change, authorizedKeys, requiredKeys);

  if (change.exceptDialects !== undefined) {
    check.stringArray(prefix + '.exceptDialects', change.exceptDialects, 1);
  }

  // check that the column type references an existing type
  if (change.columnType !== undefined) {
    check.exist(prefix + '.columnType', getSequelizeType(change.columnType));
  }

  if (['TEXT', 'LONGTEXT', 'BLOB'].indexOf(change.columnType) >= 0) {
    check.null(prefix + '.defaultValue', change.defaultValue);
    check.boolean(prefix + '.allowNull', change.allowNull, false, true);
  }
}

module.exports = SequelizeUpdater;
