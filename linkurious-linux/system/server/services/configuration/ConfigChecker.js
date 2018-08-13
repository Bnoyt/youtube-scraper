/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-04-20.
 */
'use strict';

// external libs
const _ = require('lodash');

// services
const LKE = require('../index');
const Utils = LKE.getUtils();
const Errors = LKE.getErrors();

// locals
const VisualizationChecker = require('../business/VisualizationChecker');

const CONFIG_PROPERTIES = {
  // data source array
  dataSources: {
    required: true,
    arrayItem: {
      required: true,
      properties: {
        name: {type: 'string'},
        manualSourceKey: {check: (key, value) => Utils.checkSourceKey(value)},
        readOnly: {type: 'boolean'},
        graphdb: {
          required: true,
          type: 'object',
          check: (key, value) => ConfigChecker.checkGraph(key, value)
        },
        index: {
          required: true,
          type: 'object',
          check: (key, value) => ConfigChecker.checkIndex(key, value)
        }
      }
    }
  },

  // cross-sources parameters
  advanced: {
    required: true,
    properties: {
      maxPathLength: {check: ['integer', 1]},
      supernodeThreshold: {check: ['integer', 1]},
      shortestPathsMaxResults: {check: ['integer', 1]},
      connectionRetries: {check: ['posInt']},
      pollInterval: {check: ['integer', 1]},
      indexationChunkSize: {check: ['integer', 1]},
      expandThreshold: {check: ['integer', 1]},
      searchAddAllThreshold: {check: ['integer', 1]},
      searchThreshold: {check: ['integer', 1]},
      minSearchQueryLength: {check: ['integer', 1]},
      rawQueryTimeout: {check: ['integer', 1]},
      layoutWorkers: {check: 'posInt'},
      defaultFuzziness: {check: ['number', 0, 1]},
      extraCertificateAuthorities: {check: 'file'},
      obfuscation: {type: 'boolean'}
    }
  },

  // internal database config
  db: {
    required: true,
    properties: {
      name: {required: true, check: 'nonEmpty'},
      username: {check: 'nonEmpty'},
      password: {check: 'nonEmpty'},
      options: {
        type: 'object',
        check: (key, value) => ConfigChecker.checkDbOptions(key, value)
      }
    }
  },

  // backend http server configuration
  server: {
    required: true,
    properties: {
      listenPort: {required: true, check: 'port'}, // defaults to 3000

      clientFolder: {required: true, check: 'nonEmpty'}, // folder in which to look for client public files
      cookieSecret: {check: 'nonEmpty'},
      allowOrigin: {type: ['string', 'array']},

      domain: {check: 'nonEmpty'}, // domain used for widget URLs and sso URLs
      publicPortHttp: {check: 'integer'}, // public http port (needed when using a reverse-proxy)
      publicPortHttps: {check: 'integer'}, // public https port (needed when using a reverse-proxy)
      cookieDomain: {check: 'nonEmpty'}, // domain used for cookies

      // https
      listenPortHttps: {check: 'port'}, // defaults to 3443
      useHttps: {type: 'boolean'},
      forceHttps: {type: 'boolean'},
      certificateFile: {check: 'nonEmpty'}, // custom certificate public-key file
      certificateKeyFile: {check: 'nonEmpty'}, // custom certificate private-key file
      certificatePassphrase: {check: 'nonEmpty'} // custom certificate pass-phrase
    }
  },

  defaultPreferences: {
    required: true,
    type: 'object',
    check: (key, value) => ConfigChecker.checkPreferences(key, value)
  },
  guestPreferences: {
    required: true,
    type: 'object',
    check: (key, value) => ConfigChecker.checkPreferences(key, value, true)
  },

  // Captions using by default in visualizations
  defaultCaptions: {
    properties: {
      nodes: {check: (key, value) => VisualizationChecker.checkCaptions(key, value)},
      edges: {check: (key, value) => VisualizationChecker.checkCaptions(key, value)}
    }
  },

  alerts: {
    properties: {
      maxMatchTTL: {check: ['integer', 0]},
      maxMatchesLimit: {check: ['integer', 1]},
      maxRuntimeLimit: {check: ['integer', 1]},
      maxConcurrency: {check: ['integer', 1]}
    }
  },

  // audit-trail configuration
  auditTrail: {
    required: true,
    properties: {
      enabled: {type: 'boolean'},
      logFolder: {check: 'nonEmpty'}, // relative to data
      fileSizeLimit: {check: ['integer', 100 * 1024]},
      strictMode: {type: 'boolean'},
      logResult: {type: 'boolean'},
      mode: {values: ['r', 'w', 'rw']}
    }
  },

  // authentication configuration
  access: {
    required: true,
    properties: {
      floatingLicenses: {check: ['integer', 1]},
      authRequired: {type: 'boolean'}, // authentication enabled/disabled
      guestMode: {type: 'boolean'},
      defaultPage: {type: 'string'}, // "dashboard", "workspace"
      defaultPageParams: {type: 'object'}, // {}
      dataEdition: {type: 'boolean'}, // data edition enabled/disabled
      widget: {type: 'boolean'}, // widget enabled/disabled
      loginTimeout: {check: ['integer', 60]}, // seconds
      externalUsersAllowedGroups: {arrayItem: {type: ['string', 'number']}},
      externalUserDefaultGroupId: {check: 'integer'}, // default group for LDAP/AD/Azure/etc. users

      externalUsersGroupMapping: {
        anyProperty: {
          check: (key, value) => {
            Utils.check.type(key, value, ['number', 'array']);
            if (Array.isArray(value)) {
              Utils.check.intArray(key, value);
            } else {
              Utils.check.integer(key, value);
            }
          }
        }
      },

      // @backward-compatibility old Azure AD configuration
      azureActiveDirectory: {
        deprecated: 'Use "access.oauth2" with provider "azure" instead'
      },

      // Microsoft AD configuration
      msActiveDirectory: {
        properties: {
          enabled: {type: 'boolean'},
          url: {check: 'nonEmpty'},
          baseDN: {check: 'nonEmpty'},
          domain: {check: 'nonEmpty'}
        }
      },

      // OpenLDAP configuration
      ldap: {
        properties: {
          enabled: {required: true, type: 'boolean'},
          url: {required: true, check: 'nonEmpty'},
          bindDN: {requiredIf: 'bindPassword', type: 'string'},
          bindPassword: {requiredIf: 'bindDN', type: 'string'},
          baseDN: {required: true,
            check: (key, value) => {
              if (typeof value === 'string') {
                Utils.check.nonEmpty(key, value);
              } else {
                Utils.check.stringArray(key, value, 1, undefined, true);
              }
            }
          },
          usernameField: {required: true, check: 'nonEmpty'},
          emailField: {check: 'nonEmpty'},
          groupField: {check: 'nonEmpty'},
          // @backward-compatibility old way to filter authorized groups in LDAP
          authorizedGroups: {deprecated: 'Use "access.externalUsersAllowedGroups" instead'},
          tls: {
            required: false,
            policy: 'inclusive',
            // actually accepts for all `tls.connect` options
            // see https://nodejs.org/api/tls.html#tls_tls_connect_options_callback
            properties: {
              // whether to reject servers with self signed certificates
              rejectUnauthorized: {type: 'boolean'}
            }
          }
        }
      },

      // saml2 configuration
      saml2: {
        properties: {
          enabled: {required: true, type: 'boolean'},
          url: {required: true, check: 'nonEmpty'},
          identityProviderCertificate: {required: true, check: 'file'},
          groupAttribute: {check: 'nonEmpty'}
        }
      },

      // oauth2 configuration
      oauth2: {
        properties: {
          enabled: {required: true, type: 'boolean'},
          provider: {required: true, check: 'nonEmpty'},
          authorizationURL: {required: true, check: 'url'},
          tokenURL: {required: true, check: 'url'},
          clientID: {required: true, check: 'nonEmpty'},
          clientSecret: {required: true, check: 'nonEmpty'},
          openidconnect: {
            properties: {
              userinfoURL: {requiredIf: 'groupClaim', check: 'url'},
              scope: {requiredIf: 'groupClaim', check: 'nonEmpty'},
              groupClaim: {check: 'nonEmpty'}
            }
          },
          azure: {
            properties: {
              tenantID: {check: 'nonEmpty'}
            }
          }
        }
      }
    }
  },

  // leaflet tile layers configuration
  leaflet: {
    required: true,
    arrayItem: {
      required: true,
      properties: {
        name: {required: true, check: 'nonEmpty'}, // layer display name
        urlTemplate: {required: true, check: 'httpUrl'}, // tile URL template
        attribution: {required: true, check: 'nonEmpty'}, // displayed copyright notice
        minZoom: {required: true, check: ['integer', 1]},
        maxZoom: {required: true, check: ['integer', 1, 30]},
        thumbnail: {required: true, check: 'string'}, // layer preview image (relative to client public folder)
        subdomains: {check: 'nonEmpty'}, // list of letters/number for URL template sub-domains
        id: {check: 'nonEmpty'}, // layer ID (for MapBox)
        accessToken: {check: 'nonEmpty'}, // layer access token (for MapBox)
        overlay: {type: 'boolean'} // whether this layer is an overlay
      }
    }
  },

  // ogma configuration
  ogma: {
    required: true,
    properties: {
      render: {required: true, arrayItem: {values: ['webgl', 'canvas', 'svg']}},
      plugins: {required: true, arrayItem: {values: ['dagre']}},
      settings: {
        required: true,
        properties: {
          selection: {
            required: true,
            properties: {
              manual: {required: true, type: 'boolean'},
              outline: {required: true, type: 'boolean'},
              edgeTextBackgroundColor: {required: true, check: 'cssColor'},
              nodeTextBackgroundColor: {required: true, check: 'cssColor'},
              nodeOuterStrokeColor: {required: true, check: 'cssColor'},
              nodeTextFontStyle: {required: true, values: ['italic', 'bold', 'none']},
              edgeColor: {required: true, check: 'cssColor'}
            }
          },
          camera: {
            required: true,
            properties: {
              defaultZoomModifier: {required: true, check: ['number', 0]},
              maxZoom: {required: true, check: ['number', 0]},
              minZoom: {required: true, check: ['number', 0]}
            }
          },
          halos: {
            required: true,
            properties: {
              nodeSize: {required: true, check: ['number', 0]},
              edgeSize: {required: true, check: ['number', 0]},
              nodeColor: {required: true, check: 'cssColor'},
              edgeColor: {required: true, check: 'cssColor'},
              nodeClustering: {required: true, type: 'boolean'},
              nodeClusteringMaxRadius: {required: true, check: ['number', 0]},
              nodeStrokeWidth: {required: true, check: ['number', 0]},
              nodeStrokeColor: {required: true, check: 'cssColor'}
            }
          },
          hover: {
            required: true,
            properties: {
              outline: {required: true, type: 'boolean'},
              edgeTextBackgroundColor: {required: true, check: 'cssColor'},
              nodeTextBackgroundColor: {required: true, check: 'cssColor'},
              nodeOuterStrokeColor: {required: true, check: 'cssColor'},
              nodeTextFontStyle: {required: true, values: ['italic', 'bold', 'none']},
              highlightEdgeExtremities: {required: true, type: 'boolean'},
              edgeColor: {required: true, check: 'cssColor'},
              edges: {required: true, type: 'boolean'}
            }
          },
          badges: {
            required: true,
            properties: {
              defaultColor: {required: true, check: 'cssColor'},
              defaultStrokeColor: {required: true, check: 'cssColor'},
              defaultFont: {required: true, check: 'nonEmpty'},
              threshold: {required: true, check: ['number', 0]},
              hideStrokeOnHiddenContent: {required: true, type: 'boolean'},
              defaultTextColor: {required: true, check: 'cssColor'}
            }
          },
          cameraInteractions: {
            required: true,
            properties: {
              zoomOnDoubleClick: {required: true, type: 'boolean'},
              rotationEnabled: {required: true, type: 'boolean'}
            }
          },
          pulses: {
            required: true,
            properties: {
              pulseDuration: {required: true, check: ['number', 0]},
              pulseInterval: {required: true, check: ['number', 0]},
              numberOfPulses: {required: true, check: ['number', 0]},
              nodePulseStartColor: {required: true, check: 'cssColor'},
              nodePulseEndColor: {required: true, check: 'cssColor'},
              nodePulseStartRatio: {required: true, check: ['number', 0]},
              nodePulseEndRatio: {required: true, check: ['number', 0]},
              nodePulseWidth: {required: true, check: ['number', 0]},
              edgePulseStartColor: {required: true, check: 'cssColor'},
              edgePulseEndColor: {required: true, check: 'cssColor'},
              edgePulseStartRatio: {required: true, check: ['number', 0]},
              edgePulseEndRatio: {required: true, check: ['number', 0]},
              edgePulseWidth: {required: true, check: ['number', 0]}
            }
          },
          render: {
            required: true,
            properties: {
              backgroundColor: {required: true, check: 'cssColor'},
              imgCrossOrigin: {required: true, values: ['anonymous', 'use-credentials']},
              webGLAntiAliasing: {required: true, values: ['super-sampling', 'native', 'none']},
              webGLFontSamplingSize: {required: true, check: ['number', 0]}
            }
          },
          captor: {
            required: true,
            properties: {
              nodeTexts: {required: true, type: 'boolean'},
              edgeTexts: {required: true, type: 'boolean'},
              edgeErrorMargin: {required: true, check: ['number', 0]}
            }
          },
          lasso: {
            required: true,
            properties: {
              strokeColor: {required: true, check: 'cssColor'},
              strokeWidth: {required: true, check: ['number', 0]}
            }
          },
          shapes: {
            required: true,
            properties: {
              defaultNodeColor: {required: true, check: 'cssColor'},
              defaultEdgeColor: {required: true, check: 'cssColor'},
              nodeOuterStrokeWidth: {required: true, check: ['number', 0]},
              nodeInnerStrokeColor: {required: true, check: 'cssColor'},
              defaultEdgeShape: {
                required: true, values: ['arrow', 'dashed', 'dotted', 'line', 'tapered']
              }
            }
          },
          icons: {
            required: true,
            properties: {
              defaultFont: {required: true, check: 'nonEmpty'},
              defaultColor: {required: true, check: 'cssColor'}
            }
          },
          texts: {
            required: true,
            properties: {
              fontFamily: {required: true, check: 'nonEmpty'},
              nodeFontColor: {required: true, check: 'cssColor'},
              nodeFontSize: {required: true, check: ['integer', 1]},
              nodeSizeThreshold: {required: true, check: ['number', 0]},
              nodeTextAlignment: {
                required: true, values: ['right', 'left', 'top', 'bottom', 'center']
              },
              edgeFontSize: {required: true, check: ['integer', 1]},
              edgeSizeThreshold: {required: true, check: ['number', 0]},
              nodeMaxTextLineLength: {required: true, check: ['integer', 1]},
              preventOverlap: {required: true, type: 'boolean'},
              nodeBackgroundMargin: {required: true, check: ['number', 0]},
              nodeBackgroundColor: {required: true, check: 'cssColor'},
              edgeBackgroundColor: {required: true, check: 'cssColor'}
            }
          }
        }
      }
    }
  },

  // default styles
  defaultStyles: {
    required: true,
    properties: {
      nodes: {type: 'object'},
      edges: {type: 'object'}
    }
  },

  // palettes config
  palette: {
    properties: {
      nodes: {
        properties: {
          qualitative: {
            // keys: name of qualitative palette
            anyProperty: {
              // keys: size of the palette
              anyProperty: {
                // color OR array of hex colors
                check: (key, value) => {
                  if (typeof value === 'string') {
                    return Utils.check.cssColor(key, value);
                  } else {
                    return Utils.check.property(key, value, {
                      arrayItem: {check: 'hexColor'}
                    });
                  }
                }
              }
            }
          },
          sequential: {
            // keys: size of the palette
            anyProperty: {
              // array of hex colors
              arrayItem: {check: 'hexColor'}
            }
          },
          icons: {
            // keys: name of the property on which the icon is mapped
            anyProperty: {
              // keys: value of the property for this icon
              anyProperty: {
                properties: {
                  font: {check: 'nonEmpty'},
                  color: {check: 'hexColor'},
                  scale: {check: ['number', 0]},
                  content: {check: 'nonEmpty'}
                }
              }
            }
          },
          images: {
            // by image palette name (.e.g. "crunchbase")
            anyProperty: {
              // by property/node-category/edge-type value (e.g. "CITY" for a node-category scheme, or "Paris" for a property scheme)
              anyProperty: {
                properties: {
                  // URL of the image
                  url: {required: true, type: 'string'},
                  // scaling ratio of the image
                  scale: {type: 'number'},
                  // clip ratio of the image (?)
                  clip: {type: 'number'}
                }
              }
            }
          }
        }
      },
      edges: {
        properties: {
          qualitative: {
            // keys: name of qualitative palette
            anyProperty: {
              // keys: size of the palette
              anyProperty: {
                // color OR array of hex colors
                check: (key, value) => {
                  if (typeof value === 'string') {
                    return Utils.check.cssColor(key, value);
                  } else {
                    return Utils.check.property(key, value, {
                      arrayItem: {check: 'hexColor'}
                    });
                  }
                }
                //arrayItem: {check: 'hexColor'}
              }
            }
          },
          sequential: {
            // keys: size of the palette
            anyProperty: {
              // array of hex colors
              arrayItem: {check: 'hexColor'}
            }
          }
        }
      }
    }
  },

  // first run flag
  firstRun: {type: 'boolean'},

  // config version
  version: {type: 'string'},

  // Unique Id of the customer in Linkurious
  customerId: {
    type: 'string',
    check: Utils.validateCustomerId
  },

  // used in tests
  testSetting: {}
};

