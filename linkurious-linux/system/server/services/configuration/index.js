/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-11-05.
 */
'use strict';

// internal libs
const crypto = require('crypto');

// external libs
const Promise = require('bluebird');
const fs = require('fs-extra');

// services
const LKE = require('../index');
const Log = LKE.getLogger(__filename);
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();

// locals
const Options = require('../../options');
const ConfigChecker = require('./ConfigChecker');
const UserCache = require('../access/UserCache');

const OBFUSCATED_STRING_PREFIX = '$LKPW$';
const OBFUSCATION_KEY = 'for obfuscation purposes';
const OBFUSCATION_ALGORITHM = 'aes-256-ctr';

const ASTERISK_PASSWORD = '********';
const PASSWORD_RE = /[Pp]assword|[Ss]ecret/;

/**
 * All the following configuration keys, when modified, require a restart:
 * - "db" and "db.*"
 *   - Any change to the SQL DB
 * - "access" and "access.*" except "access.authRequired" and "access.guestMode"
 *   - Any change to LDAP, SAML, OAuth2 etc.
 *   - Authentication and guest mode can be enabled without restart
 * - "server" and "server.*" except "server.cookieSecret"
 *   - Any change to the HTTP server, certificates etc.
 *   - cookieSecret is set on first run (we can't require restart)
 * - "advanced" and "advanced.layoutWorkers"
 *   - It requires to fork processes at start so we need to restart
 */
const NEED_RESTART_FIELDS = [
  /^db.*$/,
  /(^server\.(?!cookieSecret).*$)|(^server$)/,
  /(^access\.(?!(authRequired|guestMode)).*$)|(^access$)/,
  /(^advanced\.layoutWorkers$)|(^advanced$)/
];

/**
 * All the following configuration keys, when modified, require to free the user cache.
 */
const EMPTY_USER_CACHE_FIELDS = [
  /(^defaultPreferences$)/,
  /(^guestPreferences$)/
];

class ConfigurationService {

  constructor() {
    this.mode = LKE.options.mode;
    this.data = {};
    this.defaultConfig = {};

    this.needRestart = false;
  }

  /**
   * Load the default configuration and the user configuration files. Depending on the mode
   * we are running, reset the user configuration file with the default one.
   *
   * @returns {boolean} true if the JS configuration file could be loaded, false otherwise
   */
  load() {
    // load default config (JS file)
    this.defaultConfig = this._readDefaultConfig();

    // In DEV mode we delete user configuration on startup
    // In TEST mode we don't because we need a patched test.json file
    // for each configuration in the CI (runMocha.js will do it)
    if (LKE.isDevMode() || LKE.options.resetConfig) {
      Log.warn('Resetting user configuration file (' + (LKE.options.resetConfig
        ? 'requested by user'
        : ('automatic in ' + this.mode + ' mode')
      ) + ')');
      const file = this.getUserConfigPath();
      if (fs.existsSync(file)) { fs.unlinkSync(file); }
    }

    // load user config (JSON file)
    this.data = this._readUserConfig();

    return true;
  }

  /**
   * @private
   * @returns {any} default configuration data
   */
  _readDefaultConfig() {
    const fileJS = this._getDefaultConfigPath();
    const data = require(fileJS);
    if (!data) {
      throw Errors.technical('critical', 'Default configuration file is empty: "' + fileJS + '"');
    }
    return data;
  }

  /**
   * @private
   * @returns {string} the path of the DEFAULT configuration file for the current mode
   */
  _getDefaultConfigPath() {
    return LKE.systemFile('server/config/defaults/' + this.mode + '.js');
  }

  /**
   * Return true if `str` is a string made of any amount of '*' characters.
   *
   * @param {any} str
   * @returns {boolean}
   * @private
   */
  _isOnlyAsterisks(str) {
    return Utils.isNEString(str) && str.match(/^\**$/) !== null;
  }

  /**
   * @param {string} text
   * @returns {string}
   * @private
   */
  _obfuscateString(text) {
    const cipher = crypto.createCipher(OBFUSCATION_ALGORITHM, OBFUSCATION_KEY);

    const encodedPwd = Buffer.from(OBFUSCATED_STRING_PREFIX + text).toString('base64');
    const invertedPwd = encodedPwd.split('').reverse().join('');
    const encryptedPwd = Buffer.concat([
      cipher.update(Buffer.from(invertedPwd, 'ascii')),
      cipher.final()]
    ).toString('base64');
    return OBFUSCATED_STRING_PREFIX + encryptedPwd;
  }

