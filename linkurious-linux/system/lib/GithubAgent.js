/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2015-08-21.
 */
'use strict';

const request = require('request');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');

class GitHubAgent {

  /**
   * @param {string} ownerName
   * @param {string} repoName
   * @param {string} apiKey
   * @param {string} [host="api.github.com"]
   * @param {number} [port=443]
   */
  constructor(ownerName, repoName, apiKey, host, port) {
    this.ownerName = ownerName;
    this.repoName = repoName;
    this.apiKey = apiKey;
    this.host = host || 'api.github.com';
    this.port = parseInt(port) || 443;
  }

  /**
   * Get an URL relative to the current repo
   *
   * @param {string} [path]
   * @returns {string} an URL
   */
  repoUrl(path) {
    return this.url(`repos/${this.ownerName}/${this.repoName}${'/' + path || ''}`);
  }

  /**
   * Get an URl relative to the host root
   *
   * @param {string} [path]
   * @returns {string} an URL
   */
  url(path) {
    return `https://${this.host}${this.port == 443 ? '' : ':' + this.port}/${path || ''}`;
  }

  /**
   * @param {string} message
   * @param {Error|string|object} [cause]
   * @returns {Error}
   * @private
   */
  _error(message, cause) {
    let causeText = '\nCause:\n  ';

    if (cause === undefined) {
      causeText = '';
    } else if (cause instanceof Error) {
      if (cause.stack) {
        causeText += cause.stack + '\n';
      } else if (cause.message) {
        causeText += cause.message;
      } else {
        causeText += cause;
      }
    } else if (typeof cause === 'object' && cause !== null) {
      causeText += JSON.stringify(cause, null, ' ');
    } else {
      causeText = cause + '';
    }

    return new Error(message + causeText, 'error');
  }

  /**
   * @param {string} message
   * @param {Error|string|object} [cause]
   * @returns {Promise<Error>}
   * @private
   */
  _errorP(message, cause) {
    return Promise.reject(this._error(message, cause));
  }

  /**
   * @param {object} options
   * @param {string} options.url
   * @param {number} [options.expectedStatus=200] expected response status
   * @param {string} [options.method="get"] used HTTP request method
   * @param {object} [options.body] the post/put body, send as JSON
   * @param {object} [options.query] the query string arguments
   * @param {object} [options.headers]
   * @returns {Promise.<object|Error>}
   * @private
   */
  _request(options) {
    return new Promise((resolve, reject) => {
      this._rawRequest(options, (err, res) => {
        if (err) {
          reject(this._error(err));
        }
        if (res.statusCode !== options.expectedStatus) {
          reject(this._error(
            'HTTP ' + res.statusCode + ' (expected ' + options.expectedStatus + ')',
            res.body
          ));
        }
        resolve(res);
      });
    });
  }

  _rawRequest(options, cb) {
    if (!options) {
      return this._errorP('"options" is required');
    }
    if (!options.url) {
      return this._errorP('"options.url" is required');
    }
    if (!options.method) { options.method = 'get'; }
    if (!options.expectedStatus) { options.expectedStatus = 200; }

    const requestOptions = {
      method: options.method,
      uri: options.url,
      body: options.body,
      qs: options.query,
      json: true,
      headers: _.assignIn({
        'User-Agent': 'Github-Agent',
        'Accept': 'application/vnd.github.v3+json'
      }, options.headers || {})
    };
    if (this.apiKey) {
      requestOptions.auth = {
        pass: 'x-oauth-basic',
        user: this.apiKey
      };
    }

    return request(requestOptions, cb);
  }

  /**
   * @param {string} url
   * @param {object} query
   * @param {*[]} results
   * @returns {Promise.<*[]>}
   * @private
   */
  _page(url, query, results) {
    console.log('Page request: ' + url);
    return this._request({url: url, query: query}).then(res => {
      results = results.concat(res.body);
      if (res.headers.link) {
        const urls = res.headers.link.match(/^<([^>]+)>; rel="next"/);
        if (urls) {
          const nextUrl = urls[1];
          return this._page(nextUrl, query, results);
        }
      }
      return results;
    });
  }

  /**
   * @param {string} path repository-relative path of the list
   * @param {object} query query parameters
   * @returns {Promise.<*[]>}
   * @private
   */
  _getList(path, query) {
    return this._page(this.repoUrl(path), query, []);
  }

