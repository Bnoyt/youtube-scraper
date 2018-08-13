/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-07-22.
 */
'use strict';

const spawnSync = require('child_process').spawnSync;
const path = require('path');
const fs = require('fs');
const SemVer = require('./SemVer');

const isWindows = (process.platform === 'win32');
const isMac = (process.platform === 'darwin');

function _fileExists(filePath) {
  if (!filePath) { return false; }
  if (!fs.existsSync(filePath)) { return false; }
  const stat = fs.statSync(filePath);
  return stat.isFile();
}

function _folderExists(folderPath) {
  if (!folderPath) { return false; }
  if (!fs.existsSync(folderPath)) { return false; }
  const stat = fs.statSync(folderPath);
  return stat.isDirectory();
}

function _isJDK(javaPath) {
  return _fileExists(path.resolve(javaPath, 'bin', 'javac' + (isWindows ? '.exe' : '')));
}

class JavaHomeFinder {

  /**
   * @param {function(string)} [logger=console.log] a function used to log events
   * @constructor
   */
  constructor(logger) {
    this.logger = logger || console.log;
  }

  /**
   * @param {string} javaPath a potential JAVA home directory
   * @param {object} [options] options
   * @param {boolean|undefined} [options.jdk] whether we are looking for a JDK
   * @param {string|undefined} [options.version] the minimum version (in the form "X.Y.Z")
   * @param {string|undefined} [options.maxVersion] the maximum version (in the form "X.Y.Z")
   *
   * @returns {boolean} true if the given folder looks like a potential JAVA home directory
   */
  isJavaHome(javaPath, options) {
    // trivial case
    if (javaPath === null || javaPath === undefined) {
      return false;
    }

    // set default options
    if (!options) {
      options = {};
    }

    // resolve binary paths
    const javaBinPath = path.resolve(javaPath, 'bin', 'java' + (isWindows ? '.exe' : ''));

    return (
      _folderExists(javaPath) &&
      _fileExists(javaBinPath) &&
      (!options.jdk || _isJDK(javaPath)) &&
      this.checkVersion(javaBinPath, options.version, options.maxVersion)
    );
  }

  /**
   * Checks if the given java binary meets the required version
   *
   * @param {string} javaBinPath path to java binary (java or java.exe)
   * @param {string} minRequired the minimum required version in the form "X.Y.Z"
   * @param {string} [maxRequired] the maximum required version in the form "X.Y.Z"
   * @returns {boolean} if the version is met
   */
  checkVersion(javaBinPath, minRequired, maxRequired) {
    // run java -version and capture output
    const result = spawnSync(javaBinPath, ['-version'], {
      input: '',
      timeout: 1000,
      encoding: 'utf8'
    });

    // command failed: this was not java
    if (result.status !== 0) {
      return false;
    }

    // not version requirement: return now
    if (minRequired === undefined && maxRequired === undefined) {
      return true;
    }

    // parse version
    const out = (result.stdout + '\n' + result.stderr);
    const r = out.match(/(\d+\.\d+\.\d+(_\d+)?)/);
    if (!r || r.length === 0) {
      return false;
    }
    const version = new SemVer(r[0]);

    // check version again min
    if (minRequired !== undefined && version.before(minRequired)) {
      this.logger(
        'Java binary (version ' + version + ') does not meet minimum required version "' +
        minRequired + '" ("' + javaBinPath + '").'
      );
      return false;
    }

    // check version again max
    if (maxRequired !== undefined && version.afterOrEqual(maxRequired)) {
      this.logger(
        'Java binary (version ' + version + ') does not meet maximum required version "' +
        maxRequired + '" ("' + javaBinPath + '").'
      );
      return false;
    }

    return true;
  }