  /**
   * @param {string} obfuscatedString
   * @param {string} propertyPath
   * @returns {string}
   * @private
   */
  _deobfuscateString(obfuscatedString, propertyPath) {
    const decipher = crypto.createDecipher(OBFUSCATION_ALGORITHM, OBFUSCATION_KEY);

    const dePrefixedPwd = obfuscatedString.slice(OBFUSCATED_STRING_PREFIX.length);
    const decryptedPwd = Buffer.concat([
      decipher.update(Buffer.from(dePrefixedPwd, 'base64')),
      decipher.final()]
    ).toString('ascii');
    const deInvertedPwd = decryptedPwd.split('').reverse().join('');
    const decodedPwd = Buffer.from(deInvertedPwd, 'base64').toString('ascii');

    if (decodedPwd.slice(0, OBFUSCATED_STRING_PREFIX.length) !== OBFUSCATED_STRING_PREFIX) {
      // someone modified an obfuscated string manually but left the "$LKPW$" prefix
      throw Errors.technical('invalid_parameter',
        'The obfuscated string at ' + propertyPath + ' is not valid.');
    }

    return decodedPwd.slice(OBFUSCATED_STRING_PREFIX.length);
  }

  /**
   * Look in every property key of `config` for fields matching PASSWORD_RE.
   * Apply `passwordTransformation` to any of these password fields.
   * If `passwordTransformation` returns `undefined` or `null`, do not erase the original value.
   *
   * @param {any}                              config                 The configuration
   * @param {function(string, string): string} passwordTransformation Map function to apply to every password field
   * @param {string}                           [propertyPath]         Used in the recursion to carry the path information
   * @private
   */
  _transformPasswords(config, passwordTransformation, propertyPath) {
    if (Utils.isObject(config)) {
      for (const key of Object.keys(config)) {
        const subPropertyPath = Utils.hasValue(propertyPath) ? propertyPath + '.' + key : key;
        // this allows to iterate over arrays and objects and nothing else
        if (typeof config[key] === 'object' && config[key] !== null) {
          this._transformPasswords(config[key], passwordTransformation, subPropertyPath);
        } else if (typeof config[key] === 'string' && key.match(PASSWORD_RE)) {
          const transformedValue = passwordTransformation(config[key], subPropertyPath);
          if (Utils.hasValue(transformedValue)) {
            config[key] = transformedValue;
          }
        }
      }
    }
  }

  /**
   * Look in every property key of `config` for fields matching PASSWORD_RE.
   * Apply the obfuscation algorithm to any of the password fields.
   *
   * @param {any} config The configuration
   * @private
   */
  _obfuscateAllPasswords(config) {
    this._transformPasswords(config, password => {
      if (!password.startsWith(OBFUSCATED_STRING_PREFIX)) {
        return this._obfuscateString(password);
      }
    });
  }

  /**
   * Look in every property key of `config` for fields matching PASSWORD_RE.
   * Apply the de-obfuscation algorithm to any of the password fields.
   *
   * @param {any} config The configuration
   * @private
   */
  _deobfuscateAllPasswords(config) {
    this._transformPasswords(config, (password, propertyPath) => {
      if (password.startsWith(OBFUSCATED_STRING_PREFIX)) {
        return this._deobfuscateString(password, propertyPath);
      }
    });
  }

  /**
   * Look in every property key of `data` for fields matching PASSWORD_RE.
   * Replace the value of any of the password fields with asterisks.
   *
   * @param {any} config The configuration
   * @private
   */
  _asteriskAllPasswords(config) {
    this._transformPasswords(config, () => ASTERISK_PASSWORD);
  }

