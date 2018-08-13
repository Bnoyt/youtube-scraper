/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2014-11-04.
 *
 * File: index.js
 * Description :
 */
'use strict';

// int libs
const http = require('http');
const https = require('https');

// ext libs
const Express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sessionStore = require('express-session');
const compression = require('compression');
const cookieParser = require('../../../lib/CookieParser');
const morgan = require('morgan');
const Promise = require('bluebird');
const onHeaders = require('on-headers');

// services
const LKE = require('../index');
const Config = LKE.getConfig();
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();
const Access = LKE.getAccess();
const Log = LKE.getLogger(__filename);

// locals
const certificate = require('./certificate');

// constants
const DOMAIN_PATTERN = '[a-z][a-z0-9\\-]*[a-z0-9]';
const ALLOW_ORIGIN_WILDCARD_RE = new RegExp(
  '^(https?://)?(\\*\\.)((?:' + DOMAIN_PATTERN + '\\.)+[a-z0-9]+(?::[0-9]+)?)$'
);
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const GLOBAL_HEADERS = {
  // Tell client to only send a Referer header in same-origin requests
  'Referrer-Policy': 'same-origin'
};

class WebServerService {

  /**
   */
  constructor() {
    /** @type {Express} */
    this.app = undefined;

    /** @type {httpServer} */
    this.httpServer = undefined;

    /** @type {httpServer} */
    this.httpsServer = undefined;
  }

  /**
   * @returns {Express} app
   */
  createApp() {
    const app = Express();

    app.disable('x-powered-by');
    app.set('env', LKE.options.mode);

    // enable compression
    app.use(compression());

    // every request will fail if no response is sent after REQUEST_TIMEOUT_MS
    app.use((req, res, next) => {
      req.setTimeout(REQUEST_TIMEOUT_MS);
      next();
    });

    // logging: use morgan for formatting and forward to our logger
    app.use(morgan('common', {
      stream: {write: message => Log.debug(message.slice(0, -1))},
      skip: (req, _res) => req.originalUrl.indexOf('/api/') < 0
    }));

    // Key used to store the cookie in the browser
    const cookieName = 'linkurious.session';

    // sessions : set cookie parser
    app.use(cookieParser(Config.get('server.cookieSecret'), cookieName, (cookies, cb) => {
      // Here we decide which cookie to use if more than one is defined. Issue #804
      Promise.map(cookies, cookie => {
        return new Promise(resolve => {
          Access.sessionStore.get(cookie, (err, res) => {resolve(res);});
        });
      }).then(sessions => {
        // return the first cookie for which a session is defined
        for (const s of sessions) {
          if (s && s.id) {
            return cb(s.id);
          }
        }
        cb();
      });
    }));

    // sessions : use memory store
    const sessionOptions = {
      secret: Config.get('server.cookieSecret'),
      resave: false,
      saveUninitialized: true,
      name: cookieName,
      rolling: false,
      store: Access.sessionStore,
      cookie: {
        // cookies are set https and http
        secure: false,
        // cookies can be set via javascript
        httpOnly: false,
        // cookies are set for all paths
        path: '/',
        // cookies are wiped when the browser is closed (session cookie)
        maxAge: null
      }
    };
    const cookieDomain = Config.get('server.cookieDomain');
    if (cookieDomain && cookieDomain !== 'localhost' && cookieDomain !== '127.0.0.1') {
      sessionOptions.cookie.domain = cookieDomain;
    }

    app.use((req, res, next) => {
      // Headers for all requests
      res.set(GLOBAL_HEADERS);

      onHeaders(res, function() {
        // avoid to do a set-cookie if the session is invalid on the server
        if (
          Utils.noValue(this.req.session) ||
          Utils.noValue(this.req.session.userId) && Utils.noValue(this.req.session.twoStageAuth)
        ) {
          this.removeHeader('set-cookie');
        }
      });

      next();
    });

    app.use(sessionStore(sessionOptions));
    app.use('/api', Access.checkUserSession.bind(Access));
    app.use('/api', Access.checkApplication.bind(Access));

    // parse JSON body (limit POST/PUT size to 2MB)
    app.use(bodyParser.json({
      // deflated (compressed) bodies will be inflated
      inflate: true,
      //  maximum request body size (2MB)
      limit: '2000kb',
      // will only accept arrays and objects;
      strict: true
    }));

    // parse x-www-form-urlencoded body
    app.use(bodyParser.urlencoded({extended: true}));

    app.use((req, res, nextRoute) => {
      if (req.path.match(/\/api/)) {
        if (LKE.isTestMode() || LKE.isDevMode()) {
          const requestStart = Date.now();

          /**
           * Respond to an API call.
           * Legacy method, use `api.respond` instead.
           *
           * @param {number} code the HTTP response code
           * @param {object} data the data to send as HTTP response
           * @deprecated
           */
          res.apiReturn = function(code, data) {
            res.setHeader('X-Response-Time', (Date.now() - requestStart) + 'ms');

            if (typeof code === 'object' && code.code && code.key) {
              res.status(code.code).json({
                key: code.key,
                message: code.message
              });
            } else {
              res.status(code).json(data);
            }
          };
        }
      } else {
        // allow any origin for non-API resources
        res.setHeader('Access-Control-Allow-Origin', '*');
      }

      nextRoute();
    });

    return app;
  }