class ConfigChecker {

  /**
   * @param {any} config
   * @throws {LkError} the configuration validation error, if any.
   */
  static check(config) {
    Utils.check.properties('configuration', config, CONFIG_PROPERTIES);
  }

  /**
   * @param {string} key
   * @param {any}    dbOptions
   */
  static checkDbOptions(key, dbOptions) {
    Utils.check.values(key + '.dialect', dbOptions.dialect,
      ['sqlite', 'mysql', 'mariadb', 'mssql']);

    if (dbOptions.dialect === 'sqlite') {
      Utils.check.properties(key, dbOptions, {
        dialect: {values: [dbOptions.dialect]},
        storage: {check: 'nonEmpty'}
      });
    } else {
      Utils.check.properties(key, dbOptions, {
        dialect: {values: [dbOptions.dialect]},
        host: {check: 'nonEmpty'},
        port: {check: 'port'}
      });
    }
  }

  /**
   * @param {string}  key
   * @param {any}     preferences
   * @param {boolean} [isGuestPreferences]
   */
  static checkPreferences(key, preferences, isGuestPreferences) {
    let properties = {
      locale: {required: true, check: (key, value) => {
        Utils.check.string(key, value, true, true, 5, 5); // valid example: "en-US"
        // if 3rd character is not '-' throw an error
        if (value[2] !== '-') {
          throw Errors.business('invalid_parameter', `"${key}" must be a valid locale.`);
        }
      }},
      uiWorkspaceSearch: {required: true, type: 'boolean'},
      uiExport: {required: true, type: 'boolean'},
      uiDesign: {required: true, type: 'boolean'},
      uiLayout: {required: true, type: 'boolean'},
      uiCollapseNode: {required: true, type: 'boolean'},
      uiCaptionConfig: {required: true, type: 'boolean'},
      uiTooltipConfig: {required: true, type: 'boolean'},
      uiVisualizationPanel: {required: true, type: 'boolean'},
      uiNodeList: {required: true, type: 'boolean'},
      uiEdgeList: {required: true, type: 'boolean'},
      uiTooltip: {required: true, type: 'boolean'},
      uiSimpleLayout: {required: true, type: 'boolean'}
    };

    if (!isGuestPreferences) {
      // These preferences are not considered in guest mode
      properties = _.merge(properties, {
        pinOnDrag: {required: true, type: 'boolean'},
        uiEdgeSearch: {required: true, type: 'boolean'},
        uiShortestPath: {required: true, type: 'boolean'},
        uiScreenshot: {required: true, type: 'boolean'}
      });
    }

    Utils.check.properties('configuration', preferences, properties);
  }