  /**
   * Get all issues for this repo
   *
   * @param {string} [milestoneName] optional milestone to filter on
   * @param {boolean} [pullRequests=false] whether to include pull requests
   * @returns {Promise.<{
   *   number:number,
   *   title:string,
   *   labels:string[],
   *   state:string,
   *   milestone:string,
   *   pr:boolean,
   *   description:string
   * }[]>}
   */
  getIssues(milestoneName, pullRequests) {
    return this._getList('milestones', {state: 'all'}).then(milestones => {
      const milestone = _.find(milestones, m => m.title.indexOf(milestoneName) === 0);
      if (!milestone) {
        return Promise.reject(
          'Milestone not found (name: ' + milestoneName + ', repo: ' + this.repoName + ')'
        );
      }
      return milestone.number;
    }).then(milestoneNumber => {
      return this._getList('issues', {
        milestone: milestoneNumber,
        state: 'all',
        assignee: '*'
      });
    }).then(rawIssues => {
      return rawIssues.map(rawIssue => {
        return {
          number: rawIssue.number,
          title: rawIssue.title,
          description: rawIssue.body,
          labels: rawIssue.labels.map(label => label.name),
          state: rawIssue.state,
          milestone: rawIssue.milestone ? rawIssue.milestone.title : undefined,
          pr: !!rawIssue['pull_request']
        };
      }).filter(issue => !issue.pr || pullRequests);
    });
  }

  /**
   * List all releases in the current repository.
   *
   * @returns {Promise}
   */
  getReleases() {
    return this._getList('releases', {});
  }

  /**
   * Download the result of a query to a file
   *
   * @param {string} path
   * @param {object} [requestOptions]
   * @param {string} filePath
   * @param {object} [fileOptions]
   * @returns {Promise}
   */
  download(path, requestOptions, filePath, fileOptions) {
    if (!requestOptions) { requestOptions = {}; }
    if (!fileOptions) { fileOptions = {flags: 'w+', defaultEncoding: 'binary'}; }

    return new Promise((resolve, reject) => {
      const targetStream = fs.createWriteStream(filePath, fileOptions).on('error', e => {
        reject(this._error('Error writing to "' + filePath + '"', e));
      });

      // allow custom URLs to be preset in options
      if (requestOptions.url === undefined) {
        requestOptions.url = this.repoUrl(path);
      }
      this._rawRequest(requestOptions).on('error', e => {
        reject(this._error('Error requesting "' + path + '"', e));
      }).on('response', res => {
        if (res.statusCode !== requestOptions.expectedStatus) {
          reject(this._error(
            'HTTP ' + res.statusCode + ' (expected ' + requestOptions.expectedStatus + ')',
            res.body
          ));
        }
      }).pipe(targetStream).on('finish', () => resolve());
    });
  }

  /**
   * @param {string} filePath
   * @param {object} [requestOptions]
   */
  upload(filePath, requestOptions) {
    if (!requestOptions) { requestOptions = {}; }
    if (!requestOptions.method) { requestOptions.method = 'post'; }
    if (!requestOptions.expectedStatus) { requestOptions.expectedStatus = 201; }

    if (!requestOptions.headers || requestOptions.headers['Content.Length'] === undefined) {
      const stats = fs.statSync(filePath);
      requestOptions.headers['Content-Length'] = stats.size;
    }

    const fileOptions = {flags: 'r'};

    let responseBody = '';
    return new Promise((resolve, reject) => {
      const sourceStream = fs.createReadStream(filePath, fileOptions).on('error', e => {
        reject(this._error('Error reading from "' + filePath + '"', e));
      });

      sourceStream.pipe(this._rawRequest(requestOptions).on('error', e => {
        reject(this._error('Error requesting "' + path + '"', e));
      }).on('response', res => {
        res.on('end', () => {
          if (res.statusCode !== requestOptions.expectedStatus) {
            reject(this._error(
              'HTTP ' + res.statusCode + ' (expected ' + requestOptions.expectedStatus + ')',
              GitHubAgent.tryParseJson(responseBody)
            ));
          } else {
            resolve();
          }
        });
      }).on('data', data => {
        responseBody += data.toString('utf8');
      }));
    });
  }

  /**
   * @param {number} assetId
   * @param {string} targetFile
   * @returns {Promise}
   */
  downloadAsset(assetId, targetFile) {
    return this.download(
      'releases/assets/' + assetId,
      {headers: {'Accept': 'application/octet-stream'}},
      targetFile
    );
  }

