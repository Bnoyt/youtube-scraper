/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-10-09.
 */
'use strict';

// external libs
const _ = require('lodash');

// services
const LKE = require('../../../services');
const Utils = LKE.getUtils();

// locals
const Neo4jSearch300Driver = require('./neo4jSearch300Driver');
const CypherUtils = require('../../utils/cypherUtils');
const DaoUtils = require('../../utils/daoUtils');

/**
 * From Neo4JSearch 3.3.0 we can use the following procedures instead of the 'START' clause:
 * - db.index.explicit.auto.searchNodes
 * - db.index.explicit.auto.searchRelationships
 */
class Neo4jSearch330Driver extends Neo4jSearch300Driver {

  /**
   * Build the query for $search.
   *
   * Procedures from:
   * https://neo4j.com/docs/developer-manual/3.3/cypher/schema/index/#explicit-indexes-procedures
   *
   * @param {string} type         'node' or 'edge'
   * @param {string} searchString Query that will be forwarded to the index. It has to be a fielded lucene query
   * @param {LkSearchOptions}     options
   * @returns {string}
   */
  $buildSearchQuery(type, searchString, options) {
    const sProcedure = type === 'node'
      ? 'db.index.explicit.auto.searchNodes'
      : 'db.index.explicit.auto.searchRelationships';
    const sType = type === 'node' ? 'node' : 'relationship';

    const whereClauses = [];

    if (Utils.hasValue(options.categoriesOrTypes)) {
      if (type === 'node') {
        // we remove the special LABEL_NODES_WITH_NO_CATEGORY case
        const readableCategories = _.filter(options.categoriesOrTypes,
          c => c !== DaoUtils.LABEL_NODES_WITH_NO_CATEGORY);

        // TODO find a better way to write this clause that may end up in a better optimization
        let categoryClause = 'ANY (l in labels(i) WHERE l in ' +
          CypherUtils.encodeValue(readableCategories) + ')';
        // if we can read nodes with no categories
        if (options.categoriesOrTypes.includes(DaoUtils.LABEL_NODES_WITH_NO_CATEGORY)) {
          categoryClause += ' OR size(labels(i)) = 0';
        }
        whereClauses.push(categoryClause);
      } else {
        const readableTypes = options.categoriesOrTypes;

        whereClauses.push(`type(i) in ${CypherUtils.encodeValue(readableTypes)}`);
      }
    }

    if (Utils.hasValue(options.filter)) {
      for (let i = 0; i < options.filter.length; i++) {
        const filter = options.filter[i];
        whereClauses.push(
          `toLower(i.${CypherUtils.encodeName(filter[0])}) ` +
          `CONTAINS toLower(${CypherUtils.encodeValue(filter[1])})`
        );
      }
    }

    let sWhere = '';
    if (whereClauses.length > 0) {
      sWhere += `WHERE (${whereClauses.join(') AND (')}) `;
    }

    return `CALL ${sProcedure}(${CypherUtils.encodeValue(searchString)}) ` +
      `YIELD ${sType} as i, weight ` +
      sWhere +
      `RETURN i, weight ORDER BY weight DESC SKIP ${options.from} LIMIT ${options.size}`;
  }
}

module.exports = Neo4jSearch330Driver;