  /**
   * Load the user configuration file. If the file is not found or it's empty,
   * reset the user configuration file with the default one.
   *
   * @private
   * @throws {LkError} if the configuration is not valid
   * @returns {any} user configuration data
   */
  _readUserConfig() {
    if (!this.defaultConfig) {
      throw Errors.technical('bug', 'Default config must be loaded before reading the user config');
    }

    // if user config file is missing, create a new one from defaults
    const configFile = this.getUserConfigPath();
    if (!fs.existsSync(configFile)) {
      this._persistUserConfig(this.defaultConfig);
    }

    // read the user config
    const json = fs.readFileSync(configFile).toString();
    let data;

    try {
      data = JSON.parse(json);
    } catch(e) {

      const error = Utils.getJSONParseError(json);
      throw Errors.business('invalid_configuration',
        'The configuration file "' + configFile + '" ' +
        'has errors (' + error.message + ') ' +
        'at line ' + error.line + ' ' +
        '(column ' + error.column + '' + '): ' + error.snippet
      );
    }

    // check if the user config structure is conform to the default config structure
    try {
      ConfigChecker.check(data);
    } catch(e) {
      throw Errors.business(
        'invalid_configuration',
        'The configuration file has errors: ' + e.message + ' (in ' + configFile + '). ' +
        'To reset to defaults, use the --' + Options.RESET_OPTION + ' option'
      );
    }

    // if the JSON file was empty
    if (!data) {
      // clone the default config
      data = Utils.clone(this.defaultConfig);
      // the JSON file is empty, fill it with defaults
      this._persistUserConfig(data);
    } else if (Utils.hasValue(data.advanced) && data.advanced.obfuscation) {
      // every time we read the user config, we persist it as well to ensure
      // that every field to obfuscate is obfuscated
      this._persistUserConfig(data);
    }

    // if the advanced.obfuscation flag is set to false, obfuscated passwords still get de-obfuscated
    this._deobfuscateAllPasswords(data);

    Log.info('Loaded configuration from file (' + this.mode + ')');
    return data;
  }

  /**
   * @returns {string} the path of the USER configuration file for the current mode
   */
  getUserConfigPath() {
    return LKE.dataFile('config/' + this.mode + '.json');
  }

  /**
   * @private
   * @param {any} config configuration data
   */
  _persistUserConfig(config) {
    const data = Utils.clone(config);
    if (Utils.hasValue(data.advanced) && data.advanced.obfuscation) {
      this._obfuscateAllPasswords(data);
    }

    fs.ensureFileSync(this.getUserConfigPath());
    fs.writeFileSync(
      this.getUserConfigPath(),
      JSON.stringify(data, null, ' ')
    );
  }

  /**
   * Read a configuration property.
   *
   * @param {string}  [propertyPath]  Path of the property to read (use '.' as separator) or undefined for the whole config object
   * @param {any}     [defaultValue]  The default value to return if no value is found
   * @param {boolean} [required]      Throw an LkError if the property is not found
   * @param {boolean} [hidePasswords] Whether password fields should be protected with asterisks
   * @returns {any}
   */
  get(propertyPath, defaultValue, required, hidePasswords) {
    if (propertyPath !== undefined && !Utils.isNEString(propertyPath)) {
      throw Errors.technical('bug', 'Could not get an empty property key in the configuration');
    }

    const keyChain = propertyPath === undefined ? [] : propertyPath.split('.', 10);

    const doHidePasswords = object => {
      if (!Utils.isObject(object)) {
        return object;
      }

      // we clone the object here so that we can asterisk the password
      // but we clone it deep even if `hidePasswords` is false
      // so that we can return its son safely later
      object = Utils.clone(object);

      // if passwords have to be hidden, we call the function on the last object in the tree
      if (hidePasswords) {
        this._asteriskAllPasswords(object);
      }

      return object;
    };

    let value = this.data;
    if (keyChain.length === 0) {
      value = doHidePasswords(value);
    } else {
      while (keyChain.length > 0 && value !== null && value !== undefined) {
        if (keyChain.length === 1) {
          value = doHidePasswords(value);
        }

        value = value[keyChain.shift()];
      }
    }

    if (value === null || value === undefined) {
      if (required) {
        throw Errors.business('missing_field', '"' + propertyPath + '" is required');
      } else {
        value = defaultValue;
      }
    }

    return value;
  }

