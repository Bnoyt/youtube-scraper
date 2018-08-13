// this is a default configuration file used for fallback
//                      ______
//                     /     /\
//                    /     /##\
//                   /     /####\
//                  /     /######\
//                 /     /########\
//                /     /##########\
//               /     /#####/\#####\
//              /     /#####/++\#####\
//             /     /#####/++++\#####\
//            /     /#####/\+++++\#####\
//           /     /#####/  \+++++\#####\
//          /     /#####/ |  \+++++\#####\
//         /     /#####/  |   \+++++\#####\
//        /     /#####/   .    \+++++\#####\
//       /     /#####/__________\+++++\#####\
//      /                        \+++++\#####\
//     /__________________________\+++++\####/
//     \+++++++++++++++++++++++++++++++++\##/
//      \+++++++++++++++++++++++++++++++++\/
//       ``````````````````````````````````
//      _                     _              _ _ _
//   __| | ___    _ __   ___ | |_    ___  __| (_) |_
//  / _` |/ _ \  | '_ \ / _ \| __|  / _ \/ _` | | __|
// | (_| | (_) | | | | | (_) | |_  |  __/ (_| | | |_
//  \__,_|\___/  |_| |_|\___/ \__|  \___|\__,_|_|\__|
//
'use strict';

module.exports  = {
  dataSources: [{
    readOnly: false,
    graphdb: {
      vendor: 'neo4j',
      url: 'http://127.0.0.1:7474',
      user: null,
      password: null
    },
    index: {
      vendor: 'elasticSearch',
      host: '127.0.0.1',
      port: 9201,
      forceReindex: false,
      dynamicMapping: false,
      skipEdgeIndexation: false
    }
  }],
  advanced: {
    maxPathLength: 20,
    supernodeThreshold: 10000,
    shortestPathsMaxResults: 10,
    connectionRetries: 10,
    pollInterval: 10,
    indexationChunkSize: 5000,
    expandThreshold: 50,
    searchAddAllThreshold: 500,
    searchThreshold: 3000,
    minSearchQueryLength: 1,
    rawQueryTimeout: 60000,
    defaultFuzziness: 0.9,
    layoutWorkers: 2
  },
  db: {
    name: 'linkurious',
    username: null,
    password: null,
    options: { // all sequelize options can be used here (http://sequelizejs.com/docs/1.7.8/usage#options)
      dialect: 'sqlite',
      // file path is relative to data directory
      storage: 'server/database.sqlite'
    }
  },
  server: {
    listenPort: 3000,
    listenPortHttps: 3443,
    clientFolder: 'server/public',
    cookieSecret: 'zO6Yb7u5H907dfEcmjS8pXgWNEo3B9pNQF8mKjdzRR3I64o88GrGLWEjqNq1Yx5',
    allowOrigin: null,
    domain: null, // string. e.g. "www.your-domain.com"
    publicPortHttp: null,
    publicPortHttps: null,
    useHttps: false,
    forceHttps: false,
    certificateFile: null,
    certificateKeyFile: null,
    certificatePassphrase: null
  },
  defaultPreferences: {
    pinOnDrag: false,
    locale: 'en-US',
    uiWorkspaceSearch: true,
    uiExport: true,
    uiDesign: true,
    uiLayout: true,
    uiEdgeSearch: true,
    uiShortestPath: true,
    uiCollapseNode: true,
    uiScreenshot: true,
    uiCaptionConfig: true,
    uiTooltipConfig: true,
    uiVisualizationPanel: true,
    uiNodeList: true,
    uiEdgeList: true,
    uiTooltip: true,
    uiSimpleLayout: false
  },
  guestPreferences: {
    locale: 'en-US',
    uiWorkspaceSearch: false,
    uiExport: false,
    uiDesign: false,
    uiLayout: false,
    uiCollapseNode: true,
    uiCaptionConfig: false,
    uiTooltipConfig: false,
    uiVisualizationPanel: false,
    uiNodeList: false,
    uiEdgeList: false,
    uiTooltip: true,
    uiSimpleLayout: true
  },
  alerts: {
    maxMatchTTL: 0,
    maxMatchesLimit: 5000,
    maxRuntimeLimit: 600000,
    maxConcurrency: 1
  },
  auditTrail: {
    enabled: false,
    logFolder: 'audit-trail',
    fileSizeLimit: 5242880, // 5MB
    strictMode: false, // whether to flush the audit-trail log before returning a result
    mode: 'rw' // log read and/or write action: r || w || rw
  },
  access: {
    authRequired: false,
    guestMode: false,
    floatingLicenses: null,
    defaultPage: 'dashboard',
    defaultPageParams: {},
    dataEdition: true,
    widget: true,
    loginTimeout: 3600,
    oauth2: { // Google Apps via OpenID Connect
      enabled: false,
      provider: 'openidconnect',
      authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth?hd=MY-CUSTOM-DOMAIN.com',
      tokenURL: 'https://www.googleapis.com/oauth2/v4/token',
      clientID: 'MY-CLIENT-ID.apps.googleusercontent.com',
      clientSecret: 'MY-CLIENT-SECRET'
    }
  },
  defaultCaptions: {
    nodes: {
      EXAMPLE_NODE_CATEGORY: {
        active: true,
        displayName: false,
        properties: ['name', 'country']
      }
    },
    edges: {
      EXAMPLE_EDGE_TYPE: {
        active: true,
        displayName: true,
        properties: ['reason']
      }
    }
  },
  leaflet: [{ // available tiles: https://leaflet-extras.github.io/leaflet-providers/preview/
    name: 'Stamen Toner Lite',
    thumbnail: '/assets/img/Stamen_TonerLite.png',
    urlTemplate: 'http://{s}.tile.stamen.com/toner-lite/{z}/{x}/{y}.png', // string. e.g. "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}"
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>', // string. e.g. "Map data &copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> contributors, <a href='http://creativecommons.org/licenses/by-sa/2.0/''>CC-BY-SA</a>, Imagery © <a href='http://mapbox.com'>Mapbox</a>"
    subdomains: null,
    id: null, // string. e.g. "mapbox.streets"
    accessToken: null, // string. e.g. "pk.eyJ1Ijoic2hleW1hbm4iLCJhIjoiY2lqNGZmanhpMDAxaHc4bTNhZGFrcHZleiJ9.VliJNQs7QBK5e5ZmYl9RTw"
    minZoom: 2,
    maxZoom: 20
  }, {
    overlay: true,
    name: 'Stamen Toner Lines',
    thumbnail: '',
    urlTemplate: 'http://stamen-tiles-{s}.a.ssl.fastly.net/toner-lines/{z}/{x}/{y}.png',
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abcd',
    id: null,
    accessToken: null,
    minZoom: 2,
    maxZoom: 20
  }, {
    name: 'Esri World Gray Canvas', // http://www.arcgis.com/home/item.html?id=8b3d38c0819547faa83f7b7aca80bd76
    thumbnail: '/assets/img/Esri_WorldGrayCanvas.png',
    urlTemplate: 'http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    subdomains: null,
    id: null,
    accessToken: null,
    minZoom: 2,
    maxZoom: 16
  }, {
    name: 'OpenStreetMap B&W',
    thumbnail: '/assets/img/OpenStreetMap_BlackAndWhite.png',
    urlTemplate: 'http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>',
    subdomains: null,
    id: null,
    accessToken: null,
    minZoom: 2,
    maxZoom: 18
  }, {
    name: 'CartoDB Positron',
    thumbnail: '/assets/img/CartoDB_Positron.png',
    urlTemplate: 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    subdomains: 'abcd',
    id: null,
    accessToken: null,
    minZoom: 2,
    maxZoom: 19
  }, {
    name: 'MapBox Light',
    thumbnail: '/assets/img/MapBox_Light.png',
    urlTemplate: 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy <a href="http://mapbox.com">Mapbox</a>',
    subdomains: null,
    id: 'mapbox.light',
    accessToken: 'pk.eyJ1Ijoic2hleW1hbm4iLCJhIjoiY2lqNGZmanhpMDAxaHc4bTNhZGFrcHZleiJ9.VliJNQs7QBK5e5ZmYl9RTw',
    minZoom: 2,
    maxZoom: 20
  }, {
    name: 'MapBox Streets',
    thumbnail: '/assets/img/MapBox_Streets.png',
    urlTemplate: 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy <a href="http://mapbox.com">Mapbox</a>',
    subdomains: null,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1Ijoic2hleW1hbm4iLCJhIjoiY2lqNGZmanhpMDAxaHc4bTNhZGFrcHZleiJ9.VliJNQs7QBK5e5ZmYl9RTw',
    minZoom: 2,
    maxZoom: 20
  }, {
    name: 'MapQuestOpen Aerial',
    thumbnail: '/assets/img/MapQuestOpen_Aerial.jpg',
    urlTemplate: 'http://otile{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.jpg',
    attribution: 'Tiles Courtesy of <a href="http://www.mapquest.com/">MapQuest</a> &mdash; Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency',
    subdomains: '1234',
    id: null,
    accessToken: null,
    minZoom: 2,
    maxZoom: 11
  }],
  ogma: {
    render: ['canvas'],
    plugins: ['dagre'],
    settings: {
      selection: {
        manual: false,
        outline: true,
        edgeTextBackgroundColor: '#FFF',
        nodeTextBackgroundColor: '#FFF',
        nodeOuterStrokeColor: '#F65565',
        nodeTextFontStyle: 'bold',
        edgeColor: '#F65565'
      },
      camera: {
        defaultZoomModifier: 1.382,
        maxZoom: 8,
        minZoom: 0.1
      },
      halos: {
        nodeSize: 25,
        edgeSize: 20,
        nodeColor: '#FFFFFF',
        edgeColor: '#FFFFFF',
        nodeClustering: false,
        nodeClusteringMaxRadius: 80,
        nodeStrokeWidth: 0.5,
        nodeStrokeColor: 'rgba(0,0,0,0)'
      },
      hover: {
        edgeColor: '#6b6b6b',
        edgeTextBackgroundColor: '#FFF',
        nodeTextBackgroundColor: '#FFF',
        nodeOuterStrokeColor: '#FFFFFF',
        highlightEdgeExtremities: true,
        edges: true,
        nodeTextFontStyle: 'bold',
        outline: true
      },
      badges: {
        defaultColor: '#999999',
        defaultStrokeColor: 'rgba(0,0,0,0)',
        defaultFont: 'roboto',
        threshold: 8,
        hideStrokeOnHiddenContent: true,
        defaultTextColor: 'white'
      },
      cameraInteractions: {
        zoomOnDoubleClick: false,
        rotationEnabled: false
      },
      pulses: {
        pulseDuration: 2500,
        pulseInterval: 750,
        numberOfPulses: 0,
        nodePulseStartColor: '#FFF',
        nodePulseEndColor: 'rgba(0, 0, 0, 0)',
        nodePulseStartRatio: 1,
        nodePulseEndRatio: 5,
        nodePulseWidth: 5,
        edgePulseStartColor: '#FFF',
        edgePulseEndColor: 'rgba(0, 0, 0, 0)',
        edgePulseStartRatio: 1,
        edgePulseEndRatio: 5,
        edgePulseWidth: 5
      },
      render: {
        webGLAntiAliasing: 'super-sampling',
        webGLFontSamplingSize: 128,
        backgroundColor: 'rgba(0, 0, 0, 0)',
        imgCrossOrigin: 'anonymous'
      },
      captor: {
        nodeTexts: false,
        edgeTexts: false,
        edgeErrorMargin: 10
      },
      lasso: {
        strokeColor: 'red',
        strokeWidth: 3
      },
      shapes: {
        nodeInnerStrokeColor: '#FFF',
        defaultEdgeColor: '#A9A9A9',
        defaultEdgeShape: 'arrow',
        defaultNodeColor: '#999999',
        nodeOuterStrokeWidth: 2
      },
      icons: {
        defaultFont: 'FontAwesome',
        defaultColor: '#FFF'
      },
      texts: {
        fontFamily: 'roboto',
        nodeFontColor: '#000',
        nodeBackgroundColor: 'rgba(0, 0, 0, 0)',
        edgeBackgroundColor: 'rgba(0, 0, 0, 0)',
        nodeFontSize: 11,
        nodeSizeThreshold: 5,
        nodeTextAlignment: 'center',
        edgeFontSize: 11,
        edgeSizeThreshold: 4,
        nodeMaxTextLineLength: 35,
        preventOverlap: true,
        nodeBackgroundMargin: 0
      }
    }
  },
  defaultStyles: {
    nodes: {},
    edges: {}
  },
  palette: {
    nodes: {
      qualitative: {
        'linkurious_def': {
          // generated with http://tools.medialab.sciences-po.fr/iwanthue/
          12: ['#701E30', '#00D745', '#FA5AE3', '#EB9104', '#25623B', '#3C4382', '#E885A2', '#9391ED', '#2F9539', '#C9B528', '#8B2E0B', '#7BA273'],
          15: ['#CE83CA', '#C0DC43', '#67D5AA', '#CE7C32', '#D5B5B5', '#5D8D42', '#88CBD8', '#637F7B', '#C6D396', '#73DA68', '#7E8BC1', '#BF6481', '#9A7A4E', '#CBAF43', '#D16255'],
          20: ['#D6C1B0', '#9DDD5A', '#D06D34', '#D28FD8', '#5D8556', '#71D4C6', '#CDCF79', '#D8A836', '#5E8084', '#738ECD', '#D36565', '#61DC7B', '#9B7168', '#97C4DE', '#A57E42', '#D5DA41', '#D06B97', '#917097', '#689534', '#90D59B'],
          40: ['#5FDAA2', '#DE6FBC', '#D4742C', '#4EA4D4', '#DBE345', '#807757', '#C9DCD0', '#5BA943', '#E39084', '#816B9F', '#DEDA83', '#DDB5D0', '#897121', '#D85573', '#8294E9', '#508A7A', '#92E13E', '#D95B4B', '#816772', '#A75781', '#538245', '#D7C19B', '#DB9B5F', '#ABD4A2', '#8D9F2C', '#67D8C8', '#577C94', '#E8A22E', '#C792DF', '#65E175', '#A26238', '#ABDD7E', '#AFC2DD', '#A65A59', '#DABD3A', '#6DCBDB', '#AEA45A', '#E088AD', '#B09898', '#7793CD']
        }
      },
      sequential: {
        // generated with http://gka.github.io/palettes/
        7: ['#161344', '#3f1c4c', '#632654', '#86315b', '#a93c63', '#cd476a', '#f35371']
      }
    },
    edges: {
      qualitative: {
        'linkurious_def': {
          // generated with http://tools.medialab.sciences-po.fr/iwanthue/
          12: ['#701E30', '#00D745', '#FA5AE3', '#EB9104', '#25623B', '#3C4382', '#E885A2', '#9391ED', '#2F9539', '#C9B528', '#8B2E0B', '#7BA273'],
          15: ['#CE83CA', '#C0DC43', '#67D5AA', '#CE7C32', '#D5B5B5', '#5D8D42', '#88CBD8', '#637F7B', '#C6D396', '#73DA68', '#7E8BC1', '#BF6481', '#9A7A4E', '#CBAF43', '#D16255'],
          20: ['#D6C1B0', '#9DDD5A', '#D06D34', '#D28FD8', '#5D8556', '#71D4C6', '#CDCF79', '#D8A836', '#5E8084', '#738ECD', '#D36565', '#61DC7B', '#9B7168', '#97C4DE', '#A57E42', '#D5DA41', '#D06B97', '#917097', '#689534', '#90D59B'],
          40: ['#5FDAA2', '#DE6FBC', '#D4742C', '#4EA4D4', '#DBE345', '#807757', '#C9DCD0', '#5BA943', '#E39084', '#816B9F', '#DEDA83', '#DDB5D0', '#897121', '#D85573', '#8294E9', '#508A7A', '#92E13E', '#D95B4B', '#816772', '#A75781', '#538245', '#D7C19B', '#DB9B5F', '#ABD4A2', '#8D9F2C', '#67D8C8', '#577C94', '#E8A22E', '#C792DF', '#65E175', '#A26238', '#ABDD7E', '#AFC2DD', '#A65A59', '#DABD3A', '#6DCBDB', '#AEA45A', '#E088AD', '#B09898', '#7793CD']
        }
      },
      sequential: {
        // generated with http://gka.github.io/palettes/
        7: ['#132b43', '#1d3f5d', '#27547a', '#326896', '#3d7fb5', '#4897d4', '#54aef3'],
        5: ['#132b43', '#22486b', '#326896', '#438ac3', '#54aef3'],
        3: ['#132b43', '#326896', '#54aef3']
      }
    }
  }
};
