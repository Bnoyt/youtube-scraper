/**
 * Linkurious management script
 *
 * This script is usually invoked by menu.sh/menu.sh.command/menu.bat
 * The "menu" script will try to guess the unprivileged user Linkurious should
 * be started as and pass it to this script using the "--user" parameter.
 *
 * For usage information, invoke this script with the "help" argument.
 */
'use strict';

const path = require('path');
const os = require('os');
const spawnSync = require('child_process').spawnSync;
const fs = require('fs-extra');
const JavaHomeFinder = require('../lib/JavaHomeFinder');
const LKE = require('../server/services');
const Patty = require('pattypm/src/Patty');
const PattyUtils = require('pattypm/src/Utils');
const PattyError = require('pattypm/src/PattyError');
const Promise = require('bluebird');

// const
const COMMANDS = ['menu', 'status', 'start', 'stop', 'install', 'uninstall', 'help'];
const FLAGS = {
  'reset-config': 'Reset the configuration of Linkurious to defaults',
  'json': 'Output the result as JSON (only for "status")',
  'reset-manager-config': 'Reset the configuration of the manager to defaults',
  'no-browser': 'Don\'t open Linkurious in a new browser window (only for "start")'
};
const OPTIONS = ['user'];
const IS_WINDOWS = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';
const NODE_FILE = 'node' + (IS_WINDOWS ? '.exe' : '');
const SYSTEM_NODE_PATH = LKE.systemFile(NODE_FILE);
const SERVICE_LK = 'Linkurious Server';
const SERVICE_ES = 'Embedded ElasticSearch';
const MANAGER_PORT = 5891;
const MODE = 'production';
const MIN_JAVA_VERSION = '1.7.0';
const MAX_JAVA_VERSION = '1.8.999';

/**
 * @typedef {object} ManagerCommand
 * @property {string} name
 * @property {object<string>} options
 * @property {object<boolean>} flags
 */

/**
 *
 */
class LkManager {

  static run() {
    const m = new LkManager();
    m.main();
  }

  constructor() {
    this.configPath = LKE.dataFile('manager/manager.json');
    /** @type {Patty} */
    this.patty = undefined;
  }

  /**
   * @param {ManagerCommand} command
   * @returns {Promise}
   */
  initPattyConfig(command) {
    const reset = command.flags['reset-manager-config'];
    if (!fs.existsSync(this.configPath) || reset) {
      return LkManager.createConfig(this.configPath, LKE.isProdMode());
    }
  }

  /**
   * @param {string} absPath
   * @param {boolean} isProdMode
   * @param {boolean} [isWindows]
   * @returns {Promise.<Patty>}
   */
  static createConfig(absPath, isProdMode, isWindows) {
    if (isWindows === undefined) { isWindows = IS_WINDOWS; }

    const ramGb = os.totalmem() / (1024 * 1024 * 1024);
    let esRamGb;
    if (ramGb > 8) {
      esRamGb = 4;
    } else if (ramGb > 6) {
      esRamGb = 3;
    } else if (ramGb > 4) {
      esRamGb = 2;
    } else {
      esRamGb = 1;
    }

    return Patty.createConfigFile(absPath, {
      name: 'Linkurious',
      description: 'http://linkurio.us',
      autoStartServices: true,
      port: MANAGER_PORT,
      secret: 'graphs-are-awesome',
      processOwner: undefined,
      services: [
        {
          name: SERVICE_LK,
          home: '../../' + (isProdMode ? 'system' : 'linkurious-server'),
          maxRestarts: 0,
          noRestartExitCodes: [2, 3],
          restartDelay: 2000,
          binPath: 'node' + (isWindows ? '.exe' : ''),
          arguments: ['server/app.js', '-p'],
          env: {
            NODE_EXTRA_CA_CERTS: undefined
          }
        },
        {
          name: SERVICE_ES,
          disabled: true,
          maxRestarts: 100,
          restartDelay: 5000,
          home: '../../' + (isProdMode ? 'system' : 'linkurious-server'),
          binPath: (isWindows ? 'elasticsearch/bin/elasticsearch.bat' : '/bin/sh'),
          arguments: (isWindows ? [] : ['elasticsearch/bin/elasticsearch']),
          env: {
            // java home will be auto-detected later on
            JAVA_HOME: undefined,
            // we set the max heap size to 4GB by default
            ES_HEAP_SIZE: esRamGb + 'g'
          }
        }
      ]
    });
  }