  /**
   * Override a configuration property with the object passed as the value argument.
   * This replaces all the child object properties and values.
   *
   * @param {string}  propertyPath            Path of the property to set (use '.' as separator)
   * @param {any}     value                   The value to set
   * @param {boolean} [ignoreHiddenPasswords] Whether password fields should be ignored if made exclusively of asterisks
   * @returns {Bluebird<void>}
   */
  set(propertyPath, value, ignoreHiddenPasswords) {
    if (!Utils.isNEString(propertyPath)) {
      return Errors.business('invalid_parameter',
        'The path of a configuration property must be a non-empty string', true
      );
    }

    if (ignoreHiddenPasswords && propertyPath.match(PASSWORD_RE) && this._isOnlyAsterisks(value)) {
      // nothing to do, we don't set a password made of asterisks if `ignoreHiddenPasswords` is true
      return Promise.resolve();
    }

    const keyChain = propertyPath.split('.', 10);

    // clone current config
    const newData = JSON.parse(JSON.stringify(this.data));

    // we check the propertyPath and if we modify a field containing
    // a NEED_RESTART_FIELDS we mark `candidateForNeedRestart` as true
    // if the configuration is still valid, we actually set `needRestart` to true
    let candidateForNeedRestart = false;
    if (!this.needRestart) {
      for (const needRestartField of NEED_RESTART_FIELDS) {
        if (propertyPath.match(needRestartField)) {
          candidateForNeedRestart = true;
        }
      }
    }
    for (const field of EMPTY_USER_CACHE_FIELDS) {
      if (propertyPath.match(field)) {
        UserCache.emptyCache();
      }
    }

    // resolve parent of the update
    let i, newDataChangeParent = newData;
    for (i = 0; i < keyChain.length - 1; i++) {
      newDataChangeParent = newDataChangeParent[keyChain[i]];
    }

    if (ignoreHiddenPasswords) {
      // every password in `value` that is made exclusively of asterisks
      // it's replaced with the original value
      this._transformPasswords(value, (password, propertyPath) => {
        if (this._isOnlyAsterisks(password)) {
          return Utils.safeGet(newDataChangeParent[keyChain[i]], propertyPath);
        }
        return password;
      });
    }

    // update the cloned config (updates `newData`)
    newDataChangeParent[keyChain[i]] = value;

    // check that the cloned updated config is valid
    try {
      ConfigChecker.check(newData);
    } catch(e) {
      return Errors.business(
        'invalid_parameter', 'Invalid configuration structure: ' + e.message, true
      );
    }

    this._deobfuscateAllPasswords(newData);
    this.data = newData;
    this._persistUserConfig(this.data);

    this.needRestart = this.needRestart || candidateForNeedRestart;

    return Promise.resolve();
  }

  /**
   * Add a value to a configuration property that is an array.
   *
   * @param {string} propertyPath Path of the property
   * @param {any}    value        Value to add
   * @returns {Bluebird<number>} resolved with the new size of the array
   */
  add(propertyPath, value) {
    return Promise.resolve().then(() => {
      const array = this.get(propertyPath, []);
      Utils.check.array(propertyPath, array);
      array.push(value);
      return this.set(propertyPath, array).return(array.length);
    });
  }

  /**
   * Remove a value from a configuration property that is an array.
   *
   * @param {string} propertyPath Path of the property
   * @param {number} valueIndex   The index to remove from the array
   * @returns {Bluebird<void>}
   */
  remove(propertyPath, valueIndex) {
    return Promise.resolve().then(() => {
      let array = this.get(propertyPath, []);
      Utils.check.array(propertyPath, array, valueIndex - 1);
      array = array.slice(0, valueIndex).concat(array.slice(valueIndex + 1));
      return this.set(propertyPath, array);
    });
  }

  /**
   * Reset the configuration to the default values.
   *
   * If no property path is specified, reset the whole configuration.
   *
   * If the property path is specified then the default value is retrieved from the configuration
   * and set as the current configuration value. The other configuration keys are not modified.
   *
   * @param {string} [propertyPath] Path of the property
   * @returns {Bluebird<void>}
   */
  reset(propertyPath) {
    // reset the whole file
    if (!propertyPath) {
      const userConfigFile = this.getUserConfigPath();
      if (fs.existsSync(userConfigFile)) {
        fs.removeSync(userConfigFile);
      }
      this._persistUserConfig(this.defaultConfig);
      return Promise.resolve(this.load()).return();
    } else { // reset only one property
      // validate keyChain
      const keyChain = propertyPath.split('.', 10);
      if (keyChain.length === 0) {
        return Errors.business('invalid_parameter',
          'Could not reset \'\' property  key in the configuration', true
        );
      }
      // resolve property to reset
      let defaultData = this.defaultConfig;
      while (keyChain.length > 0) {
        const k = keyChain.shift();
        defaultData = defaultData[k];
      }
      // reset
      return this.set(propertyPath, Utils.clone(defaultData));
    }
  }
}

module.exports = new ConfigurationService();
