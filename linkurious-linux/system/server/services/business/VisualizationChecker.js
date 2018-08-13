/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-03-17.
 */
'use strict';

// services
const LKE = require('../../services');
const Utils = LKE.getUtils();

const NODE_PATH_RE = /^data\.(categories|properties\..+)$/;
const EDGE_PATH_RE = /^data\.(type|properties\..+)$/;

/**
 * @param {boolean} node
 * @type {function(boolean)}
 */
const DESIGN_COLOR_PROPERTY = node => ({
  required: false,
  properties: {
    by: {
      required: true,
      check: (key, value) => Utils.check.regexp(key, value, node ? NODE_PATH_RE : EDGE_PATH_RE)
    },
    scheme: {
      required: true,
      check: (key, value) => Utils.check.startsWith(key, value, node ? 'nodes.' : 'edges.')
    },
    bins: {required: false, type: 'number'},
    active: {required: false, type: 'boolean'}
  }
});

/**@type {object}*/
const DESIGN_ICON_PROPERTY = DESIGN_COLOR_PROPERTY(true);

/**@type {object}*/
const DESIGN_IMAGE_PROPERTY = DESIGN_COLOR_PROPERTY(true);

/**@type {object}*/
const PALETTE_QUALITATIVE_FIELD = {
  required: true,
  properties: {
    'linkurious_def': {
      required: true,
      properties: {
        40: {
          required: true,
          arraySize: 40,
          arrayItem: {check: 'hexColor'}
        }
      },
      policy: 'inclusive'
    }
  },
  policy: 'inclusive'
};

/**@type {object}*/
const PALETTE_SEQUENTIAL_FIELD = {
  required: true,
  properties: {
    7: {
      required: true,
      arraySize: 7,
      arrayItem: {check: 'hexColor'}
    }
  },
  policy: 'inclusive'
};

/**
 * @param {boolean} node
 * @type {function(boolean)}
 */
const DESIGN_SIZE_PROPERTY = node => ({
  required: false,
  properties: {
    by: {
      required: true,
      check: (key, value) => Utils.check.regexp(
        key, value, new RegExp(`^data\\.(${node ? 'categories' : 'type'}|properties\\..+)$`)
      )
    },
    bins: {required: true, type: 'number'},
    min: {required: true, type: 'number'},
    max: {required: true, type: 'number'},
    active: {required: false, type: 'boolean'}
  }
});

/**@type {object}*/
const FILTER_ITEM = {
  properties: {
    key: {required: true, check: (key, value) => {
      // we truncate the value because `node.data.properties.` and `node.edge.properties.`
      // can have any suffix to indicate the actual property key
      const truncatedValue = value.slice(0, 21);
      Utils.check.values(key, truncatedValue, ['node.data.categories', 'node.data.properties.',
        'edge.data.type', 'edge.data.properties.', 'geo-coordinates']);
    }},
    values: {type: 'array'}
  }
};

/**@type {object}*/
const DESIGN_PROPERTIES = {
  // design.palette
  palette: {
    required: true,
    properties: {
      // design.palette.nodes
      nodes: {
        required: true,
        properties: {
          // available icons schemes
          icons: {
            // scheme (a property name of "categories", e.g. "categories")
            anyProperty: {
              // property/category value (e.g. "CITY", "COMPANY")
              anyProperty: {
                required: true,
                properties: {
                  // name of the font
                  font: {required: true, type: 'string'},
                  // point size of the font
                  scale: {required: true, type: 'number'},
                  // color of the icon
                  color: {required: true, check: (key, value) => Utils.check.hexColor(key, value)},
                  // character-code of the icon in the given font
                  content: {required: true, type: 'string'}
                }
              }
            }
          },
          // available images schemes
          images: {
            // by image palette name
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
          },
          // available shape schemes
          type: {
            // scheme (a property name or "categories". e.g.: "dateOfBirth")
            anyProperty: {
              // name of a shape
              type: 'string'
            }
          },
          // qualitative colors schemes
          qualitative: PALETTE_QUALITATIVE_FIELD,
          // sequential color schemes
          sequential: PALETTE_SEQUENTIAL_FIELD
        }
      },
      // design.palette.edges
      edges: {
        required: true,
        properties: {
          // qualitative colors schemes
          qualitative: PALETTE_QUALITATIVE_FIELD,
          // sequential colors schemes
          sequential: PALETTE_SEQUENTIAL_FIELD,
          // available shape schemes
          type: {
            // scheme (a property name or "type". e.g.: "dateOfBirth")
            anyProperty: {
              // name of a shape
              type: 'string'
            }
          }
        }
      }
    }
  },
  // design.styles
  styles: {
    required: true,
    properties: {
      nodes: {
        required: true,
        properties: {
          color: DESIGN_COLOR_PROPERTY(true),
          size: DESIGN_SIZE_PROPERTY(true),
          icon: DESIGN_ICON_PROPERTY,
          image: DESIGN_IMAGE_PROPERTY
        }
      },
      edges: {
        required: true,
        properties: {
          color: DESIGN_COLOR_PROPERTY(false),
          size: DESIGN_SIZE_PROPERTY(false)
        }
      }
    }
  }
};