  /**
   * @param {ManagerCommand} command
   * @returns {string|undefined}
   */
  findBestProcessOwner(command) {
    if (IS_WINDOWS) {
      return undefined;
    }
    let user;

    // --user command line parameter
    if (command.options.user) {
      if (!command.options.user.match(/^[A-Za-z0-9_-]+$/)) {
        throw PattyError.business(`Invalid user "${command.options.user}"`);
      }
      const id = this._exec(`id -u ${command.options.user}`);
      if (!id) {
        throw PattyError.business(`User "${command.options.user}" does not exist`);
      }
      return command.options.user;
    }

    // owner of the current directory (very safe)
    user = this._exec('ls -ld .');
    if (user) {
      user = user.split(/\s+/)[2];
      if (user) { return user; }
    }

    // SUDO_USER env variable (if we were run using SUDO, this is the original user)
    user = process.env.SUDO_USER;
    if (user) { return user; }

    // last resort: current user (the actual current process owner, could be root)
    return os.userInfo().username;
  }

  //noinspection JSMethodCanBeStatic
  /**
   * @returns {boolean}
   */
  useEmbeddedES() {
    return LKE.getConfig().get('dataSources', []).some(s => {
      return (s.index.vendor === 'elasticSearch') &&
        (s.index.port === 9201 || s.index.port === '9201') &&
        (s.index.host === 'localhost' || s.index.host === '127.0.0.1');
    });
  }

  /**
   * - Enable or disable Embedded Elasticsearch before startup
   * - EXTRA_CA_CERT_PATH for LKE based on LKe config
   *
   * @param {ManagerCommand} command
   * @returns {Promise}
   */
  updateManagerConfig(command) {
    // 1) set process owner
    return this._setProcessOwner(command).then(() => {

      // if the LKE config has errors, stop here
      if (this._lkeError) {
        return;
      }

      // 2) set enabled/disable Embedded-ES
      return this._setEsState().then(() => {
        // 3) set extra CA
        return this._setExtraCA();
      });

    }).catch(e => {
      this._lkeError = e;
    });
  }

  /**
   * @param {ManagerCommand} command
   * @returns {Promise}
   * @private
   */
  _setProcessOwner(command) {
    return Promise.resolve().then(() => {

      // if we a not root, we cannot set the process owner
      if (IS_WINDOWS || !process.getuid || process.getuid() !== 0) {
        return;
      }

      const user = this.findBestProcessOwner(command);
      if (user) {
        return this.patty.setProcessOwner(user);
      }
    });
  }

  /**
   * @returns {Promise}
   * @private
   */
  _setEsState() {
    const useES = this.useEmbeddedES();
    return this.patty.getServiceOptions(SERVICE_ES).then(so => {
      // don't fail if Embedded-Elasticsearch was removed from the manager config
      if (!so) { return; }

      // if ES is already disabled, skip
      if (so.disabled && !useES) { return; }

      // detect JAVA_HOME if ES is enabled
      if (useES) {
        const jhf = new JavaHomeFinder();
        const jhOptions = {version: MIN_JAVA_VERSION, maxVersion: MAX_JAVA_VERSION};

        // if (JAVA_HOME is not set) OR (JAVA_HOME is invalid) try to resolve JAVA_HOME
        if (!so.env.JAVA_HOME || !jhf.isJavaHome(so.env.JAVA_HOME, jhOptions)) {
          const javaHome = jhf.findJava(jhOptions);
          if (!javaHome) {
            return PattyError.businessP(
              `Could find JAVA_HOME (required: Java ${MIN_JAVA_VERSION} or later).`
              //+ '\nSee https://doc.linkurio.us/admin-manual/latest/requirements/#java-jdk'
            );
          }
          so.env.JAVA_HOME = javaHome;
        }
      }

      // update options
      so.disabled = !useES;
      return this.patty.setServiceOptions(SERVICE_ES, so);
    });
  }

  /**
   * @returns {Promise}
   * @private
   */
  _setExtraCA() {
    const extraCA = LKE.getConfig().get('advanced.extraCertificateAuthorities');
    return this.patty.getServiceOptions(SERVICE_LK).then(so => {
      // don't fail if Linkurious-Server was removed from the manager config
      if (!so) { return; }

      // if the extra CA did not change, skip
      if (extraCA === so.env.NODE_EXTRA_CA_CERTS) { return; }

      // update options
      so.env.NODE_EXTRA_CA_CERTS = extraCA;
      return this.patty.setServiceOptions(SERVICE_LK, so);
    });
  }

  //noinspection JSMethodCanBeStatic
  /**
   * Open LKE in the browser
   */
  openBrowser() {
    const url = LKE.getBaseURL();
    const options = {detached: true, stdio: 'ignore'};

    try {
      if (IS_WINDOWS) {
        spawnSync('cmd.exe', ['/C', 'START', url], options);
      } else if (IS_MAC) {
        options.shell = true;
        spawnSync('open', [url], options);
      } else {
        options.shell = true;
        spawnSync('xdg-open', [url], options);
      }
    } catch(e) {
      // ignore failures
    }
  }

