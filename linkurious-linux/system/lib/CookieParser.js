/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-03-31.
 */
'use strict';

const signature = require('cookie-signature');

const pairSplitRegExp = /; */;

/**
 * Parse a cookie header to retrieve all the values associated to the key `cookieName`.
 * Cookies are supposed to be URL-encoded.
 *
 * @param {string} str
 * @param {string} cookieName
 * @returns {string[]}
 */
function _parse(str, cookieName) {
  const cookies = [];

  const pairs = str.split(pairSplitRegExp);

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    let eqIdx = pair.indexOf('=');

    // skip things that don't look like key=value
    if (eqIdx < 0) {
      continue;
    }

    const key = pair.substr(0, eqIdx).trim();
    let val = pair.substr(++eqIdx, pair.length).trim();

    // skip things that don't have `key` equal to `cookieName`

    if (key !== cookieName) {
      continue;
    }

    // remove quotes if there are
    if (val[0] == '"') {
      val = val.slice(1, -1);
    }

    // try to decode the cookie
    try {
      val = decodeURIComponent(val);
    } catch(e) {
      // no op
    }

    cookies.push(val);
  }

  return cookies;
}

/**
 * Express middleware used to parse cookies and solve the double cookie issue. If more than one
 * cookie is defined for the same `cookieName`, the `cookiePicker` is called to chose which cookie
 * to use.
 * Only signedCookies are supported (secret is required).
 * Only one `cookieName` is supported.
 *
 * @param {string}   secret
 * @param {string}   cookieName
 * @param {function} cookiePicker
 * @returns {function}
 */
module.exports = (secret, cookieName, cookiePicker) => {
  return (req, res, next) => {
    const rawCookies = req.headers.cookie;
    req.secret = secret;
    req.cookies = Object.create(null);
    req.signedCookies = Object.create(null);

    if (!rawCookies) {
      return next();
    }

    const cookies = _parse(rawCookies, cookieName);

    const signedCookies = cookies.map(signedCookie =>
      signature.unsign(signedCookie.slice(2), secret) // slice 2 to remove 's:' prefix
    );

    cookiePicker(signedCookies, cookie => {
      req.signedCookies[cookieName] = cookie;

      next();
    });
  };
};