  /**
   * @param {string} key
   * @param {any}    graphdb
   */
  static checkGraph(key, graphdb) {
    Utils.check.values(key + '.vendor', graphdb.vendor, [
      'neo4j', 'allegroGraph', 'dse', 'janusGraph', 'stardog'
    ]);

    let properties = {
      vendor: {required: true, values: [graphdb.vendor]},
      latitudeProperty: {check: 'nonEmpty'},
      longitudeProperty: {check: 'nonEmpty'},

      // Not actually mandatory, but every GraphDAO "should" allowSelfSigned
      allowSelfSigned: {type: 'boolean'}
    };

    const alternativeIdsProperties = {
      alternativeEdgeId: {check: 'nonEmpty'},
      alternativeNodeId: {check: 'nonEmpty'}
    };

    const userPasswordAuthProperties = {
      user: {check: 'nonEmpty'},
      password: {check: 'nonEmpty'}
    };

    const sparqlProperties = {
      namespace: {check: 'url'},
      categoryPredicate: {check: 'nonEmpty'},
      idPropertyName: {check: 'nonEmpty'}
    };

    switch (graphdb.vendor) {
      case 'neo4j':
        properties = _.merge(properties, {
          url: {required: true, check: 'url'},
          proxy: {check: 'nonEmpty'},
          writeURL: {check: 'httpUrl'}
        });
        properties = _.merge(properties, userPasswordAuthProperties);
        properties = _.merge(properties, alternativeIdsProperties);
        break;

      case 'janusGraph':
        properties = _.merge(properties, {
          url: {required: true, check: 'url'},

          // At least one of the two has to be defined
          configurationPath: {check: 'nonEmpty'},
          configuration: {type: 'object'}
        });
        properties = _.merge(properties, userPasswordAuthProperties);
        properties = _.merge(properties, alternativeIdsProperties);
        Utils.check.exclusive(key, graphdb, ['configurationPath', 'configuration'], true);
        break;

      case 'dse':
        properties = _.merge(properties, {
          url: {required: true, check: 'url'},
          graphName: {required: true, check: 'nonEmpty'},
          create: {type: 'boolean'}
        });
        properties = _.merge(properties, userPasswordAuthProperties);
        break;

      case 'allegroGraph':
        properties = _.merge(properties, {
          url: {required: true, check: 'httpUrl'},
          repository: {required: true, check: 'nonEmpty'},
          create: {type: 'boolean'}
        });
        properties = _.merge(properties, userPasswordAuthProperties);
        properties = _.merge(properties, sparqlProperties);
        break;

      case 'stardog':
        properties = _.merge(properties, {
          url: {required: true, check: 'httpUrl'},
          repository: {required: true, check: 'nonEmpty'}
        });
        properties = _.merge(properties, userPasswordAuthProperties);
        properties = _.merge(properties, sparqlProperties);
        break;
    }

    Utils.check.properties(key, graphdb, properties);
  }

