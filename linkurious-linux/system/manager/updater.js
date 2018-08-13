/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-06-23.
 */
'use strict';

const fs = require('fs-extra'),
  path = require('path'),
  unzip = require('unzip'),
  ObjectUpdater = require('../lib/ObjectUpdater');

const LK_DIR = path.resolve(__dirname, '..', '..');

const ROOT_FILES = process.platform === 'win32'
  ? ['menu.bat', 'start.bat', 'stop.bat']
  : (process.platform === 'darwin'
    ? ['menu.sh.command', 'start.sh.command', 'stop.sh.command']
    : ['menu.sh', 'start.sh', 'stop.sh']
  );

/**
 * CurrentInstallInfo
 *
 * @typedef {object} CurrentInstallInfo
 * @property {string} os Current OS ("windows", "linux" or "osx")
 * @property {boolean} enterprise whether this is a Linkurious Enterprise edition
 * @property {string} elasticsearch ElasticSearch version (SemVer)
 * @property {string} node NodeJS version (SemVer)
 * @property {string} linkurious Linkurious version (SemVer)
 */

/**
 * LinkuriousArchiveInfo
 *
 * @typedef {object} LinkuriousArchiveInfo
 * @property {boolean} enterprise whether the archive is a Linkurious Enterprise edition
 * @property {string} filename Name of the Linkurious archive
 * @property {string} os Name of the OS this archive is intended for ("windows", "osx" or "linux")
 * @property {string} version Linkurious version (SemVer)
 */

/**
 * @param {string} linkuriousRoot
 * @constructor
 */
function Updater(linkuriousRoot) {
  this.linkuriousRoot = linkuriousRoot;
  this.logFilePath = this.getPath('data/logs/update.log');
}