/**@type {object}*/
const NODE_ITEM = {
  required: true,
  properties: {
    id: {required: true, type: ['string', 'number']},
    selected: {required: false, type: 'boolean'},
    // position info for "nodelink" mode
    nodelink: {
      required: true,
      properties: {
        // when nodes are added in geo mode, they don't have (x,y) coordinates
        x: {required: false, type: 'number'},
        y: {required: false, type: 'number'},
        // whether the node has been pinned/fixed
        fixed: {required: false, type: 'boolean'}
      }
    },
    // position info for "geo" mode
    geo: {
      required: false,
      properties: {
        latitude: {required: false, type: 'number'},
        longitude: {required: false, type: 'number'},
        latitudeDiff: {required: false, type: 'number'},
        longitudeDiff: {required: false, type: 'number'}
      }
    }
  }
};

/**@type {object}*/
const EDGE_ITEM = {
  required: true,
  properties: {
    id: {required: true, type: ['string', 'number']},
    selected: {required: false, type: 'boolean'}
  }
};

/**@type {object}*/
const CAPTIONS = {
  required: true,
  // indexed by node-category/edge-type
  anyProperty: {
    properties: {
      active: {required: true, type: 'boolean'},
      // whether to display the name of the node-category/edge-type in the caption
      displayName: {required: true, type: 'boolean'},
      // list of properties used to compose the caption
      properties: {required: true, arrayItem: {type: 'string'}},
      id: {}, // tolerate unused field from old data
      name: {} // tolerate unused field from old data
    }
  }
};

/**@type {object}*/
const FIELDS_PROPERTIES = {
  captions: CAPTIONS,
  fields: {
    required: true,
    arrayItem: {
      properties: {
        name: {required: true, type: 'string'},
        active: {required: true, type: 'boolean'}
      }
    }
  }
};

/**@type {object}*/
const ALTERNATIVE_IDS_PROPERTIES = {
  node: {check: (key, value) => Utils.check.string(key, value, true)},
  edge: {check: (key, value) => Utils.check.string(key, value, true)}
};

/**@type {object}*/
const LAYOUT_PROPERTIES = {
  algorithm: {required: false, type: 'string'},
  mode: {required: false, type: 'string'},
  incremental: {required: false, type: 'boolean'}
};

/**@type {object}*/
const GEO_PROPERTIES = {
  layers: {required: true, arrayItem: {type: 'string'}},
  latitudeProperty: {check: (key, value) => Utils.check.string(key, value, true)},
  longitudeProperty: {check: (key, value) => Utils.check.string(key, value, true)}
};

class VisualizationChecker {
  /**
   * @param {string} key
   * @param {object} viz
   */
  static checkCreation(key, viz) {
    Utils.check.properties(key, viz, {
      title: {required: true, check: (key, value) => Utils.check.string(key, value, true)},
      folder: {check: (key, value) => Utils.check.integer(key, value, -1)},
      nodes: {required: true, arrayItem: NODE_ITEM},
      edges: {required: true, arrayItem: EDGE_ITEM},
      nodeFields: {properties: FIELDS_PROPERTIES},
      edgeFields: {properties: FIELDS_PROPERTIES},
      mode: {required: true, values: ['nodelink', 'geo']},
      layout: {required: true, properties: LAYOUT_PROPERTIES},
      design: {properties: DESIGN_PROPERTIES},
      filters: {required: true, arrayItem: FILTER_ITEM},
      alternativeIds: {required: true, properties: ALTERNATIVE_IDS_PROPERTIES},
      geo: {required: true, properties: GEO_PROPERTIES},
      sourceKey: {required: true, check: (key, value) => Utils.checkSourceKey(value)}
    });
  }

  /**
   * @param {string} key
   * @param {object} viz
   */
  static checkUpdate(key, viz) {
    Utils.check.properties(key, viz, {
      title: {required: false, check: (key, value) => Utils.check.string(key, value, true)},
      folder: {check: (key, value) => Utils.check.integer(key, value, -1)},
      nodes: {arrayItem: NODE_ITEM},
      edges: {arrayItem: EDGE_ITEM},
      nodeFields: {properties: FIELDS_PROPERTIES},
      edgeFields: {properties: FIELDS_PROPERTIES},
      mode: {values: ['nodelink', 'geo']},
      layout: {properties: LAYOUT_PROPERTIES},
      design: {properties: DESIGN_PROPERTIES},
      filters: {arrayItem: FILTER_ITEM},
      alternativeIds: {properties: ALTERNATIVE_IDS_PROPERTIES},
      geo: {properties: GEO_PROPERTIES}
    });
  }

  /**
   * @param {string} key
   * @param {object} viz
   */
  static checkUpdateSandbox(key, viz) {
    Utils.check.properties(key, viz, {
      nodeFields: {properties: FIELDS_PROPERTIES},
      edgeFields: {properties: FIELDS_PROPERTIES},
      design: {properties: DESIGN_PROPERTIES},
      geo: {properties: GEO_PROPERTIES},
      layout: {properties: LAYOUT_PROPERTIES}
    });
  }

  /**
   * @param {string} key
   * @param {object} captions
   */
  static checkCaptions(key, captions) {
    Utils.check.property(key, captions, CAPTIONS);
  }
}

module.exports = VisualizationChecker;
