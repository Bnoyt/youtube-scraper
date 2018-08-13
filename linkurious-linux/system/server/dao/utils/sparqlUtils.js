/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-08-22.
 */
'use strict';

// external libs
const _ = require('lodash');

// services
const LKE = require('../../services');
const Errors = LKE.getErrors();
const Utils = LKE.getUtils();
const Log = LKE.getLogger(__filename);

// Used to build literals, e.g: '"true"' + XML_SCHEMA_PREFIX + 'boolean' + '>'
const XML_SCHEMA_PREFIX = '"^^<http://www.w3.org/2001/XMLSchema#';

class SparqlUtils {

  /**
   * @param {Map<string, string>} prefixToURI
   * @param {string}              defaultNamespace
   * @param {string}              [categoryPredicate] Optional here, but required for some methods
   * @param {string}              [idPropertyName]
   */
  constructor(prefixToURI, defaultNamespace, categoryPredicate, idPropertyName) {
    this._prefixToURI = prefixToURI;
    this._defaultNamespace = defaultNamespace;
    this._categoryPredicate = categoryPredicate;
    this._idPropertyName = idPropertyName;
  }

  set categoryPredicate(c) {
    this._categoryPredicate = c;
  }

  /**
   * Return true if `str` follows the format 'prefix:something' with 'prefix' contained in
   * 'prefixToURI'.
   * The function will return false for blank nodes.
   *
   * @param {string} str
   * @returns {boolean}
   */
  isPrefixNotation(str) {
    return this._prefixToURI.has(str.split(':')[0]) && !this.isBlankNode(str);
  }

  /**
   * Return true if `str` is a blank node.
   *
   * @param {string} str
   * @returns {boolean}
   */
  isBlankNode(str) {
    return str.startsWith('_:');
  }

  /**
   * Return true if `str` is a valid URI wrapped in angle brackets.
   *
   * @param {string} str
   * @returns {boolean}
   */
  isURI(str) {
    return str.lastIndexOf('<') === 0 && str.indexOf('>') === str.length - 1;
  }

  /**
   * Return true if `str` is a literal.
   *
   * @param {string} str
   * @returns {boolean}
   */
  isLiteral(str) {
    return Utils.isNEString(str) && str.startsWith('"');
  }

  /**
   * Convert `str` to a valid URI wrapped in angle brackets or to a blank node.
   * Use `defaultNamespace` if `str` is not in prefix or URI form.
   *
   * @param {string} str
   * @returns {string}
   * @throws {LkError} if `str` has a prefix and this prefix is not defined in prefixToURI
   */
  shortNameToFullURI(str) {
    // identifiers can also be a URI or a blank node
    if (this.isURI(str) || this.isBlankNode(str)) {
      return str;
    }

    let namespace;
    // if the identifier doesn't have a prefix, we are going to use the default namespace
    if (str.indexOf(':') === -1) {
      namespace = this._defaultNamespace;
    } else {
      const splitStr = Utils.splitOnce(str, ':');
      namespace = this._prefixToURI.get(splitStr[0]);
      str = splitStr[1];
    }

    if (namespace !== undefined) {
      return '<' + namespace + str + '>';
    } else {
      throw Errors.business('invalid_parameter', '"' + str.split(':')[0] +
        '" isn\'t a valid namespace.');
    }
  }

  /**
   * Convert `str` to its short name.
   *
   * A short name can be:
   * - a URI if the namespace cannot be resolved, e.g: "<http://example.com/123>"
   * - a prefix notation (if the namespace is defined in the triple store), e.g: "company:123"
   * - a resource belonging to the default namespace defined for this instance, e.g: "123"
   * - a blank node, e.g: "_:a"
   *
   * @param {string} str
   * @returns {string}
   * @throws {LkError} if `str` is not a valid URI wrapped in angle brackets
   */
  fullURIToShortName(str) {
    if (this.isBlankNode(str)) {
      return str;
    }

    if (!this.isURI(str)) {
      throw Errors.technical('critical',
        'SparqlUtils::fullURIToShortName called on "' + str +
        '" that is not a URI or a blank node.');
    }

    // does the resource belong to the default namespace?
    if (str.startsWith('<' + this._defaultNamespace)) {
      str = str.substr(1, str.length - 2);
      return str.substr(this._defaultNamespace.length);
    }

    // does the resource belong to a namespace defined in the triple store?
    for (const key of this._prefixToURI.keys()) {
      const value = this._prefixToURI.get(key);
      if (str.startsWith('<' + value)) {
        str = str.substr(1, str.length - 2);
        return key + ':' + str.substr(value.length);
      }
    }

    // the namespace wasn't recognized, return the URI itself
    return str;
  }

