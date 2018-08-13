/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 */
'use strict';

// external libs
const _ = require('lodash');
const Promise = require('bluebird');

// services
const LKE = require('../../index');
const Access = LKE.getAccess();
const Utils = LKE.getUtils();
const UserDAO = LKE.getUserDAO();

// locals
const api = require('../api');

module.exports = function(app) {
  /**
   * @api {post} /api/auth/login Login
   * @apiName Login
   * @apiGroup Auth
   * @apiVersion 1.0.0
   *
   * @apiDescription Log a user in by e-mail or username and password and return it.
   *
   * @apiParam {string} usernameOrEmail User e-mail or username
   * @apiParam {string} password        User password
   *
   * @apiUse ReturnUser
   */
  app.post('/api/auth/login', api.respond(req => {
    return Access.login(
      req.param('usernameOrEmail'),
      req.param('password'),
      req
    );
  }, 200));

  /**
   * @api {post} /api/auth/loginRedirect Login and redirect
   * @apiName LoginRedirect
   * @apiGroup Auth
   * @apiVersion 1.0.0
   *
   * @apiDescription Log a user in by e-mail or username and password and redirect him to a given path.
   *
   * @apiParam {string} usernameOrEmail  User e-mail or username
   * @apiParam {string} password         User password
   * @apiParam {string} [path="/"]       Path to redirect to
   * @apiParam {string} [errorPath=path] Path to redirect to in case of error
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 302 Redirect
   *   Location: /
   */
  app.post('/api/auth/loginRedirect', api.respond((req, res) => {
    let path = req.param('path');
    if (Utils.noValue(path)) { path = '/'; }

    let errorPath = req.param('errorPath');
    if (Utils.noValue(errorPath)) { errorPath = path; }

    return Access.login(
      req.param('usernameOrEmail'),
      req.param('password'),
      req
    ).return(path).catch(err => {
      // in case of error
      res.setHeader('Error', JSON.stringify(err));
      return errorPath;
    });
  }, 302, false, true));

  /**
   * @api {get} /api/auth/logout Logout
   * @apiName Logout
   * @apiGroup Auth
   * @apiPermission authenticated
   * @apiVersion 1.0.0
   *
   * @apiDescription Log the current user out.
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 204 No Content
   */
  app.get('/api/auth/logout', api.respond(req => {
    return Access.logout(req);
  }, 204));

  /**
   * @api {get} /api/auth/authenticated Check if authenticated
   * @apiName IsAuthenticated
   * @apiGroup Auth
   * @apiVersion 1.0.0
   *
   * @apiDescription Check if a user is authenticated.
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 204 No Content
   *
   * @apiErrorExample {json} Error-Response:
   *   HTTP/1.1 401 Unauthorized
   *   {
   *     "key": "unauthorized",
   *     "message": "Unauthorized."
   *   }
   *
   */
  app.get('/api/auth/authenticated', api.respond(req => {
    return Access.isAuthenticated(req);
  }, 204));

  /**
   * @api {get} /api/auth/me Get current user
   * @apiName GetCurrentUser
   * @apiGroup Auth
   * @apiPermission authenticated
   * @apiVersion 1.0.0
   *
   * @apiDescription Get the profile of the current user.
   *
   * @apiUse ReturnUser
   *
   * @apiErrorExample {json} Error-Response:
   *   HTTP/1.1 401 Unauthorized
   *   {
   *     "key": "unauthorized",
   *     "message": "Unauthorized."
   *   }
   */
  app.get('/api/auth/me', api.respond(req => {
    // authorized for all apps
    const publicUser = Access.getCurrentUser(req);

    // req.user contains the access rights, we want to filter them out
    publicUser.groups = publicUser.groups.map(
      group => /**@type {PublicGroup}*/ (_.pick(group, ['id', 'name', 'builtin', 'sourceKey']))
    );

    return Promise.resolve(publicUser);
  }));

  /**
   * @api {patch} /api/auth/me Update current user
   * @apiName UpdateCurrentUser
   * @apiGroup Auth
   * @apiPermission authenticated
   * @apiPermission __guest
   * @apiVersion 1.0.0
   *
   * @apiDescription Update the current user.
   *
   * @apiParam {string} [username]    New username
   * @apiParam {string} [email]       New e-mail
   * @apiParam {string} [password]    New password
   * @apiParam {object} [preferences] New user preferences
   *
   * @apiUse ReturnUser
   */
  app.patch('/api/auth/me', api.respond(req => {
    // check we are not an application
    const user = Access.getUserCheck(req, null);
    return UserDAO.updateUser(
      user.id,
      {
        username: req.param('username'),
        email: req.param('email'),
        password: req.param('password'),
        preferences: req.param('preferences')
      },
      user
    );
  }));

  /**
   * @api {get} /api/auth/sso/login Login via OAuth2 or SAML2
   * @apiName LoginSSO
   * @apiGroup Auth
   * @apiVersion 1.0.0
   *
   * @apiDescription Redirect the user to the OAuth2 or SAML2 provider for authorization.
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 302 Redirect
   */
  app.get('/api/auth/sso/login', api.respond(req => {
    return Access.getAuthenticateURLSSO(req);
  }, 302));

  /**
   * @apiIgnore This API is not shown in the API documentation because it's meant to be called only by the OAuth2/SAML2 provider
   * @api {all} /api/auth/sso/return Login via OAuth2 or SAML2 (return callback)
   * @apiName LoginReturnSSO
   * @apiGroup Auth
   * @apiVersion 1.0.0
   *
   * @apiDescription Log a user in via OAuth2 or SAML2 (to be called only after a redirection from
   * the OAuth2/SAML2 provider). It's a GET for OAuth2 and a POST for SAML2.
   *
   * @apiParam {string} [code]         Response by the OAuth2 provider
   * @apiParam {string} [state]        State used by the OAuth2 provider
   * @apiParam {string} [SAMLResponse] Response by the SAML2 provider
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 302 Redirect
   */
  app.all('/api/auth/sso/return', api.respond(req => {
    return Access.handleAuthenticateURLResponseSSO(
      req.param('code') || req.param('SAMLResponse'),
      req.param('state'),
      req
    ).return('/');
  }, 302));
};
