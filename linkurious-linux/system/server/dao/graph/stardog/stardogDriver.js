/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-07-26.
 */
'use strict';

// locals
const SparqlDriver = require('../sparqlDriver');

class StardogDriver extends SparqlDriver {
  constructor(connector, graphOptions, connectorData) {
    super(connector, graphOptions, connectorData, {
      supportBlankNodeLabels: true,
      implementGetStatements: false
    });
  }
}

module.exports = StardogDriver;
