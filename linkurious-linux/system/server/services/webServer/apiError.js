/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 */
'use strict';

// services
const LKE = require('../index');
const Log = LKE.getLogger(__filename);
const Errors = LKE.getErrors();

const ERRORS_MAP = {

  // GENERIC errors
  // --------------

  /**
   * Two (or more) parameters of a function/API are mutually exclusive.
   *
   * E.g.: "getAdjacentEdges: cannot use 'source' and 'target' parameter at the same time"
   */
  'conflict_parameter': {
    code: 400,
    message: 'Conflict in parameters.'
  },

  /**
   * A strong code assertion has failed.
   *
   * E.g.: "DataSource.getSourceInfo cannot be called before 'storeId' is set"
   */
  bug: {
    code: 500,
    message: 'Critical internal error.'
  },

  /**
   * An unexpected technical error has occurred.
   * The error is often involving a third party that did not respond as expected.
   *
   * E.g.: "Could not create group in SQL database"
   */
  critical: {
    code: 500,
    message: 'Critical Error'
  },

  /**
   * A parameter provided to a function or API does not have the expected type/value
   *
   * E.g.: "Parameter 'with_version' must be a boolean"
   */
  'invalid_parameter': {
    code: 400,
    message: 'Invalid Parameters.'
  },

  /**
   * A required parameter provided to a function or API is missing.
   *
   * E.g.: "The 'sourceKey' parameter is required"
   */
  'missing_field': {
    code: 400,
    message: 'Missing field.'
  },

  /**
   * Generic not found error, used for:
   *  - Folder,
   *  - Visualization
   *  - DataSource
   *  - Group
   *  - AccessRight
   *  - Alert
   *  - AlertMatch
   *
   * For nodes and edges, use node_not_found and edge_not_found.
   *
   * E.g.: "The Folder #888 was not found"
   */
  'not_found': {
    code: 404,
    message: 'Not Found.'
  },

  'redundant_action': {
    code: 409,
    message: 'The action you are trying to perform is redundant (nothing to do).'
  },

  // Feature-related (expected) Soft Failures
  // ----------------------------------------

  /**
   * We decided not to implement a feature under certain conditions.
   *
   * E.g.: "Alerts are not available in Linkurious Starter edition."
   */
  'not_implemented': {
    code: 501,
    message: 'Not Implemented.'
  },

  /**
   * We don't support a particular version of an third party service.
   *
   * E.g.: "Versions of ElasticSearch less than 1.0.0 are not supported"
   */
  'not_supported': {
    code: 501,
    message: 'Not Supported.'
  },

  /**
   * A feature cannot be used because it was disabled by configuration.
   *
   * E.g.: "Trying to authenticate with Azure AD, but Azure AD is disabled in configuration"
   */
  'feature_disabled': {
    code: 400,
    message: 'This feature has been disabled.'
  },

  // H.T.T.P. Server
  // ---------------

  /**
   * The HTTP server cannot start because the port is already used by another process.
   */
  'port_busy': {
    code: 500,
    message: 'The WebServer port is busy.'
  },

  /**
   * The HTTP server cannot start because the port is not usable by the owner of the Linkurious process
   */
  'port_restricted': {
    code: 500,
    message: 'The WebServer port is under 1024, you need root access.'
  },

  'https_required': {
    code: 400,
    message: 'Linkurious was configured to refuse HTTP requests, please switch to HTTPS.'
  },

  'api_not_found': {
    code: 404,
    message: 'API not found.'
  },

  // User Administration
  // -------------------

  'email_format': {
    code: 400,
    message: 'Email format is incorrect.'
  },

  'user_exists': {
    code: 409,
    message: 'Username or email already registered.'
  },

  'group_exists': {
    code: 409,
    message: 'Group name already used.'
  },

  'user_not_found': {
    code: 404,
    message: 'Could not find referenced user.'
  },

  // Visualization/Widget/Folder edition
  // -----------------------------------

  'visualization_locked': {
    code: 409,
    message: 'This visualization is currently locked by another user.'
  },

  'widget_exists': {
    code: 409,
    message: 'A widget already exists for this visualization.'
  },

  'folder_collision': {
    code: 409,
    message: 'A folder with the same name already exists at this location.'
  },

  'folder_deletion_failed': {
    code: 409,
    message: 'Could not delete this folder.'
  },

  // Node/Edge Edition
  // -----------------

  'creation_failed': {
    code: 500,
    message: 'Could not created this item.'
  },

  'edit_conflict': {
    code: 409,
    message: 'The graph item you are trying to edit has changed.'
  },

  // Edge/Node Reading

  'edge_not_found': {
    code: 404,
    message: 'Edge not found.'
  },

  'node_not_found': {
    code: 404,
    message: 'No node with this Id.'
  },

  // L.D.A.P.
  // --------

  'ldap_bind_error': {
    code: 500,
    message: 'Could not connect to LDAP server.'
  },

  // Authentication
  // --------------

  /**
   * The current action required to be authenticated.
   *
   * E.g.: "Cannot open a visualization without being authenticated"
   */
  unauthorized: {
    code: 401,
    message: 'Unauthorized.'
  },

  /**
   * A specific type of 'forbidden' when administrator rights are required.
   *
   * E.g.: "Alerts can only be created by a administrators"
   */
  'admin_required': {
    code: 403,
    message: 'You must be an administrator to do this.'
  },

  /**
   * A specific type of 'forbidden' when a user tries to use an API in Guest Mode while Guest Mode
   * is disabled.
   */
  'guest_disabled': {
    code: 403,
    message: 'Guest mode is disabled.'
  },

  'bad_credentials': {
    code: 401,
    message: 'Incorrect username/email or password.'
  },

  'session_expired': {
    code: 401,
    message: 'Your session was evicted because of inactivity.'
  },

  'session_evicted': {
    code: 401,
    message: 'Your session was evicted because the server was full and an admin logged in.'
  },

  'server_full': {
    code: 401,
    message: 'The server has too many concurrent users, please try later or buy more licenses.'
  },

  // Access Control
  // --------------

  'readonly_right': {
    code: 403,
    message: 'Linkurious is in read-only mode.'
  },

  'node_property_hidden': {
    code: 400,
    message: 'You tried to access a hidden node property, contact your system administrator.'
  },
  'edge_property_hidden': {
    code: 400,
    message: 'You tried to access a hidden edge property, contact your system administrator.'
  },

  /**
   * The current user cannot do an action.
   *
   * E.g.: "You cannot delete a widget that you don't own"
   */
  forbidden: {
    code: 403,
    message: 'Forbidden.'
  },

  'read_forbidden': {
    code: 403,
    message: 'You don\'t have read access to this information.'
  },

  /**
   * The current user is trying to write an information he an has no write-access to.
   * Used for:
   * - Editing builtin groups
   * - Running raw queries with write statements without the appropriate action AccessRight
   * - Creating/Updating/Deleting a node without the appropriate action AccessRight
   * - Creating/Updating/Deleting an edge without the appropriate action AccessRight
   * - Trying to edit items in a read-only DataSource
   * - Updating a visualization without the appropriate AccessRight
   * - Updating/Deleting a Folder without the appropriate AccessRight
   *
   * E.g.: "You don't have write-access to this node"
   */
  'write_forbidden': {
    code: 403,
    message: 'You don\'t have write access to this information.'
  },

  // Raw Graph Queries
  // -----------------

  /**
   * A graph-server request failed because the query was invalid (bad syntax).
   *
   * E.g.: "Neo4j could not run query 'MATCH (a)-[e]-(b)': RETURN statement is missing"
   */
  'bad_graph_request': {
    code: 400,
    message: 'You have issued a bad graph request.'
  },

  /**
   * A graph-server request failed because the request timed out.
   *
   * E.g. "Neo4j query timed out after 60 seconds. Query was: 'MATCH (a)-[...]-(b) RETURN *'"
   */
  'graph_request_timeout': {
    code: 504,
    message: 'The graph database did not respond in a timely manner.'
  },

  // Configuration
  // -------------

  /**
   * The configuration is invalid.
   *
   * E.g.: "Configuration field 'dataSources.0.graphdb.vendor' must be a string"
   */
  'invalid_configuration': {
    code: 400,
    message: 'The current configuration has errors.'
  },

  // Data-source
  // -----------

  /**
   * A data-source needs an user action.
   *
   * E.g.: A search index doesn't exist in an external indexDAO.
   */
  'source_action_needed': {
    code: 400,
    messages: 'The data-source needs a user action before it can be used with Linkurious.'
  },

  'dataSource_unavailable': {
    code: 404,
    message: 'Data-source not found or not connected.'
  },

  /**
   * The current state of the data-source does not allow for the requested action.
   *
   * E.g.: "Cannot 'reconnect' data-source #2 while it is indexing"
   */
  'illegal_source_state': {
    code: 409,
    message: 'The data-source is in the wrong state for this operation.'
  },

  /**
   * Only thrown by GraphDAO.connect and GraphDAO.checkUp when the graph server is not reachable.
   *
   * E.g.: "Cannot connect Neo4j: no route to host"
   */
  'graph_unreachable': {
    code: 404,
    message: 'Cannot connect to Graph database.'
  },

  /**
   * Only thrown by IndexDAO.connect and IndexDAO.checkUp when the index server is not reachable.
   *
   * E.g.: "Cannot connect to ElasticSearch: connection reset"
   */
  'index_unreachable': {
    code: 404,
    message: 'Cannot connect to Search Index.'
  },

  'index_mapping_error': {
    code: 500,
    message: 'Unexpected property type. ' +
      'Try setting "dynamicMapping:false" in the index configuration.'
  }
};

/**
 * Convert an application error into an HTTP error (with status code).
 *
 * @param {string} key       An error key found in ERROR_MAP
 * @param {string} [message] A human readable description of the error
 * @param {string} [type]    An LkError error type
 * @returns {{key: string, code: number, message: string}} An HTTP error description with 'key', 'code' (HTTP status) and 'message'
 */
function apiError(key, message, type) {
  const errorTemplate = ERRORS_MAP[key];
  if (errorTemplate) {
    return {
      code: errorTemplate.code,
      key: key,
      message: message || errorTemplate.message
    };
  } else {
    Log.warn('Unknown error key "' + key + '" (' + message + ')');

    if (type === Errors.LkError.Type.ACCESS) {
      return {
        code: 401,
        key: key,
        message: message || 'Unauthorized'
      };
    } else if (type === Errors.LkError.Type.BUSINESS) {
      return {
        code: 400,
        key: key,
        message: message || 'Bad request'
      };
    } else {
      return {
        code: 500,
        key: key,
        message: message || 'Internal error'
      };
    }
  }
}
apiError.errors = ERRORS_MAP;

module.exports = apiError;
