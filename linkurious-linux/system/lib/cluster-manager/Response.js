/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-03-03.
 */
'use strict';

const Serializable = require('./Serializable');

class Response extends Serializable {
  constructor(jobId) {
    super(['jobId', 'success', 'result', 'error']);
    this.jobId = jobId;
    this.success = undefined;
    this.result = undefined;
    this.error = undefined;
  }

  withResult(result) {
    this.success = true;
    this.result = result;
    return this;
  }

  withError(error) {
    this.success = false;
    this.error = error;
    return this;
  }
}

module.exports = Response;