  /**
   * @param {string} key
   * @param {any}    index
   */
  static checkIndex(key, index) {
    Utils.check.values(key + '.vendor', index.vendor, [
      'elasticSearch', 'elasticSearch2', 'neo2es',
      'neo4jSearch', 'allegroGraphSearch', 'dseSearch', 'janusGraphSearch', 'stardogSearch'
    ]);
    let properties = {
      vendor: {required: true, values: [index.vendor]}
    };

    const externalIndexProperties = {
      disableIndexExistCheck: {type: 'boolean'}
    };

    switch (index.vendor) {
      case 'elasticSearch':
        properties = _.merge(properties, {
          host: {required: true, check: 'nonEmpty'},
          port: {required: true, check: 'port'},
          forceReindex: {type: 'boolean'},
          skipEdgeIndexation: {type: 'boolean'},
          dynamicMapping: {type: 'boolean'},
          dateDetection: {type: 'boolean'},
          //url: {check: 'httpUrl'},
          https: {type: 'boolean'},
          indexName: {type: 'string'}, // in case the indexName somehow ended up here
          mapping: {type: 'object'}, // tolerated but is it used?
          analyzer: {type: 'string'}, // ElasticSearch analyzer, defaults to 'standard'
          user: {check: 'nonEmpty'},
          password: {check: 'nonEmpty'}
        });
        break;

      case 'elasticSearch2':
        properties = _.merge(properties, {
          host: {required: true, check: 'nonEmpty'},
          port: {required: true, check: 'port'},
          forceReindex: {type: 'boolean'},
          https: {type: 'boolean'},
          user: {check: 'nonEmpty'},
          password: {check: 'nonEmpty'},
          dynamicMapping: {type: 'boolean'},
          forceStringMapping: {arrayItem: {check: 'nonEmpty'}},
          analyzer: {type: 'string'},
          // "indexName" is a internal option of the DAO, it should never be in the configuration
          skipEdgeIndexation: {type: 'boolean'},
          caCert: {type: 'string'}
        });
        break;

      case 'neo2es':
        break;

      case 'neo4jSearch':
        properties = _.merge(properties, {
          batchSize: {check: 'number'},
          numberOfThreads: {check: 'number'},
          initialization: {check: 'boolean'},
          initialOffsetNodes: {check: 'number'},
          initialOffsetEdges: {check: 'number'}
        });
        properties = _.merge(properties, externalIndexProperties);
        break;

      case 'allegroGraphSearch':
      case 'dseSearch':
      case 'janusGraphSearch':
      case 'stardogSearch':
        properties = _.merge(properties, externalIndexProperties);
        break;
    }

    Utils.check.properties(key, index, properties);
  }
}

module.exports = ConfigChecker;