Updater.prototype = {

  LK_ARCHIVE_RE: /^Linkurious-(Starter-)?(windows|linux|osx)-v(\d+\.\d+\.\d+)\.zip/i,

  CONFIG_FILE_PATH: 'data/config/production.json',

  CONFIG_DIR_PATH: 'data/config',

  UPDATE_TMP: 'tmp.update',

  /**
   * Returns the absolute path of a dir in the current Linkurious root
   *
   * @param {string} dirName
   * @returns {string} the absolute path of `dirName` inside of the current Linkurious root
   */
  getPath: function(dirName) {
    return path.resolve(this.linkuriousRoot, dirName);
  },

  _pressEnterToContinue: function(cb) {
    console.log('\n[PRESS ENTER TO CONTINUE ...]');
    try {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once('data', () => {
        process.stdin.setRawMode(false);
        cb();
      });
    } catch(e) {
      cb();
    }
  },

  _error: function(error) {
    if (typeof error === 'object' && typeof error.stack === 'string') {
      this._tryLogToFile(error.stack.split(/\n\s+/), true);
    }
    this._log('Error: ' + error.message, true, false);
  },

  /**
   * Log a message to standard output
   *
   * @param {string} m message
   * @param {boolean} [exit=false] whether to exit the process after printing message
   * @param {boolean} [cleanup=false] whether to clean up the temporary directory
   * @private
   */
  _log: function(m, exit, cleanup) {
    // 1) if exit was required, first try to cleanup
    if (cleanup) { this._cleanUp(); }
    // 2) log the message to stdout
    console.log(new Date().toISOString() + ' | ' + (exit && !cleanup ? '! ' : '* ') + m);
    // 3) try to log to a file
    this._tryLogToFile(m, exit);
    // 4) if exit was required, actually exit now
    if (exit) {
      this._pressEnterToContinue(() => {
        process.exit(0);
      });
    }
  },

  _tryLogToFile: function(m, exit) {
    try {
      fs.appendFileSync(
        this.logFilePath,
        JSON.stringify({date: (new Date()).toISOString(), message: m, exit: !!exit}) + '\n'
      );
    } catch(e) {
      // ignore logfile errors
    }
  },

  /**
   * List linkurious archive file names in a directory
   *
   * @returns {string[]} file names of linkurious archives found in `dir`
   * @private
   */
  _listLkArchives: function() {
    const self = this;
    return fs.readdirSync(self.linkuriousRoot).filter(filename => {
      return self.LK_ARCHIVE_RE.test(filename);
    });
  },

  /**
   * Extract version info from linkurious archive file names.
   *
   * @param {string[]} lkArchives
   * @returns {LinkuriousArchiveInfo[]}
   * @private
   */
  _getLkArchivesInfo: function(lkArchives) {
    const self = this;
    let match, info;
    return lkArchives.map(filename => {
      match = self.LK_ARCHIVE_RE.exec(filename.toLowerCase());
      if (!match) { return null; }
      info = {
        enterprise: match[1] !== 'starter-',
        os: match[2],
        version: match[3],
        filename: filename
      };
      return info;
    }).filter(info => { return info !== null; });
  },

  /**
   * Get current installed version info.
   *
   * @returns {CurrentInstallInfo}
   */
  getCurrentInfo: function() {
    const systemPath = this.getPath('system');
    const versions = fs.readJsonSync(path.resolve(systemPath, 'versions.json'));
    const enterprise = !!fs.readJsonSync(path.resolve(systemPath, 'release.json')).enterprise;
    const platform = process.platform;
    const os = platform === 'darwin' ? 'osx' : platform === 'win32' ? 'windows' : 'linux';
    return {
      os: os,
      enterprise: enterprise,
      node: versions.node,
      linkurious: versions.linkurious,
      elasticsearch: versions.elasticsearch
    };
  },

  /**
   * Find the best update candidate from the current version.
   * Returns the newest Linkurious version in the `lkArchivesInfo` if it's newer than the current.
   *
   * @param {CurrentInstallInfo} currentInfo
   * @param {LinkuriousArchiveInfo[]} lkArchivesInfo
   * @returns {LinkuriousArchiveInfo|undefined} a matching update candidate (or undefined if none)
   * @private
   */
  _findUpdateCandidate: function(currentInfo, lkArchivesInfo) {
    const self = this;
    /**
     * @type {Array.<LinkuriousArchiveInfo>}
     */
    const sortedCandidates = lkArchivesInfo.filter(info => {
      return info.os === currentInfo.os && info.enterprise === currentInfo.enterprise;
    }).sort((a, b) => {
      // sort latest first
      return self.compareSemVer(b.version, a.version);
    });
    if (!sortedCandidates.length) { return undefined; }
    if (this.compareSemVer(sortedCandidates[0].version, currentInfo.linkurious) > 0) {
      return sortedCandidates[0];
    }
    return undefined;
  },

  /**
   * Compare two SemVer strings
   *
   * @param {string} x a string in the format "a.b.c"
   * @param {string} y a string in the format "d.e.f"
   * @returns {number} similar to (x-y): <0 if x<y, >0 if x<y, 0 if x=y
   */
  compareSemVer: ObjectUpdater.prototype.compareSemVer,

  /**
   * Updates file at `"[targetPath]/[original]"` with file found at `"[sourcePath]/[original]"`
   * Keeps a backup of the file in `"[targetPath]/[original].old"`.
   *
   * @param {string} sourcePath the source directory where the new version of the file can be found
   * @param {string} targetPath the target directory where the file must be updated
   * @param {string} original the name of the file to swap
   * @private
   */
  backupAndUpdate: function(sourcePath, targetPath, original) {
    this._backup(targetPath, original);
    this._update(sourcePath, targetPath, original);
  },

  /**
   * @param {string} sourcePath the source directory where the new version of the file can be found
   * @param {string} targetPath the target directory where the file must be updated
   * @param {string} original the name of the file to swap
   * @private
   */
  _update(sourcePath, targetPath, original) {
    this._log('Updating "' + original + '"');
    fs.copySync(
      path.resolve(sourcePath, original),
      path.resolve(targetPath, original)
    );
  },

  _backup: function(rootPath, filename, copy) {
    const originalPath = path.resolve(rootPath, filename);
    const backupPath = path.resolve(rootPath, filename + '.old');
    if (fs.existsSync(backupPath)) { fs.removeSync(backupPath); }
    this._log('Backing up "' + filename + '" to "' + filename + '.old"');
    if (copy) {
      fs.copySync(originalPath, backupPath);
    } else {
      fs.renameSync(originalPath, backupPath);
    }
  },

  /**
   * Looks for `*.old` files and folders in the `"[linkuriousRoot]/system"` folder
   * and renames them, removing the `".old"` suffix.
   *
   * Does the same in `"linkuriousRoot]/data/config"` folder.
   */
  restorePrevious: function() {
    this._restoreContents(this.getPath('system'));
    this._restoreContents(this.getPath('data/config'));
  },

  /**
   * @param {string} rootPath a folder that contains backups (.old files or folders)
   * @private
   */
  _restoreContents: function(rootPath) {
    const self = this;
    fs.readdirSync(rootPath).filter(filename => {
      return filename.match(/\.old$/);
    }).forEach(backup => {
      self._restoreBackup(rootPath, backup);
    });
  },

  _restoreBackup: function(rootPath, backup) {
    const original = backup.replace(/\.old/, '');
    const originalPath = path.resolve(rootPath, original);
    this._log('Restoring "' + backup + '" to "' + original + '"');
    if (fs.existsSync(originalPath)) { fs.removeSync(originalPath); }
    fs.renameSync(path.resolve(rootPath, backup), originalPath);
  },

  _cleanUp: function() {
    const updateTmp = this.getPath(this.UPDATE_TMP);
    fs.removeSync(updateTmp);
  },

  /**
   * Migrate the Linkurious configuration after an update (uses manager/configUpdates.json)
   *
   * @param {string} targetVersion target Linkurious version
   * @param {string} defaultCurrentVersion in case the current version is not set in the config
   */
  migrateConfig: function(targetVersion, defaultCurrentVersion) {
    const configPath = this.getPath(this.CONFIG_FILE_PATH);
    const config = fs.readJsonSync(configPath);
    const updates = fs.readJsonSync(this.getPath('system/manager/configUpdates.json'));

    // backup config
    this._backup(this.getPath(this.CONFIG_DIR_PATH), 'production.json', true);

    // migrate config
    const self = this;
    let currentVersion = config.version || defaultCurrentVersion;
    const configUpdater = new ObjectUpdater(config);
    configUpdater.applyUpdates(updates, targetVersion).forEach(update => {
      self._log('Migrated configuration from v' + currentVersion + ' to v' + update.version + '.');
      currentVersion = update.version;
    });

    fs.writeFileSync(configPath, JSON.stringify(config, null, ' '));
  },

  /**
   * Run the update (throw exceptions on failure)
   */
  _run: function() {
    const self = this;

    if (self.linkuriousRoot === undefined) {
      throw new Error('no Linkurious folder specified for the update');
    }

    self._log('UPDATING LINKURIOUS');

    // 0) check if an unfinished update was interrupted, rollback to previous state if so
    const updateTmp = self.getPath(self.UPDATE_TMP);
    if (fs.existsSync(updateTmp)) {
      self._log('The previous update did not finish properly, restoring previous version ...');
      self.restorePrevious();
      const versions = fs.readJsonSync(self.getPath('system/versions.json'));
      return self._log(
        'Linkurious version ' + versions.linkurious + ' was restored successfully.', true, true
      );
    }
    fs.emptyDirSync(updateTmp);

    // 1) get current LK version
    const currentInfo = self.getCurrentInfo();
    self._log('Current version: ' + currentInfo.linkurious);

    // 2) look for a linkurious archive in the root dir (zip matching a pattern)
    const lkArchives = self._listLkArchives();
    if (!lkArchives.length) {
      return self._log('No update-archives found in folder: ' + self.linkuriousRoot, true, true);
    }

    // 3) check all versions linkurious in /updates
    const lkArchivesInfo = self._getLkArchivesInfo(lkArchives);

    // 4) if the latest version is not newer than the current version, exit
    const updateArchiveInfo = self._findUpdateCandidate(currentInfo, lkArchivesInfo);
    if (!updateArchiveInfo) {
      return self._log(
        'No newer update-archive was found in folder: ' + self.linkuriousRoot,
        true,
        true
      );
    }
    self._log('Found an update-archive for version ' + updateArchiveInfo.version);

    // 5) extract the update archive
    const updateArchive = self.getPath(updateArchiveInfo.filename);
    if (!fs.existsSync(updateArchive)) {
      return self._log('Update-archive file was not found (' + updateArchive + ')', true, true);
    }
    self._log('Extracting update-archive ...');
    const sourceStream = fs.createReadStream(updateArchive);
    const targetStream = unzip.Extract({path: updateTmp});
    sourceStream.pipe(targetStream);
    sourceStream.on('end', () => {
      self._log('The update-archive was unzipped successfully');
      const source = path.resolve(updateTmp, fs.readdirSync(updateTmp)[0], 'system');
      const target = self.getPath('system');
      const updateVersions = fs.readJsonSync(path.resolve(source, 'versions.json'));

      // 6.a) update system files
      self.backupAndUpdate(source, target, 'node_modules');
      self.backupAndUpdate(source, target, 'lib');
      self.backupAndUpdate(source, target, 'server');
      self.backupAndUpdate(source, target, 'manager');
      self.backupAndUpdate(source, target, 'versions.json');
      self.backupAndUpdate(source, target, 'release.json');

      // 6.b) update root files
      const sourceRoot = path.resolve(source, '..');
      const targetRoot = path.resolve(target, '..');
      ROOT_FILES.forEach(filename => {
        self._update(sourceRoot, targetRoot, filename);
      });

      // 7) if the node version changed, replace node
      if (currentInfo.node !== updateVersions.node) {
        const nodeFile = 'node' + (process.platform === 'win32' ? '.exe' : '');
        self.backupAndUpdate(source, target, nodeFile);
      } else {
        self._log('NodeJS binary is already up-to-date');
      }

      // 8) if the ElasticSearch version changed, replace ElasticSearch
      if (currentInfo.elasticsearch !== updateVersions.elasticsearch) {
        self.backupAndUpdate(source, target, 'elasticsearch');
      } else {
        self._log('ElasticSearch is already up-to-date');
      }

      // 9) migrate config
      self.migrateConfig(updateArchiveInfo.version, currentInfo.linkurious);

      // 10) require the second stage updater (from the new version) and run it (if defined)
      let SecondStageUpdater;
      try {
        SecondStageUpdater = require(path.resolve(
          self.linkuriousRoot, 'system/manager/secondStageUpdater'
        ));
        self._log('Second stage updater found');
      } catch(e) {
        // nothing to do, secondStageUpdater is not there
        self._log('Second stage updater not required');
      }

      if (SecondStageUpdater) {
        self._log('Running second stage updater');
        const secondStageUpdaterInstance = new SecondStageUpdater(self.linkuriousRoot);
        secondStageUpdaterInstance.run();
      }

      // 11) cleanup and exit
      return self._log(
        'Linkurious was successfully updated to version ' + updateArchiveInfo.version + '.',
        true,
        true
      );
    });
  },

  /**
   * Runs the update, prints an error message before failing.
   *
   * @param {any[]} args
   */
  run: function(args) {
    try {
      fs.ensureFileSync(this.logFilePath);

      if (args && args.length === 1 && args[0] === 'config') {
        this.migrateConfig(this.getCurrentInfo().linkurious, undefined);
      } else {
        this._run();
      }
    } catch(e) {
      return this._error(e);
    }
  }
};

const updater = new Updater(LK_DIR);
updater.run(process.argv.slice(2));