  //noinspection JSMethodCanBeStatic
  /**
   * @param {string} command
   * @returns {string}
   * @private
   */
  _exec(command) {
    return spawnSync(command, [], {shell: true}).stdout.toString().trim();
  }

  /**
   * @returns {ManagerCommand}
   */
  parseCLA() {
    const args = process.argv.slice(2);

    const commands = [];
    const options = {};
    const flags = {};
    args.forEach(arg => {
      if (arg.indexOf('--') === 0) {
        const eqIndex = arg.indexOf('=');
        if (eqIndex > 0) {
          options[arg.substring(2, eqIndex)] = arg.substring(eqIndex + 1);
        } else {
          flags[arg.substr(2)] = true;
        }
      } else {
        commands.push(arg);
      }
    });

    const command = {
      name: commands.length ? commands[0] : 'menu',
      flags: flags,
      options: options
    };

    if (commands.length > 1 || !COMMANDS.includes(command.name)) {
      this.usage();
    }
    Object.keys(command.options).filter(option => !OPTIONS.includes(option)).forEach(() => {
      this.usage();
    });
    const legalFlags = Object.keys(FLAGS);
    Object.keys(command.flags).filter(flag => !legalFlags.includes(flag)).forEach(() => {
      this.usage();
    });

    return command;
  }

  /**
   * Die with an error message explaining the command line arguments usage.
   */
  usage() {
    // ${process.argv[1]}
    this.fatal(
      'Usage', `[${
        COMMANDS.join('|')}] [${
        Object.keys(FLAGS).map(f => `--${f}`).join('] [')}] [${
        OPTIONS.map(o => `--${o}=${o.toUpperCase()}`).join('] [')}]\n` +
        (Object.keys(FLAGS).map(f => ` --${f}: ${FLAGS[f]}.`).join('\n')) +
        '\nOnline documentation available at https://doc.linkurio.us/admin-manual/latest/'
    );
  }

  /**
   * @returns {Promise}
   */
  main() {
    let command;
    return Promise.resolve().then(() => {
      command = this.parseCLA();

      return this.loadLkeConfig(command);
    }).then(() => {
      if (LKE.isProdMode()) {
        this.ensureUpdater();
      }

      return this.initPattyConfig(command);
    }).then(() => {
      return Patty.loadConfig(this.configPath).catch(e => {
        return PattyError.businessP(
          `Could not load manager configuration (${this.configPath}). ` +
          'Try fixing the file or use --reset-manager-config',
          e
        );
      });
    }).then(patty => {
      this.patty = patty;
      return this.updateManagerConfig(command);
    }).then(() => {
      if (command.name !== 'menu' && command.name !== 'help' && this._lkeError) {
        this.fatal('Linkurious Manager error', this._lkeError);
      }

      switch (command.name) {
        case 'start': return this.doStart(command);
        case 'stop': return this.doStop();
        case 'restart': return this.doStop().then(() => this.doStart(command));
        case 'install': return this.doInstall();
        case 'uninstall': return this.doUninstall();
        case 'status': return this.doStatus(command);
        case 'menu': return this.doShowMenu();
        case 'help': return this.usage();
        default: this.usage();
      }
    }).catch(e => {
      this.fatal('Linkurious Manager error', e);
    });
  }

  doShowMenu() {
    return this.patty.showMenu(m => {
      // if there was an error, hide all menu items except "stop" and "leave this menu"
      if (this._lkeError) {
        return m.constructor.name === 'CloseItem' || m.constructor.name === 'StopItem' ;
      }
      return true;
    }).then(() => {
      if (this._lkeError) {
        if (!this._lkeError.stack && this._lkeError.message) {
          this.patty.menu.showError(PattyError.other(this._lkeError.message));
        } else {
          this.patty.menu.showError(PattyError.fix(this._lkeError));
        }
      }
    });
  }

  /**
   * @param {ManagerCommand} command
   * @returns {Promise}
   */
  doStart(command) {
    return this.patty.ensureStarted().then(started => {

      if (started) {
        const c = this.patty.enabledServiceCount;
        console.log(`"start": started manager and ${c} service${c > 1 ? 's' : ''}.`);
        return;
      }

      return this.patty.client.startServices().then(pids => {

        if (!pids.length) {
          console.log('"start": already running.');
        } else {
          console.log(`"start": started ${pids.length} service${pids.length > 1 ? 's' : ''}.`);
        }
      });
    }).then(() => {
      if (!command.flags['no-browser']) {
        this.openBrowser();
      }
    });
  }

  /**
   * @returns {Promise}
   */
  doStop() {
    return this.patty.ensureStopped().then(stopped => {
      if (stopped) {
        console.log('"stop": stopped Linkurious.');
      } else {
        console.log('"stop": already stopped.');
      }
    });
  }