  /**
   * Encode `edge` (using its source, type and destination) to get its id.
   *
   * @param {LkEdge | LkEdgeAttributes} edge
   * @returns {string}
   */
  getIdFromEdge(edge) {
    const edgeTriple = [
      edge.source,
      this.shortNameToFullURI(edge.type),
      edge.target
    ];

    const edgeJson = JSON.stringify(edgeTriple);
    return this.shortNameToFullURI(Buffer.from(edgeJson).toString('base64'));
  }

  /**
   * Decode `id` to get its edge.
   *
   * @param {string} id
   * @returns {LkEdge}
   */
  getEdgeFromId(id) {
    id = this.fullURIToShortName(id);
    const edgeJson = Buffer.from(id, 'base64').toString('ascii');
    const edgeTriple = JSON.parse(edgeJson);
    return {
      id: id,
      type: this.fullURIToShortName(edgeTriple[1]),
      source: edgeTriple[0],
      target: edgeTriple[2],
      data: {}
    };
  }

  /**
   * Return an array of indices containing the positions of characters in `str` that match
   * an unescaped `char`. The escape character is `escapeChar`.
   *
   * @param {string} str
   * @param {string} char
   * @param {string} escapeChar
   * @returns {number[]}
   * @private
   */
  _findUnescapedChar(str, char, escapeChar) {
    // We assume that the escapeChar escapes itself
    const result = [];
    let countOfEscape = 0;
    let idx = 0;
    for (const c of str) {
      if (c === char) {
        if (countOfEscape % 2 === 0) {
          result.push(idx);
        } else {
          countOfEscape = 0;
        }
      } else if (c === escapeChar) {
        countOfEscape++;
      } else {
        countOfEscape = 0;
      }
      idx++;
    }
    return result;
  }

  /**
   * Convert `o` into a literal.
   *
   * Note:
   * NaN, +Infinity and -Infinity will be converted to "NaN", "+Infinity" and "-Infinity"
   * respectively. It means that _revertLiteral(_toLiteral(NaN)) will result in "NaN".
   *
   * @param {any} o
   * @returns {string}
   */
  toLiteral(o) {
    switch (typeof o) {
      case 'boolean':
        return '"' + o + XML_SCHEMA_PREFIX + 'boolean' + '>';
      case 'number':
        if (isFinite(o)) {
          if (o % 1 === 0) {
            return '"' + o + XML_SCHEMA_PREFIX + 'integer' + '>';
          } else {
            return '"' + o + XML_SCHEMA_PREFIX + 'decimal' + '>';
          }
        }
        return '"' + o + '"'; // NaN, +Infinity and -Infinity
      default:
        return JSON.stringify(o);
    }
  }

  /**
   * Convert `str` back to the right data type.
   *
   * @param {string} str
   * @returns {any}
   * @throws {LkError} if `str` is not a valid literal
   */
  revertLiteral(str) {
    if (str.indexOf('"') !== 0) {
      throw Errors.technical('critical', '"' + str + '" isn\'t a valid literal.');
    }

    // We need to match all unescaped quotes in `str`
    const quotes = this._findUnescapedChar(str, '"', '\\');
    const jsonLiteral = str.substring(quotes[0], quotes[1] + 1);

    // we look for a type ("boolean", "decimal" or "integer")
    const nsIndex = str.lastIndexOf(XML_SCHEMA_PREFIX);

    if (nsIndex === -1) {
      // it's just a string literal
      return JSON.parse(jsonLiteral);
    }

    // we have a type
    const nsLength = XML_SCHEMA_PREFIX.length;
    const offset = nsIndex + nsLength;
    const type = str.substr(offset).slice(0, -1);
    const strippedLiteral = str.substr(1, nsIndex - 1); // literal stripped of '"' and schema

    switch (type) {
      case 'string':
        return JSON.parse(jsonLiteral);
      case 'boolean':
        return strippedLiteral === 'true';
      case 'decimal':
      case 'integer': {
        const num = Number(strippedLiteral);
        if (num <= Number.MIN_SAFE_INTEGER || num >= Number.MAX_SAFE_INTEGER) {
          return strippedLiteral;
        } else {
          return num;
        }
      }
      default:
        return JSON.parse(jsonLiteral);
    }
  }

  /**
   * Convert `edge` into a single RDF statement.
   * The result is an array of size 3 of non-empty strings.
   *
   * @param {LkEdge} edge
   * @returns {string[]} statements
   */
  formatEdgeToStatement(edge) {
    return [
      /**@type {string}*/ (edge.source),
      this.shortNameToFullURI(edge.type),
      /**@type {string}*/ (edge.target)
    ];
  }

  /**
   * Parse `statement` into a linkurious edge. We assume that the statement represents an edge.
   *
   * @param {string[]} statement
   * @returns {LkEdge}
   */
  parseStatementForEdge(statement) {
    const edge = {
      id: '',
      source: statement[0],
      type: this.fullURIToShortName(statement[1]),
      target: statement[2],
      data: {}
    };
    edge.id = this.getIdFromEdge(edge);
    return edge;
  }