  /**
   * @returns {Promise}
   */
  start() {
    const portHttp = Config.get('server.listenPort', 3000);
    const useHttps = Config.get('server.useHttps', false);
    const portHttps = Config.get('server.listenPortHttps', 3443);

    // listen for clients
    return Promise.resolve().then(() => {
      this.app = this.createApp();

      // load CORS module
      this._configureCORS();

      // load API routes
      require('./routesLoader')(this.app);

      if (!useHttps) {
        return;
      }
      // read or generate SSL certificate
      return certificate.getKeyPair().then(certificate => {
        // create + start HTTPS server
        this.httpsServer = https.createServer(certificate, this.app);
        return this._listen(this.httpsServer, portHttps, true);
      });
    }).then(() => {
      // create + start HTTP server
      this.httpServer = http.createServer(this.app);
      return this._listen(this.httpServer, portHttp, false);
    }).then(() => {
      return LKE.getStateMachine().set('WebServer', 'ready',
        `The Web server is listening on port ${portHttp} (HTTP)` +
        (useHttps ? ` and port ${portHttps} (HTTPS)` : '')
      );
    });
  }

  _configureCORS() {
    // see https://github.com/expressjs/cors
    const corsOptions = {
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      allowHeaders: [
        'X-Requested-With', 'Content-Type', 'Content-Length', 'Accept', 'Authorization'
      ],
      credentials: true
    };

    // fix parameter
    let allowOrigin = Config.get('server.allowOrigin');
    if (Utils.noValue(allowOrigin)) {
      corsOptions.origin = false;
      Log.info('WebServer CORS: disabled.');
    } else if (allowOrigin === '*') {
      corsOptions.origin = true;
      Log.info('WebServer CORS: allowing all origins (*).');
    } else {
      if (typeof allowOrigin === 'string') {
        allowOrigin = [allowOrigin];
      }
      if (Array.isArray(allowOrigin)) {
        corsOptions.origin = [];
        allowOrigin.forEach(origin => {
          let m;
          if ((m = origin.match(ALLOW_ORIGIN_WILDCARD_RE)) !== null) {
            const scheme = m[1] || 'https?://';
            if (m[2] === '*.') {
              const pattern = `^${scheme}(${DOMAIN_PATTERN}\\.)*${m[3].replace(/\./g, '\\.')}$`;
              corsOptions.origin.push(new RegExp(pattern));
            }
          } else if (origin.match(/^https?:\/\//)) {
            corsOptions.origin.push(origin);

          } else {
            corsOptions.origin.push('http://' + origin);
            corsOptions.origin.push('https://' + origin);
          }
        });

        corsOptions.origin.forEach(o => {
          Log.info('WebServer CORS: allowing origin ' +
            (o instanceof RegExp ? '[pattern] ' + o.toString() : '"' + o + '"')
          );
        });
      } else {
        throw Errors.business(
          'invalid_configuration',
          'Configuration key "server.allowOrigin" must be "*", a domain or an array of domains.'
        );
      }
    }
    this.app.use(cors(corsOptions));
  }

  /**
   * @param {httpServer} server
   * @param {number} port
   * @param {boolean} https
   * @returns {Promise}
   * @private
   */
  _listen(server, port, https) {
    Utils.check.integer('server.listenPort' + (https ? 'Https' : ''), port, 1, 65535);
    return new Promise((resolve, reject) => {
      server.listen(port, () => {
        resolve();
      }).on('error', e => {
        // error handler for ALL uncaught server exceptions
        if (e && e.errno && e.errno === 'EADDRINUSE') {
          LKE.getStateMachine().set('WebServer', 'port_busy');
          reject(Errors.technical('port_busy',
            'The WebServer HTTP' + (https ? 'S' : '') + ' port (' + port + ') is already used.'
          ));
        } else if (e && e.errno && e.errno === 'EACCES') {
          LKE.getStateMachine().set('WebServer', 'port_restricted');
          reject(Errors.technical('port_restricted',
            'The WebServer HTTP' + (https ? 'S' : '') + ' port (' + port + ') needs root access. ' +
            'You could use a higher port and redirect it to ' + port + ' using "iptables".'
          ));
        } else {
          LKE.getStateMachine().set('WebServer', 'error');
          reject(e);
        }
      });
    });
  }
}

module.exports = new WebServerService();