  /**
   * @returns {Promise}
   */
  doInstall() {
    return this.patty.ensureInstalled().then(installed => {
      if (installed) {
        console.log('"install": installed Linkurious as a service.');
      } else {
        console.log('"install": already installed.');
      }
    });
  }

  /**
   * @returns {Promise}
   */
  doUninstall() {
    return this.patty.ensureUninstalled().then(uninstalled => {
      if (uninstalled) {
        console.log('"uninstall": uninstalled Linkurious from services.');
      } else {
        console.log('"uninstall": not installed.');
      }
    });
  }

  /**
   * @param {ManagerCommand} [command]
   * @returns {Promise}
   */
  doStatus(command) {
    return this.patty.getStatus().then(result => {
      if (command && command.flags.json) {
        this.log(JSON.stringify(result, null, ' '));
        return;
      }

      this.log(
        `Linkurious status:\n- Version: ${LKE.getVersion()
        }\n- Installed as a service: ${result.installed ? 'yes' : 'no'
        }${result.processOwner ? ('\n- Process owner: "' + result.processOwner + '"') : ''
        }\n- Manager state: ${result.started ? 'running' : 'stopped'
        }`);
      if (!result.services) { return; }
      result.services.forEach(service => {
        /** @type {ServiceState} */
        const s = service.state;
        let postFix = '';
        if (s.started) {
          postFix = ' (';
          postFix += `pid: ${s.pid}`;
          if (s.restarts) {
            postFix += `, restarts: ${s.restarts}`;
          }
          postFix += `, started: ${PattyUtils.humanize.relativeTime(s.startTime / 1000)}`;
          postFix += ')';
        } else if (s.stopTime) {
          postFix = ' (';
          postFix += `exit code: ${s.exitCode}`;
          if (s.restarts) {
            postFix += `, restarts: ${s.restarts}`;
          }
          postFix += `, stopped: ${PattyUtils.humanize.relativeTime(s.stopTime / 1000)}`;
          postFix += ')';
        }
        this.log(`- ${service.name}: ${
          s.disabled ? 'disabled' : (s.started ? 'running' : 'stopped')}${postFix}`);
      });
    });
  }

  /**
   * @param {object} command
   * @param {string} command.name
   * @param {object<string>} command.options
   * @param {object<boolean>} command.flags
   * @returns {Promise}
   */
  loadLkeConfig(command) {
    const noReject = ['menu', 'status', 'stop', 'help'].includes(command.name);

    return Promise.resolve().then(() => {
      LKE.init({mode: MODE, resetConfig: command.flags['reset-config']});
      LKE.getConfig().load();
    }).catch(e => {
      if (noReject) {
        this._lkeError = e;
        return;
      }
      return Promise.reject(e);
    });
  }

  /**
   *
   * @param {string} message
   * @param {string|Error} e
   */
  fatal(message, e) {
    if (e instanceof PattyError && e.type === 'business') {
      this.log(`\x1b[31m${message}\x1b[0m: ${e.fullMessage}`);
    } else {
      this.log(
        `\x1b[31m${message}\x1b[0m: ` +
        (typeof e === 'string'
          ? e
          : (e.fullStack ? e.fullStack : (e.stack ? e.stack : (e.message ? e.message : e)))
        )
      );
    }
    process.exit(1);
  }

  //noinspection JSMethodCanBeStatic
  /**
   * @param {string} m
   */
  log(m) {
    console.log(m);
  }

  //noinspection JSMethodCanBeStatic
  /**
   * Ensure that the updated folder is created (with a NodeJS binary copy)
   */
  ensureUpdater() {
    const systemStats = fs.statSync(path.resolve(__dirname, '..'));

    const updaterDirPath = path.resolve(__dirname, '..', 'updater');
    if (!fs.existsSync(updaterDirPath)) {
      fs.mkdirSync(updaterDirPath, 0o755);
      fs.chownSync(updaterDirPath, systemStats.uid, systemStats.gid);
    }

    // copy updater.js
    const updaterPath = path.resolve(updaterDirPath, 'updater.js');
    fs.copySync(path.resolve(__dirname, 'updater.js'), updaterPath, {clobber: true});
    fs.chownSync(updaterPath, systemStats.uid, systemStats.gid);

    const updaterNodePath = path.resolve(updaterDirPath, NODE_FILE);
    if (!fs.existsSync(updaterNodePath)) {
      // copy node binary
      fs.copySync(SYSTEM_NODE_PATH, updaterNodePath);
      fs.chownSync(updaterNodePath, systemStats.uid, systemStats.gid);
    }
  }
}

if (require.main === module) {
  LkManager.run();
} else {
  module.exports = LkManager;
}