  /**
   * Convert `node` into multiple RDF statements.
   * The result is an array of array of size 3 of non-empty strings.
   *
   * @param {LkNode} node
   * @returns {string[][]} statements
   * @throws {LkError} if there are both no properties and no categories
   */
  formatNodeToStatements(node) {
    // create a triple for each property
    const triples = /**@type {string[][]}*/ (_.toPairs(node.data).map(kv => [
      node.id,
      this.shortNameToFullURI(kv[0]),
      this.toLiteral(kv[1])
    ]));

    // create a triple for each category
    _.each(node.categories, category => {
      triples.push([
        node.id,
        this._categoryPredicate,
        this.formatCategoryValue(category)
      ]);
    });

    return triples;
  }

  /**
   * Parse `statements` into a linkurious node.
   * `statements` has to be at least of size 1.
   * In case of error, this logs a warning and can return `null`.
   *
   * @param {string[][]} statements
   * @throws {LkError} if the statement is invalid (fullURIToShortName and revertLiteral throws)
   * @returns {LkNode}
   */
  parseStatementsForNode(statements) {
    if (statements.length === 0) {
      throw Errors.technical('bug',
        'SparqlUtils::parseStatementsForNode: At least one statement is required.');
    }

    const node = {id: statements[0][0], data: {}, categories: []};

    _.each(statements, statement => {
      if (this.statementIsAProperty(statement)) {
        node.data[this.fullURIToShortName(statement[1])] =
          this.revertLiteral(statement[2]);
      } else if (this.statementIsACategory(statement)) {
        node.categories.push(this.parseCategoryValue(statement[2]));
      } else if (this.statementIsAnEdge(statement)) {
        // ignore edges
      } else {
        Log.warn('SparqlUtils::parseStatementsForNode: invalid statement: "' + statement + '"');
      }
    });

    // categories have to be sorted to be compliant to other DAOs
    node.categories.sort();

    if (Utils.hasValue(this._idPropertyName)) {
      node.data[this._idPropertyName] = this.fullURIToShortName(node.id);
    }

    return node;
  }

  /**
   * Return true if `statement` is an array of size 3 (or of size 4) of non-empty strings.
   * We allow size 4 to support statements with "graph".
   *
   * @param {string[]} statement RDF triple
   * @returns {boolean}
   */
  statementIsATriple(statement) {
    try {
      Utils.check.stringArray('statement', statement, 3, 4, true);
    } catch(e) {
      return false;
    }

    return true;
  }

  /**
   * Return true if `statement` represents an edge.
   *
   * We assume that the statement is a valid triple.
   *
   * @param {string[]} statement RDF triple
   * @returns {boolean}
   */
  statementIsAnEdge(statement) {
    return statement[1] !== this._categoryPredicate &&
      (this.isURI(statement[2]) || this.isBlankNode(statement[2]));
  }

  /**
   * Return true if `statement` represents a property.
   *
   * We assume that the statement is a valid triple.
   *
   * @param {string[]} statement RDF triple
   * @returns {boolean}
   */
  statementIsAProperty(statement) {
    return statement[1] !== this._categoryPredicate && this.isLiteral(statement[2]);
  }

  /**
   * Return true if `statement` represents a category.
   *
   * We assume that the statement is a valid triple.
   *
   * @param {string[]} statement RDF triple
   * @returns {boolean}
   */
  statementIsACategory(statement) {
    return statement[1] === this._categoryPredicate;
  }

  /**
   * Format `category` to a SPARQL statement object.
   *
   * @param {string} category
   * @returns {string}
   */
  formatCategoryValue(category) {
    if (this.isPrefixNotation(category)) {
      return this.shortNameToFullURI(category);
    } else if (this.isURI(category) || this.isBlankNode(category)) {
      return category;
    } else {
      // literal
      return this.toLiteral(category);
    }
  }

  /**
   * Parse `category` from a SPARQL statement object to an LkNode category.
   *
   * @param {string} category
   * @returns {string}
   */
  parseCategoryValue(category) {
    if (this.isLiteral(category)) {
      return this.revertLiteral(category);
    } else {
      return this.fullURIToShortName(category);
    }
  }

  /**
   * Iterate over an array of ids and wrap in angle brackets every blank node id found.
   *
   * @param {string[]} ids
   * @returns {string[]}
   */
  wrapBlankNodesInAngleBrackets(ids) {
    return ids.map(id => {
      if (this.isBlankNode(id)) {
        return '<' + id + '>'; // wrap in angle bracket
      }

      return id;
    });
  }
}

module.exports = SparqlUtils;
