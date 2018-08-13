/**
 * LINKURIOUS CONFIDENTIAL
 * __________________
 *
 *  [2012] - [2014] Linkurious SAS
 *  All Rights Reserved.
 *
 */
'use strict';

// services
const LKE = require('../../index');
const Access = LKE.getAccess();
const Utils = LKE.getUtils();
const DataProxy = LKE.getData(true);

// locals
const api = require('../api');
const parsers = require('../../../lib/parsers');

module.exports = function(app) {

  /**
   * @api {get} /api/:dataSource/search/reindex Run the indexation
   * @apiName SearchReIndex
   * @apiGroup Search
   * @apiVersion 1.0.0
   * @apiPermission action:admin.index
   *
   * @apiDescription Reindex the graph database.
   *
   * @apiParam {string} dataSource Key of the data-source
   *
   * @apiSuccessExample {none} Success-Response:
   *   HTTP/1.1 204 No Content
   *
   */
  app.get('/api/:dataSource/search/reindex', api.respond(req => {
    return Access.hasAction(req, 'admin.index', req.param('dataSource')).then(() => {
      return DataProxy.asyncIndexSource(req.param('dataSource'));
    });
  }, 204));

  /**
   * @api {get} /api/:dataSource/search/status Get the indexation status
   * @apiName SearchStatus
   * @apiGroup Search
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   *
   * @apiDescription Get the indexation status for a given data-source.
   *
   * @apiParam {string} dataSource Key of the data-source
   *
   * @apiSuccess {string="ongoing","needed","done","unknown"} indexing The status of the indexation
   * @apiSuccess {string} indexing_progress Percentage of the indexation (`null` if the indexing is not ongoing)
   * @apiSuccess {number} node_count        Number of nodes in the graph database (`null` if the indexing is not ongoing)
   * @apiSuccess {number} edge_count        Number of edges in the graph database (`null` if the indexing is not ongoing)
   * @apiSuccess {number} index_size        Number of nodes and edges in the index (`null` if the indexing is not ongoing)
   * @apiSuccess {string} indexed_source    Key of the data-source (`null` if the indexing is not ongoing)
   * @apiSuccess {string} indexing_status   A human readable string describing the indexation status
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "indexing": "ongoing",
   *     "indexing_progress": "62.55",
   *     "node_count": 10,
   *     "edge_count": 25,
   *     "index_size": 19,
   *     "indexed_source": "c1d3fe",
   *     "indexing_status": "Currently indexing 12375 nodes/s. Time left: 25 seconds."
   *   }
   */
  app.get('/api/:dataSource/search/status', api.respond(req => {
    // check we are not an application
    Access.getUserCheck(req);
    return DataProxy.resolveSource(req.param('dataSource')).getSearchStatus();
  }));

  /**
   * @api {get} /api/:dataSource/search/:type Search for nodes or edges grouped by category/type
   * @apiName SearchNodesOrEdges
   * @apiGroup Search
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission __guest
   * @apiPermission apiright:graphItem.search
   *
   * @apiParam {string} dataSource           Key of the data-source
   * @apiParam {string="nodes","edges"} type The item type to search
   *
   * @apiParam {string}      q            Search query
   * @apiParam {number{0-1}} [fuzziness]  Fuzziness value (`1` means exact match, `0` completely fuzzy)
   * @apiParam {number{1-}}  [size]       Page size (maximum number of returned items)
   * @apiParam {number{0-}}  [from]       Offset from the first result
   * @apiParam {string}      [filter]     String containing all the filters, e.g.:
   *                                      `"name::todd|city::denver"`
   * @apiParam {boolean}     [full=false] Include the `data` field for each returned item
   *
   * @apiDescription Perform a search of nodes or edges based on a search query, a fuzziness value and a filter.
   * Search results are grouped by category for nodes and type for edges.
   *
   * Search results are grouped by categories. So, for example:
   *  - `results[0].categories` is the collection of categories for the first group
   *  - `results[0].children` are the actual items returned for the first group
   *  - `results[0].children[0]` is the first node (or edge) that matches the search query
   *
   * @apiExample Example usage:
   *   curl -i http://localhost:3000/api/a1ez3a/search/nodes?q=Matrix
   *   curl -i http://localhost:3000/api/a1ez3a/search/nodes?q=Matrix&fuzziness=0.9
   *   curl -i http://localhost:3000/api/a1ez3a/search/nodes?q=Reloaded%20OR%20Revolutions
   *   curl -i http://localhost:3000/api/a1ez3a/search/nodes?q=Reloded&filter=released::1999|title::test
   *
   * @apiSuccess {string="node","edge"} type       The item type given in input
   * @apiSuccess {number}   [totalHits]            The total number of matching items (not guaranteed to be available)
   * @apiSuccess {boolean}  [moreResults]          If `totalHits` is `undefined`, `moreResults` will indicates
   *                                               if there are more items or not to still be retrieved
   *                                               (`undefined` if `totalHits` is returned)
   * @apiSuccess {object[]} results                Groups of matching items
   * @apiSuccess {string}   results.title          Title of the group (based on categories for nodes and type for edges)
   * @apiSuccess {string[]} results.categories     List of categories/types of the group
   * @apiSuccess {object[]} results.children       Matching items
   * @apiSuccess {string}   results.children.id    ID of the item
   * @apiSuccess {string}   results.children.name  Name of the matching items (based on heuristics, using 'title' or 'name' properties when available)
   * @apiSuccess {string}   results.children.field Property field that matched with the search query
   * @apiSuccess {string}   results.children.value Value of the property that matched the search query
   *                                               (the matching part of the string is surrounded by `[match]` and `[/match]`)
   *
   * @apiSuccessExample {json} Success-Response:
   *   HTTP/1.1 200 OK
   *   {
   *     "type": "node",
   *     "totalHits": 2,
   *     "results": [{
   *       "title": "Movie, Matrix",
   *       "categories": ["Movie", "Matrix"]
   *       "children": [{
   *         "id": 11399,
   *         "name": "The Matrix Reloaded",
   *         "field": "title"
   *         "value": "The Matrix [match]Reloaded[/match]"
   *       }, {
   *         "id": 11400,
   *         "name": "The Matrix Revolutions"
   *         "field": "title"
   *         "value": "The Matrix [match]Revolutions[/match]"
   *       }]
   *     }]
   *   }
   */
  app.get('/api/:dataSource/search/:type', api.respond(req => {
    return DataProxy.searchIndex(
      req.param('type') === 'nodes' ? 'node' : 'edge',
      req.param('q'),
      {
        fuzziness: Utils.tryParseNumber(req.param('fuzziness'), 'fuzziness', true),
        filter: parsers.parseUrlFilter(req.param('filter')),
        size: Utils.tryParseNumber(req.param('size'), 'size', true),
        from: Utils.tryParseNumber(req.param('from'), 'from', true),
        full: Utils.parseBoolean(req.param('full'))
      },
      req.param('dataSource'),
      Access.getUserCheck(req, 'graphItem.search', true)
    );
  }));

  /**
   * @api {get} /api/:dataSource/search/nodes/full Search full nodes or edges
   * @apiName SearchFull
   * @apiGroup Search
   * @apiVersion 1.0.0
   * @apiPermission authenticated
   * @apiPermission __guest
   * @apiPermission apiright:graphItem.search
   *
   * @apiDescription Perform a search of nodes or edges based on a search query, a fuzziness value and a filter.
   * An array of nodes is returned.
   *
   * @apiParam {string}                 dataSource           Key of the data-source
   * @apiParam {string="nodes","edges"} type                 The item type to search
   * @apiParam {string}                 q                    Search query
   * @apiParam {boolean}                [strict_edges=false] Return only edges between nodes in the result (taken into account only if `type` is `"nodes"`)
   * @apiParam {number}                 [fuzziness]          Fuzziness value (`1` means exact match, `0` completely fuzzy)
   * @apiParam {number}                 [size]               Page size (maximum number of returned items)
   * @apiParam {number}                 [from]               Offset from the first result
   * @apiParam {string}                 [filter]             String containing all the filters, e.g.:
   *                                                         `"name::todd|city::denver"`
   * @apiParam {boolean}                [with_digest=false]  Whether to include the adjacency digest
   * @apiParam {boolean}                [with_degree=false]  Whether to include the degree in the returned nodes
   *
   * @apiUse ReturnSubGraph
   */
  app.get('/api/:dataSource/search/:type/full', api.respond(req => {
    return DataProxy.searchFull(
      req.param('type') === 'nodes' ? 'node' : 'edge',
      req.param('q'),
      {
        fuzziness: Utils.tryParseNumber(req.param('fuzziness'), 'fuzziness', true),
        filter: parsers.parseUrlFilter(req.param('filter')),
        size: Utils.tryParseNumber(req.param('size'), 'size', true),
        from: Utils.tryParseNumber(req.param('from'), 'from', true)
      },
      req.param('dataSource'),
      Utils.parseBoolean(req.param('strict_edges')),
      {
        withDigest: Utils.parseBoolean(req.param('with_digest')),
        withDegree: Utils.parseBoolean(req.param('with_degree'))
      },
      Access.getUserCheck(req, 'graphItem.search', true)
    );
  }));
};