  /**
   * @param {string} targetDirectory
   * @param {function} releaseFilter
   * @param {function} assetFilter
   * @returns {Promise}
   */
  downloadAllAssets(targetDirectory, releaseFilter, assetFilter) {
    if (!releaseFilter) { releaseFilter = () => true; }
    if (!assetFilter) { assetFilter = () => true; }

    const targetPath = path.resolve(targetDirectory);
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath);
    }

    return this.getReleases().then(releases => {
      return releases.filter(releaseFilter);
    }).map(release => {
      const releaseFolder = path.resolve(targetPath, release['tag_name'] + ' ' + release.name);
      if (!fs.existsSync(releaseFolder)) {
        console.log('Creating folder: ' + releaseFolder);
        fs.mkdirSync(releaseFolder);
      }

      const changeLog = path.resolve(releaseFolder, 'CHANGELOG.md');
      if (!fs.existsSync(changeLog)) {
        console.log('Creating changelog: ' + changeLog);
        fs.writeFileSync(changeLog, release.body, {flag: 'w+'});
      }

      const releaseFile = path.resolve(releaseFolder, 'release.json');
      if (!fs.existsSync(releaseFile)) {
        console.log('Creating release file: ' + releaseFile);
        fs.writeFileSync(releaseFile, JSON.stringify(release, null, ' '), {flag: 'w+'});
      }

      const assetsToDownload = release.assets.filter(assetFilter);
      return Promise.map(assetsToDownload, asset => {
        const assetFile = path.resolve(releaseFolder, asset.name);
        if (!fs.existsSync(assetFile)) {
          console.log('Downloading asset: ' + asset.id + ' to ' + assetFile);
          return this.downloadAsset(asset.id, assetFile);
        }
      }, {concurrency: 1});
    }, {concurrency: 1});
  }

  /**
   * @param {number} id
   * @returns {Promise.<Object>}
   */
  getReleaseById(id) {
    return this._request({url: this.repoUrl('releases/' + id)}).get('body');
  }

  /**
   * @param {string} tagName
   * @returns {Promise.<Object>}
   */
  getReleaseByTagName(tagName) {
    return this._request({url: this.repoUrl('releases/tags/' + tagName)}).get('body');
  }

  /**
   * @param {object} release
   * @param {string} release.tag_name
   * @param {string} [release.target_commitish="master"]
   * @param {string} [release.name]
   * @param {string} [release.body]
   * @param {boolean} [release.draft]
   * @param {boolean} [release.prerelease]
   * @returns {Promise.<Object>}
   */
  createRelease(release) {
    const fields = ['tag_name', 'target_commitish', 'name', 'body', 'draft', 'prerelease'];
    return this._request({
      method: 'post',
      url: this.repoUrl('releases'),
      body: _.pick(release, fields),
      expectedStatus: 201
    }).get('body');
  }

  /**
   * @param {object} release
   * @param {number} [release.id]
   * @param {string} [release.tag_name]
   * @param {string} filePath File to upload
   * @param {object} asset
   * @param {string} asset.name The asset filename
   * @param {string} [asset.contentType="application/zip"]
   * @param {string} [asset.label]
   * @returns {Promise}
   */
  uploadReleaseAsset(release, filePath, asset) {
    if (!asset.contentType) {
      asset.contentType = 'application/zip';
    }

    if (!release) { throw new Error('"release" is required'); }
    const releasePromise = release['tag_name']
      ? this.getReleaseByTagName(release['tag_name'])
      : this.getReleaseById(release.id);

    return releasePromise.then(release => {
      const existingAsset = release.assets.find(a => a.name === asset.name);
      if (existingAsset) {
        console.log('asset already present: ' + asset.name);
        return;
      }

      let uploadUrl = release['upload_url'];
      uploadUrl = uploadUrl.replace(/\{\?[^}]+}/, '');

      return this.upload(filePath, {
        url: uploadUrl,
        headers: {'Content-Type': asset.contentType},
        query: {
          name: asset.name,
          label: asset.label
        }
      });
    }).catch(e => {
      return this._errorP('Could not upload asset "' + filePath + '"', e);
    });
  }

  /**
   * @param {string} s
   * @returns {*}
   */
  static tryParseJson(s) {
    try {
      return JSON.parse(s);
    } catch(e) {
      return s;
    }
  }
}

module.exports = GitHubAgent;