  /**
   * Try to find the Java home.
   * - first, try JAVA_HOME
   * - On windows, try all possible "ProgramFiles" folders
   * - On unix, try to find "java" binary using PATH
   *
   * @param {object} [options] options
   * @param {string|undefined} [options.candidate] a candidate JAVA home path
   * @param {boolean|undefined} [options.jdk] whether we are looking for a JDK
   * @param {string|undefined} [options.version] the minimum version (in the form "X.Y.Z")
   * @param {string|undefined} [options.maxVersion] the maximum version (in the form "X.Y.Z")
   *
   * @returns {string|null} null if not found
   */
  findJava(options) {
    let javaPath;
    if (!options) {
      options = {};
    }

    // try candidate
    if (options.candidate !== undefined) {
      if (this.isJavaHome(options.candidate, options)) {
        return options.candidate;
      }
    }

    // try JAVA_HOME
    if (process.env['JAVA_HOME']) {
      javaPath = process.env['JAVA_HOME'];
      if (this.isJavaHome(javaPath, options)) {
        return javaPath;
      } else {
        this.logger(
          'JAVA_HOME defined but the folder is not a valid Java Home directory (' + javaPath + ')'
        );
        this.logger('Trying to auto-detect JAVA home directory ...');
      }
    }

    // windows heuristics
    if (isWindows) {

      const dir = this._windows(options);
      if (dir !== undefined) {
        return dir;
      }

    } else { // unix heuristics

      if (isMac) {
        const dir = this._osx(options);
        if (dir !== undefined) {
          return dir;
        }

      }

      const directories = process.env.PATH.split(':');
      for (let i = 0; i < directories.length; i++) {
        const javaBin = path.resolve(directories[i], 'java');
        if (_fileExists(javaBin)) {
          javaPath = path.resolve(directories[i], '..');
          if (this.isJavaHome(javaPath, options)) {
            return javaPath;
          }
        }
      }
    }

    return null;
  }

  /**
   * @param {object} [options] options
   * @param {string|undefined} [options.candidate] a candidate JAVA home path
   * @param {boolean|undefined} [options.jdk] whether we are looking for a JDK
   * @param {string|undefined} [options.version] the minimum version (in the form "X.Y.Z")
   * @param {string|undefined} [options.maxVersion] the maximum version (in the form "X.Y.Z")
   *
   * @returns {string|undefined}
   * @private
   */
  _windows(options) {
    // windows environment variables to locate ProgramFiles
    const programFilesEnvVars = ['ProgramW6432', 'ProgramFiles(x86)', 'ProgramFiles'];

    // name of the java dir in ProgramFiles
    const javaParentDirs = ['Java', 'java'];

    // scan ProgramFiles dirs
    for (let i = 0; i < programFilesEnvVars.length; ++i) {
      const programFiles = process.env[programFilesEnvVars[i]];
      if (!programFiles || !_folderExists(programFiles)) {
        continue;
      }

      // scan Java dirs in ProgramFiles dir
      for (let j = 0; j < javaParentDirs.length; ++j) {
        const javaParent = path.resolve(programFiles, javaParentDirs[j]);
        if (!_folderExists(javaParent)) {
          continue;
        }

        // scan dirs in JavaParent ("java" or "Java") dir
        const javaParentContent = fs.readdirSync(javaParent);
        for (let k = 0; k < javaParentContent.length; ++k) {
          // doesn't start with JRE or JDK, no
          if (!javaParentContent[k].match(/^(jre|jdk).+/i)) {
            continue;
          }

          // folder exists, we found java home :)
          const javaPath = path.resolve(javaParent, javaParentContent[k]);
          if (this.isJavaHome(javaPath, options)) {
            return javaPath;
          }
        }
      }
    }
  }

  /**
   * @param {object} [options] options
   * @param {string|undefined} [options.candidate] a candidate JAVA home path
   * @param {boolean|undefined} [options.jdk] whether we are looking for a JDK
   * @param {string|undefined} [options.version] the minimum version (in the form "X.Y.Z")
   * @param {string|undefined} [options.maxVersion] the maximum version (in the form "X.Y.Z")
   *
   * @returns {string|undefined}
   * @private
   */
  _osx(options) {

    // use java_home command
    const cmd = '$(dirname $(readlink /usr/bin/java' + (options.jdk ? 'c' : '') + '))/java_home';
    const dir = spawnSync(cmd, [], {shell: true}).stdout.toString().trim();
    if (dir && this.isJavaHome(dir, options)) {
      return dir;
    }

    // explore "well known" parent dirs
    const children = this._getChildren([
      '/Library/Java/JavaVirtualMachines', // regular location
      '/System/Library/Java/JavaVirtualMachines' // legacy locations (before java 1.7)
    ]);
    for (let i = 0; i < children.length; ++i) {
      const candidate = path.resolve(children[i], 'Contents', 'Home');
      if (this.isJavaHome(candidate, options)) {
        return candidate;
      }
    }
  }

  /**
   * Returns the merged array of all entries in dirs.
   *
   * @param {string[]} dirs
   * @returns {string[]}
   * @private
   */
  _getChildren(dirs) {
    let subDirs = [];
    for (let i = 0; i < dirs.length; ++i) {
      const parentDir = dirs[i];
      if (!_folderExists(parentDir)) {
        continue;
      }

      subDirs = subDirs.concat(
        fs
          .readdirSync(parentDir)
          .map(content => path.resolve(parentDir, content))
      );
    }
    return subDirs;
  }
}

module.exports = JavaHomeFinder;
