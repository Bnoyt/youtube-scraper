define({ "api": [
  {
    "type": "post",
    "url": "/api/admin/:dataSource/alerts",
    "title": "Create an alert",
    "name": "CreateAlert",
    "group": "Alerts",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.alerts"
      }
    ],
    "description": "<p>Create a new alert. If <code>matchTTL</code> is set to 0, unconfirmed matches will disappear when they stop matching the alert query.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "title",
            "description": "<p>Title of the alert</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "query",
            "description": "<p>Graph query that will run periodically</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dialect",
            "description": "<p>Dialect of the graph query</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": false,
            "field": "enabled",
            "description": "<p>Whether the query will run periodically or not</p>"
          },
          {
            "group": "Parameter",
            "type": "object[]",
            "optional": true,
            "field": "columns",
            "description": "<p>Columns among the returned values of the query to save in a match as scalar values (<strong>maximum 5</strong>)</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"number\"",
              "\"string\""
            ],
            "optional": false,
            "field": "columns.type",
            "description": "<p>Type of the column</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "columns.columnName",
            "description": "<p>Name of the column in the query</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "columns.columnTitle",
            "description": "<p>Name of the column for the UI</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "cron",
            "description": "<p>CRON expression representing the frequency with which the query runs</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "matchTTL",
            "description": "<p>Number of days after which the matches of this alert are going to be deleted</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "maxMatches",
            "description": "<p>Maximum number of matches after which matches with lower scores are discarded</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/alert.js",
    "groupTitle": "Alerts",
    "success": {
      "fields": {
        "Success 201": [
          {
            "group": "Success 201",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the alert</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "title",
            "description": "<p>Title of the alert</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "sourceKey",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "query",
            "description": "<p>Graph query that will run periodically</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "dialect",
            "description": "<p>Dialect of the graph query</p>"
          },
          {
            "group": "Success 201",
            "type": "boolean",
            "optional": false,
            "field": "enabled",
            "description": "<p>Whether the query will run periodically or not</p>"
          },
          {
            "group": "Success 201",
            "type": "object[]",
            "optional": false,
            "field": "columns",
            "description": "<p>Columns among the returned values of the query to save in a match as scalar values</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "allowedValues": [
              "\"number\"",
              "\"string\""
            ],
            "optional": false,
            "field": "columns.type",
            "description": "<p>Type of the column</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "columns.columnName",
            "description": "<p>Name of the column in the query</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "columns.columnTitle",
            "description": "<p>Name of the column for the UI</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "cron",
            "description": "<p>CRON expression representing the frequency with which the query runs</p>"
          },
          {
            "group": "Success 201",
            "type": "number",
            "optional": false,
            "field": "matchTTL",
            "description": "<p>Number of days after which the matches of this alert are going to be deleted</p>"
          },
          {
            "group": "Success 201",
            "type": "number",
            "optional": false,
            "field": "maxMatches",
            "description": "<p>Maximum number of matches after which matches with lower scores are discarded</p>"
          },
          {
            "group": "Success 201",
            "type": "number",
            "optional": false,
            "field": "userId",
            "description": "<p>ID of the user that created the alert</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "lastRun",
            "description": "<p>Last time the query was executed in ISO-8601 format (<code>null</code> it was never executed)</p>"
          },
          {
            "group": "Success 201",
            "type": "object",
            "optional": false,
            "field": "lastRunProblem",
            "description": "<p>Object representing the problem in the last run (<code>null</code> if there wasn't a problem in the last run)</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "lastRunProblem.error",
            "description": "<p>Error that identifies the last run problem</p>"
          },
          {
            "group": "Success 201",
            "type": "boolean",
            "optional": false,
            "field": "lastRunProblem.partial",
            "description": "<p>Whether the last run was at least partially executed</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "nextRun",
            "description": "<p>Date when the alert will be executed next in ISO-8601 format (<code>null</code> if it isn't scheduled)</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 201 OK\n{\n  \"id\": 8,\n  \"title\": \"alert_title\",\n  \"sourceKey\": \"584f2569\",\n  \"query\": \"MATCH (n1)-[r:DIRECTED]-(n2) RETURN n1, n1.score\",\n  \"dialect\": \"cypher\",\n  \"enabled\": true,\n  \"columns\": [\n    {\"type\": \"number\", \"columnName\": \"n1.score\", \"columnTitle\": \"Score\"}\n  ],\n  \"cron\": \"0 0 * * *\",\n  \"matchTTL\": 30,\n  \"maxMatches\": 20,\n  \"userId\": 1,\n  \"lastRun\": null,\n  \"lastRunProblem\": null,\n  \"updatedAt\": \"2016-05-16T08:23:35.730Z\",\n  \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n  \"nextRun\": \"2016-08-15T00:00:00.000Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "delete",
    "url": "/api/admin/:dataSource/alerts/:alertId",
    "title": "Delete an alert",
    "name": "DeleteAlert",
    "group": "Alerts",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.alerts"
      }
    ],
    "description": "<p>Delete the alert selected by id and all its matches.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "alertId",
            "description": "<p>ID of the alert</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 204 No Content",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/admin/alert.js",
    "groupTitle": "Alerts"
  },
  {
    "type": "post",
    "url": "/api/:dataSource/alerts/:alertId/matches/:matchId/action",
    "title": "Do an action on a match",
    "name": "DoMatchAction",
    "group": "Alerts",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:alert.doAction"
      }
    ],
    "description": "<p>Do an action (open, dismiss, confirm, unconfirm) on a match.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "alertId",
            "description": "<p>ID of the alert</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "matchId",
            "description": "<p>ID of the match</p>"
          }
        ],
        "body": [
          {
            "group": "body",
            "type": "string",
            "allowedValues": [
              "\"confirm\"",
              "\"dismiss\"",
              "\"unconfirm\"",
              "\"open\""
            ],
            "optional": false,
            "field": "action",
            "description": "<p>The action to perform</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 204 No Content",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/alert.js",
    "groupTitle": "Alerts"
  },
  {
    "type": "get",
    "url": "/api/admin/:dataSource/alert/:alertId",
    "title": "Get an alert",
    "name": "GetAlert",
    "group": "Alerts",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.alerts"
      }
    ],
    "description": "<p>Get the alert selected by id.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "alertId",
            "description": "<p>ID of the alert</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/alert.js",
    "groupTitle": "Alerts",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "title",
            "description": "<p>Title of the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sourceKey",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "query",
            "description": "<p>Graph query that will run periodically</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "dialect",
            "description": "<p>Dialect of the graph query</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "enabled",
            "description": "<p>Whether the query will run periodically or not</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "columns",
            "description": "<p>Columns among the returned values of the query to save in a match as scalar values</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"number\"",
              "\"string\""
            ],
            "optional": false,
            "field": "columns.type",
            "description": "<p>Type of the column</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "columns.columnName",
            "description": "<p>Name of the column in the query</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "columns.columnTitle",
            "description": "<p>Name of the column for the UI</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "cron",
            "description": "<p>CRON expression representing the frequency with which the query runs</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "matchTTL",
            "description": "<p>Number of days after which the matches of this alert are going to be deleted</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "maxMatches",
            "description": "<p>Maximum number of matches after which matches with lower scores are discarded</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "userId",
            "description": "<p>ID of the user that created the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "lastRun",
            "description": "<p>Last time the query was executed in ISO-8601 format (<code>null</code> it was never executed)</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "lastRunProblem",
            "description": "<p>Object representing the problem in the last run (<code>null</code> if there wasn't a problem in the last run)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "lastRunProblem.error",
            "description": "<p>Error that identifies the last run problem</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "lastRunProblem.partial",
            "description": "<p>Whether the last run was at least partially executed</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nextRun",
            "description": "<p>Date when the alert will be executed next in ISO-8601 format (<code>null</code> if it isn't scheduled)</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 8,\n  \"title\": \"alert_title\",\n  \"sourceKey\": \"584f2569\",\n  \"query\": \"MATCH (n1)-[r:DIRECTED]-(n2) RETURN n1, n1.score\",\n  \"dialect\": \"cypher\",\n  \"enabled\": true,\n  \"columns\": [\n    {\"type\": \"number\", \"columnName\": \"n1.score\", \"columnTitle\": \"Score\"}\n  ],\n  \"cron\": \"0 0 * * *\",\n  \"matchTTL\": 30,\n  \"maxMatches\": 20,\n  \"userId\": 1,\n  \"lastRun\": null,\n  \"lastRunProblem\": null,\n  \"updatedAt\": \"2016-05-16T08:23:35.730Z\",\n  \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n  \"nextRun\": \"2016-08-15T00:00:00.000Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/:dataSource/alerts/:alertId",
    "title": "Get an alert (User)",
    "name": "GetAlertForUsers",
    "group": "Alerts",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:alert.read"
      }
    ],
    "description": "<p>Get the alert selected by id. The fields are filtered to be viewed by a simple user.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "alertId",
            "description": "<p>ID of the alert</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/alert.js",
    "groupTitle": "Alerts",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "title",
            "description": "<p>Title of the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sourceKey",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "columns",
            "description": "<p>Columns among the returned values of the query to save in a match as scalar values</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"number\"",
              "\"string\""
            ],
            "optional": false,
            "field": "columns.type",
            "description": "<p>Type of the column</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "columns.columnName",
            "description": "<p>Name of the column in the query</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "columns.columnTitle",
            "description": "<p>Name of the column for the UI</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "lastRun",
            "description": "<p>Last time the query was executed in ISO-8601 format (<code>null</code> it was never executed)</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 7,\n  \"title\": \"alert title\",\n  \"sourceKey\": \"584f2569\",\n  \"columns\": [\n    {\"type\": \"number\", \"columnName\": \"n1.score\", \"columnTitle\": \"Score\"}\n  ],\n  \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n  \"updatedAt\": \"2016-05-16T08:23:35.730Z\",\n  \"lastRun\": \"2016-05-16T08:23:35.730Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/admin/:dataSource/alerts",
    "title": "Get all the alerts",
    "name": "GetAlerts",
    "group": "Alerts",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.alerts"
      }
    ],
    "description": "<p>Get all the alerts of a given data-source ordered by creation date.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/alert.js",
    "groupTitle": "Alerts",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "alerts",
            "description": "<p>Alerts</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "alerts.id",
            "description": "<p>ID of the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.title",
            "description": "<p>Title of the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.sourceKey",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.query",
            "description": "<p>Graph query that will run periodically</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.dialect",
            "description": "<p>Dialect of the graph query</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "alerts.enabled",
            "description": "<p>Whether the query will run periodically or not</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "alerts.columns",
            "description": "<p>Columns among the returned values of the query to save in a match as scalar values</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"number\"",
              "\"string\""
            ],
            "optional": false,
            "field": "alerts.columns.type",
            "description": "<p>Type of the column</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.columns.columnName",
            "description": "<p>Name of the column in the query</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.columns.columnTitle",
            "description": "<p>Name of the column for the UI</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.cron",
            "description": "<p>CRON expression representing the frequency with which the query runs</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "alerts.matchTTL",
            "description": "<p>Number of days after which the matches of this alert are going to be deleted</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "alerts.maxMatches",
            "description": "<p>Maximum number of matches after which matches with lower scores are discarded</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "alerts.userId",
            "description": "<p>ID of the user that created the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.lastRun",
            "description": "<p>Last time the query was executed in ISO-8601 format (<code>null</code> it was never executed)</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "alerts.lastRunProblem",
            "description": "<p>Object representing the problem in the last run (<code>null</code> if there wasn't a problem in the last run)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.lastRunProblem.error",
            "description": "<p>Error that identifies the last run problem</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "alerts.lastRunProblem.partial",
            "description": "<p>Whether the last run was at least partially executed</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.nextRun",
            "description": "<p>Date when the alert will be executed next in ISO-8601 format (<code>null</code> if it isn't scheduled)</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n[\n  {\n    \"id\": 9,\n    \"title\": \"alert title 2\",\n    \"sourceKey\": \"584f2569\",\n    \"query\": \"MATCH (n1)-[r:DIRECTED]-(n2) RETURN n2, n2.score\",\n    \"dialect\": \"cypher\",\n    \"enabled\": true,\n    \"columns\": [\n      {\"type\": \"number\", \"columnName\": \"n2.score\", \"columnTitle\": \"Score\"}\n    ],\n    \"cron\": \"0 * * * *\",\n    \"matchTTL\": 30,\n    \"maxMatches\": 20,\n    \"userId\": 1,\n    \"lastRun\": null,\n    \"lastRunProblem\": null,\n    \"updatedAt\": \"2016-05-16T08:23:35.730Z\",\n    \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n    \"nextRun\": \"2016-08-15T00:00:00.000Z\"\n  },\n  {\n    \"id\": 8,\n    \"title\": \"alert title\",\n    \"sourceKey\": \"584f2569\",\n    \"query\": \"MATCH (n1)-[r:DIRECTED]-(n2) RETURN n1, n1.score\",\n    \"dialect\": \"cypher\",\n    \"enabled\": true,\n    \"columns\": [\n      {\"type\": \"number\", \"columnName\": \"n1.score\", \"columnTitle\": \"Score\"}\n    ],\n    \"cron\": \"0 0 * * *\",\n    \"matchTTL\": 30,\n    \"maxMatches\": 20,\n    \"userId\": 1,\n    \"lastRun\": null,\n    \"lastRunProblem\": null,\n    \"updatedAt\": \"2016-05-16T08:23:35.730Z\",\n    \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n    \"nextRun\": \"2016-08-15T00:00:00.000Z\"\n  }\n]",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/:dataSource/alerts",
    "title": "Get all the alerts (User)",
    "name": "GetAlertsForUsers",
    "group": "Alerts",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:alert.read"
      }
    ],
    "description": "<p>Get all the alerts of a given data-source ordered by creation date. The fields are filtered to be viewed by a simple user.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/alert.js",
    "groupTitle": "Alerts",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "alerts",
            "description": "<p>Alerts</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "alerts.id",
            "description": "<p>ID of the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.title",
            "description": "<p>Title of the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "alerts.enabled",
            "description": "<p>Whether the query will run periodically or not</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "alerts.columns",
            "description": "<p>Columns among the returned values of the query to save in a match as scalar values</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"number\"",
              "\"string\""
            ],
            "optional": false,
            "field": "alerts.columns.type",
            "description": "<p>Type of the column</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.columns.columnName",
            "description": "<p>Name of the column in the query</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.columns.columnTitle",
            "description": "<p>Name of the column for the UI</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.sourceKey",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "alerts.lastRun",
            "description": "<p>Last time the query was executed in ISO-8601 format (<code>null</code> it was never executed)</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n[\n  {\n    \"id\": 9,\n    \"title\": \"alert title 2\",\n    \"enabled\": true,\n    \"sourceKey\": \"584f2569\",\n    \"columns\": [\n      {\"type\": \"number\", \"columnName\": \"n1.score\", \"columnTitle\": \"Score\"}\n    ],\n    \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n    \"updatedAt\": \"2016-05-16T08:23:35.730Z\",\n    \"lastRun\": \"2016-05-16T08:23:35.730Z\"\n  },\n  {\n    \"id\": 8,\n    \"title\": \"alert title 1\",\n    \"enabled\": true,\n    \"sourceKey\": \"584f2569\",\n    \"columns\": [\n      {\"type\": \"number\", \"columnName\": \"n1.score\", \"columnTitle\": \"Score\"}\n    ],\n    \"createdAt\": \"2016-04-16T08:23:35.730Z\",\n    \"updatedAt\": \"2016-04-16T08:23:35.730Z\",\n    \"lastRun\": \"2016-05-16T08:23:35.730Z\"\n  }\n]",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/:dataSource/alerts/:alertId/matches/:matchId",
    "title": "Get a match",
    "name": "GetMatch",
    "group": "Alerts",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:alert.read"
      }
    ],
    "description": "<p>Get the match selected by id.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "alertId",
            "description": "<p>ID of the alert</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "matchId",
            "description": "<p>ID of the match</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/alert.js",
    "groupTitle": "Alerts",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the match</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sourceKey",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "alertId",
            "description": "<p>ID of the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "hash",
            "description": "<p>Hash of the match</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"unconfirmed\"",
              "\"confirmed\"",
              "\"dismissed\""
            ],
            "optional": false,
            "field": "status",
            "description": "<p>Status of the match</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "user",
            "description": "<p>Last user that changed the status (<code>null</code> if it was never changed)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "user.id",
            "description": "<p>ID of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "user.username",
            "description": "<p>Username of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "user.email",
            "description": "<p>E-mail of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "viewers",
            "description": "<p>Users that viewed the match (ordered by date in decreasing order)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "viewers.id",
            "description": "<p>ID of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "viewers.username",
            "description": "<p>Username of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "viewers.email",
            "description": "<p>E-mail of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "viewers.date",
            "description": "<p>Date of the view in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "type:id[]",
            "optional": false,
            "field": "nodes",
            "description": "<p>IDs of the nodes of the match</p>"
          },
          {
            "group": "Success 200",
            "type": "type:id[]",
            "optional": false,
            "field": "edges",
            "description": "<p>IDs of the edges of the match</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "columns",
            "description": "<p>Scalar value for a given column by index defined in the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "expirationDate",
            "description": "<p>Date in ISO-8601 format after which the match is deleted</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 1,\n  \"sourceKey\": \"584f2569\",\n  \"alertId\": 2,\n  \"hash\": \"897f54ff366922a4077c78955c77bcdd\",\n  \"status\": \"unconfirmed\",\n  \"user\": null,\n  \"viewers\": [],\n  \"nodes\": [5971, 5974],\n  \"edges\": [523],\n  \"columns\": [\n    1999\n  ],\n  \"expirationDate\": \"2016-05-26T08:23:35.730Z\",\n  \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n  \"updatedAt\": \"2016-05-16T08:23:35.730Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/:dataSource/alerts/:alertId/matches/:matchId/actions",
    "title": "Get all the actions of a match",
    "name": "GetMatchActions",
    "group": "Alerts",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:alert.read"
      }
    ],
    "description": "<p>Get all the actions of a match ordered by creation date.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "alertId",
            "description": "<p>ID of the alert</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "matchId",
            "description": "<p>ID of the match</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "matchActions",
            "description": "<p>Actions</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "matchActions.id",
            "description": "<p>ID of the action</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "matchActions.matchId",
            "description": "<p>ID of the match</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "matchActions.user",
            "description": "<p>User that did the action</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "matchActions.user.id",
            "description": "<p>ID of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "matchActions.user.username",
            "description": "<p>Username of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "matchActions.user.email",
            "description": "<p>E-mail of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"open\"",
              "\"confirm\"",
              "\"dismiss\"",
              "\"unconfirm\""
            ],
            "optional": false,
            "field": "matchActions.action",
            "description": "<p>The action performed</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "matchActions.createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "matchActions.updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n[\n  {\n    \"id\": 9,\n    \"matchId\": 3,\n    \"user\": {\n      \"id\": 1,\n      \"username\": \"alice\",\n      \"email\": \"alice@example.com\"\n    },\n    \"action\": \"dismiss\",\n    \"createdAt\": \"2016-06-16T08:22:35.730Z\",\n    \"updatedAt\": \"2016-06-16T08:22:35.730Z\"\n  },\n  {\n    \"id\": 8,\n    \"matchId\": 4,\n    \"user\": {\n      \"id\": 2,\n      \"username\": \"bob\",\n      \"email\": \"bob@example.com\"\n    },\n    \"action\": \"open\",\n    \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n    \"updatedAt\": \"2016-05-16T08:23:35.730Z\"\n  }\n]",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/alert.js",
    "groupTitle": "Alerts"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/alerts/:alertId/matches",
    "title": "Get all the matches of an alert",
    "name": "GetMatches",
    "group": "Alerts",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:alert.read"
      }
    ],
    "description": "<p>Get all the matches of an alert.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "alertId",
            "description": "<p>ID the alert</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "offset",
            "defaultValue": "0",
            "description": "<p>Offset from the first result</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "limit",
            "defaultValue": "20",
            "description": "<p>Page size (maximum number of returned matches)</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"asc\"",
              "\"desc\""
            ],
            "optional": true,
            "field": "sort_direction",
            "defaultValue": "desc",
            "description": "<p>Direction used to sort</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"date\"",
              "\"0\"",
              "\"1\"",
              "\"2\"",
              "\"3\"",
              "\"4\""
            ],
            "optional": true,
            "field": "sort_by",
            "defaultValue": "date",
            "description": "<p>Sort by date or a given column</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"unconfirmed\"",
              "\"confirmed\"",
              "\"dismissed\""
            ],
            "optional": true,
            "field": "status",
            "description": "<p>Filter on match status</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/alert.js",
    "groupTitle": "Alerts",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "counts",
            "description": "<p>Match counts</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "counts.unconfirmed",
            "description": "<p>Count of unconfirmed matches</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "counts.confirmed",
            "description": "<p>Count of confirmed matches</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "counts.dismissed",
            "description": "<p>Count of dismissed matches</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "matches",
            "description": "<p>Matches</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "matches.id",
            "description": "<p>ID of the match</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "matches.sourceKey",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "matches.alertId",
            "description": "<p>ID of the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "matches.hash",
            "description": "<p>Hash of the match</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"unconfirmed\"",
              "\"confirmed\""
            ],
            "optional": false,
            "field": "matches.status",
            "description": "<p>Status of the match</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "matches.user",
            "description": "<p>Last user that changed the status (<code>null</code> if it was never changed)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "matches.user.id",
            "description": "<p>ID of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "matches.user.username",
            "description": "<p>Username of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "matches.user.email",
            "description": "<p>E-mail of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "matches.viewers",
            "description": "<p>Users that viewed the match (ordered by date in decreasing order)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "matches.viewers.id",
            "description": "<p>ID of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "matches.viewers.username",
            "description": "<p>Username of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "matches.viewers.email",
            "description": "<p>E-mail of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "matches.viewers.date",
            "description": "<p>Date of the view in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "type:id[]",
            "optional": false,
            "field": "matches.nodes",
            "description": "<p>IDs of the nodes of the match</p>"
          },
          {
            "group": "Success 200",
            "type": "type:id[]",
            "optional": false,
            "field": "matches.edges",
            "description": "<p>IDs of the edges of the match</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "matches.columns",
            "description": "<p>Scalar value for a given column by index defined in the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "matches.expirationDate",
            "description": "<p>Date in ISO-8601 format after which the match is deleted</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "matches.createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "matches.updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"counts\": {\n    \"unconfirmed\": 1,\n    \"confirmed\": 1,\n    \"dismissed\": 0\n  },\n  \"matches\": [\n    {\n      \"id\": 1,\n      \"sourceKey\": \"584f2569\",\n      \"alertId\": 2,\n      \"hash\": \"897f54ff366922a4077c78955c77bcdd\",\n      \"status\": \"confirmed\",\n      \"user\": {\n        \"id\": 1,\n        \"username\": \"alice\",\n        \"email\": \"alice@example.com\"\n      },\n      \"viewers\": [\n        {\n          \"id\": 1,\n          \"username\": \"alice\",\n          \"email\": \"alice@example.com\",\n          \"date\": \"2016-05-16T08:13:35.030Z\"\n        }\n      ],\n      \"nodes\": [5971],\n      \"edges\": [],\n      \"columns\": [\n        1999\n      ],\n      \"expirationDate\": \"2016-05-26T08:23:35.730Z\",\n      \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n      \"updatedAt\": \"2016-05-16T08:23:35.730Z\"\n    },\n    {\n      \"id\": 2,\n      \"sourceKey\": \"584f2569\",\n      \"alertId\": 2,\n      \"hash\": \"5f221db1e438f2d9b7cdd284364e379b\",\n      \"status\": \"unconfirmed\",\n      \"user\": null,\n      \"viewers\": [],\n      \"nodes\": [5976],\n      \"edges\": [],\n      \"columns\": [\n        1998\n      ],\n      \"expirationDate\": \"2016-05-26T08:23:35.730Z\",\n      \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n      \"updatedAt\": \"2016-05-16T08:23:35.730Z\"\n    }\n  ]\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "patch",
    "url": "/api/admin/:dataSource/alerts/:alertId",
    "title": "Update an alert",
    "name": "UpdateAlert",
    "group": "Alerts",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.alerts"
      }
    ],
    "description": "<p>Update the alert selected by id. Updating an alert will results in all the previous detected matches deleted.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "alertId",
            "description": "<p>ID of the alert</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "title",
            "description": "<p>New title of the alert</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "query",
            "description": "<p>New graph query that will run periodically</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "dialect",
            "description": "<p>Dialect of the graph query</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "enabled",
            "description": "<p>Whether the query will run periodically or not</p>"
          },
          {
            "group": "Parameter",
            "type": "object[]",
            "optional": true,
            "field": "columns",
            "description": "<p>Columns among the returned values of the query to save in a match as scalar values</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"number\"",
              "\"string\""
            ],
            "optional": false,
            "field": "columns.type",
            "description": "<p>Type of the column</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "columns.columnName",
            "description": "<p>Name of the column in the query</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "columns.columnTitle",
            "description": "<p>Name of the column for the UI</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "cron",
            "description": "<p>CRON expression representing the frequency with which the query runs</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "matchTTL",
            "description": "<p>Number of days after which the matches of this alert are going to be deleted</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "maxMatches",
            "description": "<p>Maximum number of matches after which matches with lower scores are discarded</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/alert.js",
    "groupTitle": "Alerts",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "title",
            "description": "<p>Title of the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sourceKey",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "query",
            "description": "<p>Graph query that will run periodically</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "dialect",
            "description": "<p>Dialect of the graph query</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "enabled",
            "description": "<p>Whether the query will run periodically or not</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "columns",
            "description": "<p>Columns among the returned values of the query to save in a match as scalar values</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"number\"",
              "\"string\""
            ],
            "optional": false,
            "field": "columns.type",
            "description": "<p>Type of the column</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "columns.columnName",
            "description": "<p>Name of the column in the query</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "columns.columnTitle",
            "description": "<p>Name of the column for the UI</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "cron",
            "description": "<p>CRON expression representing the frequency with which the query runs</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "matchTTL",
            "description": "<p>Number of days after which the matches of this alert are going to be deleted</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "maxMatches",
            "description": "<p>Maximum number of matches after which matches with lower scores are discarded</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "userId",
            "description": "<p>ID of the user that created the alert</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "lastRun",
            "description": "<p>Last time the query was executed in ISO-8601 format (<code>null</code> it was never executed)</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "lastRunProblem",
            "description": "<p>Object representing the problem in the last run (<code>null</code> if there wasn't a problem in the last run)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "lastRunProblem.error",
            "description": "<p>Error that identifies the last run problem</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "lastRunProblem.partial",
            "description": "<p>Whether the last run was at least partially executed</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nextRun",
            "description": "<p>Date when the alert will be executed next in ISO-8601 format (<code>null</code> if it isn't scheduled)</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 8,\n  \"title\": \"alert_title\",\n  \"sourceKey\": \"584f2569\",\n  \"query\": \"MATCH (n1)-[r:DIRECTED]-(n2) RETURN n1, n1.score\",\n  \"dialect\": \"cypher\",\n  \"enabled\": true,\n  \"columns\": [\n    {\"type\": \"number\", \"columnName\": \"n1.score\", \"columnTitle\": \"Score\"}\n  ],\n  \"cron\": \"0 0 * * *\",\n  \"matchTTL\": 30,\n  \"maxMatches\": 20,\n  \"userId\": 1,\n  \"lastRun\": null,\n  \"lastRunProblem\": null,\n  \"updatedAt\": \"2016-05-16T08:23:35.730Z\",\n  \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n  \"nextRun\": \"2016-08-15T00:00:00.000Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/api/admin/applications",
    "title": "Create an application",
    "name": "CreateApplication",
    "group": "Applications",
    "permission": [
      {
        "name": "action:admin.app"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Add a new API application.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "name",
            "description": "<p>Name of the application</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "enabled",
            "defaultValue": "true",
            "description": "<p>Whether the application is enabled</p>"
          },
          {
            "group": "Parameter",
            "type": "number[]",
            "optional": false,
            "field": "groups",
            "description": "<p>IDs of the groups the application can act on behalf of</p>"
          },
          {
            "group": "Parameter",
            "type": "string[]",
            "allowedValues": [
              "\"visualization.read\"",
              "\"visualization.create\"",
              "\"visualization.edit\"",
              "\"visualization.delete\"",
              "\"visualization.list\"",
              "\"visualizationFolder.create\"",
              "\"visualizationFolder.edit\"",
              "\"visualizationFolder.delete\"",
              "\"visualizationShare.read\"",
              "\"visualizationShare.create\"",
              "\"visualizationShare.delete\"",
              "\"sandbox\"",
              "\"widget.read\"",
              "\"widget.create\"",
              "\"widget.edit\"",
              "\"widget.delete\"",
              "\"graphItem.read\"",
              "\"graphItem.create\"",
              "\"graphItem.edit\"",
              "\"graphItem.delete\"",
              "\"graphItem.search\"",
              "\"savedGraphQuery.read\"",
              "\"savedGraphQuery.create\"",
              "\"savedGraphQuery.edit\"",
              "\"savedGraphQuery.delete\"",
              "\"graph.rawRead\"",
              "\"graph.rawWrite\"",
              "\"graph.shortestPath\"",
              "\"alert.read\"",
              "\"alert.doAction\"",
              "\"schema\""
            ],
            "optional": false,
            "field": "rights",
            "description": "<p>Enabled actions for the application</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/applications.js",
    "groupTitle": "Applications",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the application</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "name",
            "description": "<p>Name of the application</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "apiKey",
            "description": "<p>Generated key (32 hexadecimal characters)</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "enabled",
            "description": "<p>Whether the application is enabled</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "rights",
            "description": "<p>Enabled actions for the application</p>"
          },
          {
            "group": "Success 200",
            "type": "type:group[]",
            "optional": false,
            "field": "groups",
            "description": "<p>Groups the application can act on behalf of</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 1,\n  \"enabled\": true,\n  \"apiKey\": \"76554081e5b0a2d7852deec4990ebc58\",\n  \"name\": \"test_app\",\n  \"rights\": [\n    \"visualization.create\",\n    \"visualization.edit\",\n    \"visualization.read\",\n    \"visualization.delete\"\n  ],\n  \"groups\": [\n    {\n      \"id\": 3,\n      \"name\": \"read and edit\",\n      \"builtin\": true,\n      \"sourceKey\": \"584f2569\"\n    }\n  ],\n  \"createdAt\": \"2017-01-24T11:16:03.445Z\",\n  \"updatedAt\": \"2017-01-24T11:16:03.445Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/admin/applications",
    "title": "Get all the applications",
    "name": "GetApplications",
    "group": "Applications",
    "permission": [
      {
        "name": "action:admin.app"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Get all the API applications.</p>",
    "filename": "server/services/webServer/routes/admin/applications.js",
    "groupTitle": "Applications",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "applications",
            "description": "<p>Applications</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "applications.id",
            "description": "<p>ID of the application</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "applications.name",
            "description": "<p>Name of the application</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "applications.apiKey",
            "description": "<p>Generated key (32 hexadecimal characters)</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "applications.enabled",
            "description": "<p>Whether the application is enabled</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "applications.rights",
            "description": "<p>Enabled actions for the application</p>"
          },
          {
            "group": "Success 200",
            "type": "type:group[]",
            "optional": false,
            "field": "applications.groups",
            "description": "<p>Groups the application can act on behalf of</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "applications.createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "applications.updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n[\n  {\n    \"id\": 1,\n    \"enabled\": true,\n    \"apiKey\": \"e3fadcbd39ddb21fe8ecb206dadff36d\",\n    \"name\": \"test_app\",\n    \"rights\": [\n      \"visualization.create\",\n      \"visualization.edit\",\n      \"visualization.read\",\n      \"visualization.delete\"\n    ],\n    \"groups\": [\n      {\n        \"id\": 3,\n        \"name\": \"read and edit\",\n        \"builtin\": true,\n        \"sourceKey\": \"584f2569\"\n      }\n    ],\n    \"createdAt\": \"2017-01-24T11:14:51.337Z\",\n    \"updatedAt\": \"2017-01-24T11:31:13.769Z\"\n  },\n  {\n    \"id\": 2,\n    \"enabled\": true,\n    \"apiKey\": \"738c9f3b66aad7218c69843a78905ccd\",\n    \"name\": \"test_app_2\",\n    \"rights\": [\n      \"visualization.read\"\n    ],\n    \"groups\": [\n      {\n        \"id\": 2,\n        \"name\": \"read\",\n        \"builtin\": true,\n        \"sourceKey\": \"584f2569\"\n      }\n    ],\n    \"createdAt\": \"2017-01-24T11:16:02.417Z\",\n    \"updatedAt\": \"2017-01-24T11:16:02.417Z\"\n  }\n]",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "patch",
    "url": "/api/admin/applications/:id",
    "title": "Update an application",
    "name": "UpdateApplication",
    "group": "Applications",
    "permission": [
      {
        "name": "action:admin.app"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Update an API application.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "name",
            "description": "<p>Name of the application</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "enabled",
            "defaultValue": "true",
            "description": "<p>Whether the application is enabled</p>"
          },
          {
            "group": "Parameter",
            "type": "number[]",
            "optional": true,
            "field": "groups",
            "description": "<p>IDs of the groups the application can act on behalf of</p>"
          },
          {
            "group": "Parameter",
            "type": "string[]",
            "allowedValues": [
              "\"visualization.read\"",
              "\"visualization.create\"",
              "\"visualization.edit\"",
              "\"visualization.delete\"",
              "\"visualization.list\"",
              "\"visualizationFolder.create\"",
              "\"visualizationFolder.edit\"",
              "\"visualizationFolder.delete\"",
              "\"visualizationShare.read\"",
              "\"visualizationShare.create\"",
              "\"visualizationShare.delete\"",
              "\"sandbox\"",
              "\"widget.read\"",
              "\"widget.create\"",
              "\"widget.edit\"",
              "\"widget.delete\"",
              "\"graphItem.read\"",
              "\"graphItem.create\"",
              "\"graphItem.edit\"",
              "\"graphItem.delete\"",
              "\"graphItem.search\"",
              "\"savedGraphQuery.read\"",
              "\"savedGraphQuery.create\"",
              "\"savedGraphQuery.edit\"",
              "\"savedGraphQuery.delete\"",
              "\"graph.rawRead\"",
              "\"graph.rawWrite\"",
              "\"graph.shortestPath\"",
              "\"alert.read\"",
              "\"alert.doAction\"",
              "\"schema\""
            ],
            "optional": true,
            "field": "rights",
            "description": "<p>Enabled actions for the application</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/applications.js",
    "groupTitle": "Applications",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the application</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "name",
            "description": "<p>Name of the application</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "apiKey",
            "description": "<p>Generated key (32 hexadecimal characters)</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "enabled",
            "description": "<p>Whether the application is enabled</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "rights",
            "description": "<p>Enabled actions for the application</p>"
          },
          {
            "group": "Success 200",
            "type": "type:group[]",
            "optional": false,
            "field": "groups",
            "description": "<p>Groups the application can act on behalf of</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 1,\n  \"enabled\": true,\n  \"apiKey\": \"76554081e5b0a2d7852deec4990ebc58\",\n  \"name\": \"test_app\",\n  \"rights\": [\n    \"visualization.create\",\n    \"visualization.edit\",\n    \"visualization.read\",\n    \"visualization.delete\"\n  ],\n  \"groups\": [\n    {\n      \"id\": 3,\n      \"name\": \"read and edit\",\n      \"builtin\": true,\n      \"sourceKey\": \"584f2569\"\n    }\n  ],\n  \"createdAt\": \"2017-01-24T11:16:03.445Z\",\n  \"updatedAt\": \"2017-01-24T11:16:03.445Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/auth/me",
    "title": "Get current user",
    "name": "GetCurrentUser",
    "group": "Auth",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      }
    ],
    "version": "1.0.0",
    "description": "<p>Get the profile of the current user.</p>",
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 401 Unauthorized\n{\n  \"key\": \"unauthorized\",\n  \"message\": \"Unauthorized.\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/auth.js",
    "groupTitle": "Auth",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "username",
            "description": "<p>Username of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "email",
            "description": "<p>E-mail of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "source",
            "description": "<p>Source of the user (<code>&quot;local&quot;</code>, <code>&quot;ldap&quot;</code>, <code>&quot;oauth2&quot;</code>, etc.)</p>"
          },
          {
            "group": "Success 200",
            "type": "type:group[]",
            "optional": false,
            "field": "groups",
            "description": "<p>Groups the user belongs to</p>"
          },
          {
            "group": "Success 200",
            "type": "type:preferences",
            "optional": false,
            "field": "preferences",
            "description": "<p>Preferences of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "actions",
            "description": "<p>Arrays of authorized actions indexed by data-source key. The special key <code>&quot;*&quot;</code> lists actions authorized on all the data-sources</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "accessRights",
            "description": "<p>Arrays of authorized node categories and edge types indexed by data-source key, by type and by right. The special key <code>&quot;*&quot;</code> lists access rights authorized on all the data-sources</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 1,\n  \"username\": \"Unique user\",\n  \"email\": \"user@linkurio.us\",\n  \"source\": \"local\",\n  \"groups\": [\n    {\n      \"id\": 1,\n      \"name\": \"admin\",\n      \"builtin\": true,\n      \"sourceKey\": \"*\"\n    }\n  ],\n  \"preferences\": {\n    \"pinOnDrag\": false,\n    \"locale\": \"en-US\"\n  },\n  \"actions\": {\n    \"*\": [\n      \"admin.users\",\n      \"admin.alerts\",\n      \"admin.connect\",\n      \"admin.index\",\n      \"admin.app\",\n      \"admin.report\",\n      \"admin.users.delete\",\n      \"admin.config\",\n      \"rawReadQuery\",\n      \"rawWriteQuery\"\n    ]\n  },\n  \"accessRights\": {\n    \"*\": {\n      \"nodes\": {\n        \"edit\": [],\n        \"write\": [\"*\"]\n      },\n      \"edges\": {\n        \"edit\": [],\n        \"write\": [\"*\"]\n      },\n      \"alerts\": {\n        \"read\": [\"*\"]\n      }\n    }\n  },\n  \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n  \"updatedAt\": \"2016-05-16T08:23:45.730Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/auth/authenticated",
    "title": "Check if authenticated",
    "name": "IsAuthenticated",
    "group": "Auth",
    "version": "1.0.0",
    "description": "<p>Check if a user is authenticated.</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 204 No Content",
          "type": "none"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 401 Unauthorized\n{\n  \"key\": \"unauthorized\",\n  \"message\": \"Unauthorized.\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/auth.js",
    "groupTitle": "Auth"
  },
  {
    "type": "post",
    "url": "/api/auth/login",
    "title": "Login",
    "name": "Login",
    "group": "Auth",
    "version": "1.0.0",
    "description": "<p>Log a user in by e-mail or username and password and return it.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "usernameOrEmail",
            "description": "<p>User e-mail or username</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "password",
            "description": "<p>User password</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/auth.js",
    "groupTitle": "Auth",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "username",
            "description": "<p>Username of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "email",
            "description": "<p>E-mail of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "source",
            "description": "<p>Source of the user (<code>&quot;local&quot;</code>, <code>&quot;ldap&quot;</code>, <code>&quot;oauth2&quot;</code>, etc.)</p>"
          },
          {
            "group": "Success 200",
            "type": "type:group[]",
            "optional": false,
            "field": "groups",
            "description": "<p>Groups the user belongs to</p>"
          },
          {
            "group": "Success 200",
            "type": "type:preferences",
            "optional": false,
            "field": "preferences",
            "description": "<p>Preferences of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "actions",
            "description": "<p>Arrays of authorized actions indexed by data-source key. The special key <code>&quot;*&quot;</code> lists actions authorized on all the data-sources</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "accessRights",
            "description": "<p>Arrays of authorized node categories and edge types indexed by data-source key, by type and by right. The special key <code>&quot;*&quot;</code> lists access rights authorized on all the data-sources</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 1,\n  \"username\": \"Unique user\",\n  \"email\": \"user@linkurio.us\",\n  \"source\": \"local\",\n  \"groups\": [\n    {\n      \"id\": 1,\n      \"name\": \"admin\",\n      \"builtin\": true,\n      \"sourceKey\": \"*\"\n    }\n  ],\n  \"preferences\": {\n    \"pinOnDrag\": false,\n    \"locale\": \"en-US\"\n  },\n  \"actions\": {\n    \"*\": [\n      \"admin.users\",\n      \"admin.alerts\",\n      \"admin.connect\",\n      \"admin.index\",\n      \"admin.app\",\n      \"admin.report\",\n      \"admin.users.delete\",\n      \"admin.config\",\n      \"rawReadQuery\",\n      \"rawWriteQuery\"\n    ]\n  },\n  \"accessRights\": {\n    \"*\": {\n      \"nodes\": {\n        \"edit\": [],\n        \"write\": [\"*\"]\n      },\n      \"edges\": {\n        \"edit\": [],\n        \"write\": [\"*\"]\n      },\n      \"alerts\": {\n        \"read\": [\"*\"]\n      }\n    }\n  },\n  \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n  \"updatedAt\": \"2016-05-16T08:23:45.730Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/api/auth/loginRedirect",
    "title": "Login and redirect",
    "name": "LoginRedirect",
    "group": "Auth",
    "version": "1.0.0",
    "description": "<p>Log a user in by e-mail or username and password and redirect him to a given path.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "usernameOrEmail",
            "description": "<p>User e-mail or username</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "password",
            "description": "<p>User password</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "path",
            "defaultValue": "/",
            "description": "<p>Path to redirect to</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "errorPath",
            "defaultValue": "path",
            "description": "<p>Path to redirect to in case of error</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 302 Redirect\nLocation: /",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/auth.js",
    "groupTitle": "Auth"
  },
  {
    "type": "get",
    "url": "/api/auth/sso/login",
    "title": "Login via OAuth2 or SAML2",
    "name": "LoginSSO",
    "group": "Auth",
    "version": "1.0.0",
    "description": "<p>Redirect the user to the OAuth2 or SAML2 provider for authorization.</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 302 Redirect",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/auth.js",
    "groupTitle": "Auth"
  },
  {
    "type": "get",
    "url": "/api/auth/logout",
    "title": "Logout",
    "name": "Logout",
    "group": "Auth",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      }
    ],
    "version": "1.0.0",
    "description": "<p>Log the current user out.</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 204 No Content",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/auth.js",
    "groupTitle": "Auth"
  },
  {
    "type": "patch",
    "url": "/api/auth/me",
    "title": "Update current user",
    "name": "UpdateCurrentUser",
    "group": "Auth",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "__guest",
        "title": "The guest user can use this API if guest mode is allowed.",
        "description": ""
      }
    ],
    "version": "1.0.0",
    "description": "<p>Update the current user.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "username",
            "description": "<p>New username</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "email",
            "description": "<p>New e-mail</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "password",
            "description": "<p>New password</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "preferences",
            "description": "<p>New user preferences</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/auth.js",
    "groupTitle": "Auth",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "username",
            "description": "<p>Username of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "email",
            "description": "<p>E-mail of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "source",
            "description": "<p>Source of the user (<code>&quot;local&quot;</code>, <code>&quot;ldap&quot;</code>, <code>&quot;oauth2&quot;</code>, etc.)</p>"
          },
          {
            "group": "Success 200",
            "type": "type:group[]",
            "optional": false,
            "field": "groups",
            "description": "<p>Groups the user belongs to</p>"
          },
          {
            "group": "Success 200",
            "type": "type:preferences",
            "optional": false,
            "field": "preferences",
            "description": "<p>Preferences of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "actions",
            "description": "<p>Arrays of authorized actions indexed by data-source key. The special key <code>&quot;*&quot;</code> lists actions authorized on all the data-sources</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "accessRights",
            "description": "<p>Arrays of authorized node categories and edge types indexed by data-source key, by type and by right. The special key <code>&quot;*&quot;</code> lists access rights authorized on all the data-sources</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 1,\n  \"username\": \"Unique user\",\n  \"email\": \"user@linkurio.us\",\n  \"source\": \"local\",\n  \"groups\": [\n    {\n      \"id\": 1,\n      \"name\": \"admin\",\n      \"builtin\": true,\n      \"sourceKey\": \"*\"\n    }\n  ],\n  \"preferences\": {\n    \"pinOnDrag\": false,\n    \"locale\": \"en-US\"\n  },\n  \"actions\": {\n    \"*\": [\n      \"admin.users\",\n      \"admin.alerts\",\n      \"admin.connect\",\n      \"admin.index\",\n      \"admin.app\",\n      \"admin.report\",\n      \"admin.users.delete\",\n      \"admin.config\",\n      \"rawReadQuery\",\n      \"rawWriteQuery\"\n    ]\n  },\n  \"accessRights\": {\n    \"*\": {\n      \"nodes\": {\n        \"edit\": [],\n        \"write\": [\"*\"]\n      },\n      \"edges\": {\n        \"edit\": [],\n        \"write\": [\"*\"]\n      },\n      \"alerts\": {\n        \"read\": [\"*\"]\n      }\n    }\n  },\n  \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n  \"updatedAt\": \"2016-05-16T08:23:45.730Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/api/admin/source/:dataSourceIndex/connect",
    "title": "Connect a disconnected data-source",
    "name": "ReconnectSource",
    "group": "DataSources",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.connect"
      }
    ],
    "description": "<p>Connect a disconnected data-source</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSourceIndex",
            "description": "<p>config-index of a data-source</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/source.js",
    "groupTitle": "DataSources"
  },
  {
    "type": "post",
    "url": "/api/admin/source/:dataSource/resetDefaults",
    "title": "Reset settings for new visualizations",
    "name": "ResetSourceStyles",
    "group": "DataSources",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.resetDefaults"
      }
    ],
    "description": "<p>Reset design and/or captions of all sandboxes of the given data-source to configuration-file values. If <code>design</code> is true, set the <code>design.palette</code> and <code>design.styles</code> to current <code>palette</code> and <code>defaultStyles</code> configuration values. If <code>captions</code> is true, set <code>nodeFields.captions</code> and <code>edgeFields.captions</code> to current <code>defaultCaptions.nodes</code> and <code>defaultCaptions.edges</code> configuration values.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of a data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": false,
            "field": "design",
            "description": "<p>Whether to reset default design to configuration-file values.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": false,
            "field": "captions",
            "description": "<p>Whether to reset default captions to configuration-file values.</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/source.js",
    "groupTitle": "DataSources"
  },
  {
    "type": "post",
    "url": "/api/admin/sources/config",
    "title": "Create a new data-source configuration",
    "name": "createSourceConfig",
    "group": "DataSources",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.config"
      }
    ],
    "description": "<p>Create a new data-source configuration (contains a graph database configuration and an index configuration).</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "name",
            "description": "<p>Name of the data-source.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "graphDb",
            "description": "<p>The configuration options of the graph database.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "graphDb.vendor",
            "description": "<p>The vendor of the graph database (<code>&quot;neo4j&quot;</code>, <code>&quot;allegroGraph&quot;</code>...).</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "index",
            "description": "<p>The configuration options of the full-text index.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "index.vendor",
            "description": "<p>The vendor of the full-text index (<code>&quot;elasticSearch&quot;</code>).</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "index.host",
            "description": "<p>Host of the full-text index server.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "index.port",
            "description": "<p>Port of the full-text index server.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": false,
            "field": "index.forceReindex",
            "description": "<p>Whether to re-index this graph database at each start of Linkurious.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": false,
            "field": "index.dynamicMapping",
            "description": "<p>Whether to enable automatic property-types detection for enhanced search.</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/source.js",
    "groupTitle": "DataSources"
  },
  {
    "type": "delete",
    "url": "/api/admin/sources/config/:configIndex",
    "title": "Delete a data-source configuration",
    "name": "deleteSourceConfig",
    "group": "DataSources",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.config"
      }
    ],
    "description": "<p>Delete a data-source configuration that has currently no connected data-source.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "configIndex",
            "description": "<p>Index of a data-source configuration</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/source.js",
    "groupTitle": "DataSources"
  },
  {
    "type": "delete",
    "url": "/api/admin/sources/data/:sourceKey",
    "title": "Delete all data-source data",
    "name": "deleteSourceData",
    "group": "DataSources",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.config"
      }
    ],
    "description": "<p>Delete all data of data-source (visualizations, access rights, widgets, full-text indexes). Optionally merge visualizations and widgets into another data-source instead of deleting them. Warning: when merging into another data-source, visualizations may break if node and edge IDs are not the same in to target data-source.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "sourceKey",
            "description": "<p>Key of a disconnected data-source which data must be deleted.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "merge_into",
            "description": "<p>Key of a data-source to merge visualizations and widgets into.</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "migrated",
            "description": "<p>True if the affected items have been migrated to another data-source, false if they have been deleted.</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "affected",
            "description": "<p>Affected object counts.</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "affected.visualizations",
            "description": "<p>Number of migrated/deleted visualizations (with their widgets).</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "affected.folders",
            "description": "<p>Number of migrated/deleted visualization folders.</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "affected.alerts",
            "description": "<p>Number of migrated/deleted alerts.</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "affected.matches",
            "description": "<p>Number of migrated/deleted matches.</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/source.js",
    "groupTitle": "DataSources"
  },
  {
    "type": "get",
    "url": "/api/admin/sources",
    "title": "Get all data-sources information",
    "name": "getAllSourceInfo",
    "group": "DataSources",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.config"
      }
    ],
    "description": "<p>Get information for all data-source, including data-sources that do not exist online.</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "sources",
            "description": "<p>Data-source information.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.lastSeen",
            "description": "<p>Last time this data-source was seen online (ISO-8601 date)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.indexedDate",
            "description": "<p>Last time this data-source was indexed (ISO-8601 date)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.key",
            "description": "<p>Key of the data-source (when is has been connected before, <code>null</code> otherwise)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.host",
            "description": "<p>Host of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.port",
            "description": "<p>Port of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.storeId",
            "description": "<p>Unique store identifier of the graph database (when it has been connected before, <code>null</code> otherwise)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.state",
            "description": "<p>State code if the data-source (<code>&quot;ready&quot;</code> , <code>&quot;offline&quot;</code> ...).</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "sources.visualizationCount",
            "description": "<p>Number of visualizations that exist for this data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "sources.configIndex",
            "description": "<p>The index of the data-source's config (if the config still exists, <code>null</code> otherwise)</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/source.js",
    "groupTitle": "DataSources"
  },
  {
    "type": "get",
    "url": "/api/admin/source/:dataSource/hidden/edgeProperties",
    "title": "Get hidden edge-properties",
    "name": "getHiddenEdgeProperties",
    "group": "DataSources",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.config"
      }
    ],
    "description": "<p>Get the list of edge-properties hidden for the given data-source.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of a dataSource</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/source.js",
    "groupTitle": "DataSources"
  },
  {
    "type": "get",
    "url": "/api/admin/source/:dataSource/hidden/nodeProperties",
    "title": "Get hidden node-properties",
    "name": "getHiddenNodeProperties",
    "group": "DataSources",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.config"
      }
    ],
    "description": "<p>Get the list of node-properties hidden for the given data-source.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of a dataSource</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/source.js",
    "groupTitle": "DataSources"
  },
  {
    "type": "get",
    "url": "/api/admin/source/:dataSource/noIndex/edgeProperties",
    "title": "Get non-indexed edge-properties",
    "name": "getNoIndexEdgeProperties",
    "group": "DataSources",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.config"
      }
    ],
    "description": "<p>Get the list of edge-properties that re not indexed for the given data-source.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of a dataSource</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/source.js",
    "groupTitle": "DataSources"
  },
  {
    "type": "get",
    "url": "/api/admin/source/:dataSource/noIndex/nodeProperties",
    "title": "Get non-indexed node-properties",
    "name": "getNoIndexNodeProperties",
    "group": "DataSources",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.config"
      }
    ],
    "description": "<p>Get the list of node-properties that are not indexed for the given data-source.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of a dataSource</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/source.js",
    "groupTitle": "DataSources"
  },
  {
    "type": "put",
    "url": "/api/admin/source/:dataSource/hidden/edgeProperties",
    "title": "Set hidden edge-properties",
    "name": "setHiddenEdgeProperties",
    "group": "DataSources",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.config"
      }
    ],
    "description": "<p>Set the list of edge-properties that are hidden for the given data-source.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of a dataSource</p>"
          },
          {
            "group": "Parameter",
            "type": "string[]",
            "optional": false,
            "field": "properties",
            "description": "<p>List of property names</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/source.js",
    "groupTitle": "DataSources"
  },
  {
    "type": "put",
    "url": "/api/admin/source/:dataSource/hidden/nodeProperties",
    "title": "Set hidden node-properties",
    "name": "setHiddenNodeProperties",
    "group": "DataSources",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.config"
      }
    ],
    "description": "<p>Set the list of node-properties that are hidden for the given data-source.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of a dataSource</p>"
          },
          {
            "group": "Parameter",
            "type": "string[]",
            "optional": false,
            "field": "properties",
            "description": "<p>List of property names</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/source.js",
    "groupTitle": "DataSources"
  },
  {
    "type": "put",
    "url": "/api/admin/source/:dataSource/noIndex/edgeProperties",
    "title": "Set non-indexed edge-properties",
    "name": "setNoIndexEdgeProperties",
    "group": "DataSources",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.config"
      }
    ],
    "description": "<p>Set the list of edge-properties that are not indexed for the given data-source.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of a dataSource</p>"
          },
          {
            "group": "Parameter",
            "type": "string[]",
            "optional": false,
            "field": "properties",
            "description": "<p>List of property names</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/source.js",
    "groupTitle": "DataSources"
  },
  {
    "type": "put",
    "url": "/api/admin/source/:dataSource/noIndex/nodeProperties",
    "title": "Set non-indexed node-properties",
    "name": "setNoIndexNodeProperties",
    "group": "DataSources",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.config"
      }
    ],
    "description": "<p>Set the list of node-properties that are not indexed for the given data-source.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of a dataSource</p>"
          },
          {
            "group": "Parameter",
            "type": "string[]",
            "optional": false,
            "field": "properties",
            "description": "<p>List of property names</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/source.js",
    "groupTitle": "DataSources"
  },
  {
    "type": "delete",
    "url": "/api/:dataSource/graph/edges/:id",
    "title": "Delete an edge",
    "name": "DeleteEdge",
    "group": "Edges",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:graphItem.delete"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Delete a edge from the graph.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the edge</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 204 No Content",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/graphEdge.js",
    "groupTitle": "Edges"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/graph/edges",
    "title": "Get adjacent edges of a node",
    "name": "GetAdjacentEdged",
    "group": "Edges",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "__guest",
        "title": "The guest user can use this API if guest mode is allowed.",
        "description": ""
      },
      {
        "name": "apiright:graphItem.read"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Get the adjacent edges of a node from the graph.</p> <p>The <strong>source</strong>, <strong>target</strong> and <strong>adjacent</strong> parameters are mutually exclusive:</p> <ul> <li>if <strong>source</strong> is provided, return outgoing edges only.</li> <li>otherwise, if <strong>target</strong> is provided, return incoming edges only.</li> <li>otherwise, if <strong>adjacent</strong> is provided, return all the adjacent edges.</li> </ul>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "source",
            "description": "<p>ID of the source node</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "target",
            "description": "<p>ID of the target node</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "adjacent",
            "description": "<p>ID of the node</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "type",
            "description": "<p>Filter by edge type</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "skip",
            "description": "<p>Offset from the first result</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "limit",
            "description": "<p>Page size (maximum number of returned edges)</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_version",
            "defaultValue": "false",
            "description": "<p>Whether to include the edge versions</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/graphEdge.js",
    "groupTitle": "Edges",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "edges",
            "description": "<p>Edges</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "edges.id",
            "description": "<p>ID of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "edges.source",
            "description": "<p>ID of the source node</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "edges.target",
            "description": "<p>ID of the target node</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "edges.type",
            "description": "<p>Type of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "edges.data",
            "description": "<p>Properties of the edge</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n[\n  {\n    \"id\": 1,\n    \"source\": 1,\n    \"target\": 2,\n    \"type\": \"my_link\",\n    \"data\": {\n      \"direction\": \"south\"\n    }\n  },\n  {\n    \"id\": 15,\n    \"source\": 22,\n    \"target\": 2,\n    \"type\": \"my_other_link\",\n    \"data\": {\n      \"direction\": \"north\"\n    }\n  }\n]",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/:dataSource/graph/edges/:id",
    "title": "Get an edge",
    "name": "GetEdge",
    "group": "Edges",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "__guest",
        "title": "The guest user can use this API if guest mode is allowed.",
        "description": ""
      },
      {
        "name": "apiright:graphItem.read"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Get an edge of the graph.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the edge</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_version",
            "defaultValue": "false",
            "description": "<p>Whether to include the edge version</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/graphEdge.js",
    "groupTitle": "Edges",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "source",
            "description": "<p>ID of the source node</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "target",
            "description": "<p>ID of the target node</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "type",
            "description": "<p>Type of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "data",
            "description": "<p>Properties of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": true,
            "field": "version",
            "description": "<p>Version of the edge</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 1,\n  \"source\": 1,\n  \"target\": 2,\n  \"type\": \"my_link\",\n  \"data\": {\n    \"direction\": \"north\"\n  }\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/:dataSource/graph/edges/count",
    "title": "Get edges count",
    "name": "GetEdgesCount",
    "group": "Edges",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      }
    ],
    "version": "1.0.0",
    "description": "<p>Get the number of edges in the graph.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "count",
            "description": "<p>The number of edges</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"count\": 42\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/graphEdge.js",
    "groupTitle": "Edges"
  },
  {
    "type": "patch",
    "url": "/api/:dataSource/graph/edges/:id",
    "title": "Update an edge",
    "name": "PatchEdge",
    "group": "Edges",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:graphItem.edit"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Update a subset of properties and the type of an edge. Keep every other property of the edge unchanged.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the edge</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "properties",
            "description": "<p>Properties to update or create</p>"
          },
          {
            "group": "Parameter",
            "type": "string[]",
            "optional": true,
            "field": "deleted_properties",
            "description": "<p>Properties to delete</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "type",
            "description": "<p>Type of the edge to update</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "version",
            "description": "<p>The current edge version</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/graphEdge.js",
    "groupTitle": "Edges",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "source",
            "description": "<p>ID of the source node</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "target",
            "description": "<p>ID of the target node</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "type",
            "description": "<p>Type of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "data",
            "description": "<p>Properties of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "version",
            "description": "<p>Version of the edge</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 1,\n  \"source\": 1,\n  \"target\": 2,\n  \"type\": \"my_link\",\n  \"data\": {\n    \"direction\": \"north\"\n  },\n  \"version\": 2\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/api/:dataSource/graph/edges",
    "title": "Create an edge",
    "name": "PostEdge",
    "group": "Edges",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:graphItem.create"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Add an edge to the graph.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "source",
            "description": "<p>ID of the source node</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "target",
            "description": "<p>ID of the target node</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "type",
            "description": "<p>Type of the edge</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "properties",
            "description": "<p>Properties of the edge</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/graphEdge.js",
    "groupTitle": "Edges",
    "success": {
      "fields": {
        "Success 201": [
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the edge</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "source",
            "description": "<p>ID of the source node</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "target",
            "description": "<p>ID of the target node</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "type",
            "description": "<p>Type of the edge</p>"
          },
          {
            "group": "Success 201",
            "type": "object",
            "optional": false,
            "field": "data",
            "description": "<p>Properties of the edge</p>"
          },
          {
            "group": "Success 201",
            "type": "number",
            "optional": false,
            "field": "version",
            "description": "<p>Version of the edge</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 201 Created\n{\n  \"id\": 1,\n  \"source\": 1,\n  \"target\": 2,\n  \"type\": \"my_link\",\n  \"data\": {\n    \"direction\": \"north\"\n  },\n  \"version\": 1\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "delete",
    "url": "/api/:dataSource/graph/my/rawQuery/:id",
    "title": "Delete a saved graph query",
    "name": "DeleteRawGraphQuery",
    "group": "Graph",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:savedGraphQuery.delete"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Delete a graph query owned by the current user.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the graph query</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 204 No Content",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/graph.js",
    "groupTitle": "Graph"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/graph/shortestPaths",
    "title": "Get all the shortest paths between two nodes",
    "name": "GetAllShortestPaths",
    "group": "Graph",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:graph.shortestPath"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Get an array containing all the shortest paths between two given nodes. A path is not returned if the current user doesn't have read access to each element of the path. Edges will appear only on the first node in the path.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "startNode",
            "description": "<p>ID of the starting node</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "endNode",
            "description": "<p>ID of the ending node</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "maxDepth",
            "description": "<p>Max depth of the shortest path</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_version",
            "defaultValue": "false",
            "description": "<p>Whether to include the node and edge versions</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_digest",
            "defaultValue": "false",
            "description": "<p>Whether to include the adjacency digest in the returned nodes</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_degree",
            "defaultValue": "false",
            "description": "<p>Whether to include the degree in the returned nodes</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[][]",
            "optional": false,
            "field": "results",
            "description": "<p>Paths</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "results.id",
            "description": "<p>ID of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "results.data",
            "description": "<p>Properties of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "results.categories",
            "description": "<p>Categories of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": true,
            "field": "results.statistics",
            "description": "<p>Statistics of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "type:LkDigestItem[]",
            "optional": true,
            "field": "results.statistics.digest",
            "description": "<p>Statistics of the neighborhood of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": true,
            "field": "results.statistics.degree",
            "description": "<p>Number of neighbors of the node readable by the current user</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "results.edges",
            "description": "<p>Subset of adjacent edges of this node (only the ones belonging to the path)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "results.edges.id",
            "description": "<p>ID of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "results.edges.data",
            "description": "<p>Properties of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "results.edges.type",
            "description": "<p>Type of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "results.edges.source",
            "description": "<p>ID of the source node</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "results.edges.target",
            "description": "<p>ID of the target node</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"results\": [\n    [\n      {\n        \"id\": 1,\n        \"categories\": [\"COMPANY\"],\n        \"data\": {\"name\": \"Linkurious\", \"created\": 2013},\n        \"edges\": [\n          {\"id\": 6, \"source\": 1, \"target\": 2, \"type\": \"HAS_CITY\", \"data\": {\"address\": \"75014\"}}\n        ]\n      },\n      {\n        \"id\": 2,\n        \"categories\": [\"CITY\"],\n        \"data\": {\"name\": \"Paris\", \"size\": 7000000},\n        \"edges\": [\n          {\"id\": 7, \"source\": 3, \"target\": 2, \"type\": \"HAS_CITY\", \"data\": {\"address\": \"75009\"}}\n        ]\n      },\n      {\n        \"id\": 3,\n        \"categories\": [\"COMPANY\"],\n        \"data\": {\"name\": \"Linkfluence\", \"created\": 2006},\n        \"edges\": [\n        ]\n      }\n    ]\n  ]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/graph.js",
    "groupTitle": "Graph"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/graph/my/rawQuery/:id",
    "title": "Get a saved graph query",
    "name": "GetRawGraphQuery",
    "group": "Graph",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:savedGraphQuery.read"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Get a graph query owned by the current user.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the graph query</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/graph.js",
    "groupTitle": "Graph",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the graph query</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "content",
            "description": "<p>Content of the graph query</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": true,
            "field": "name",
            "description": "<p>Name of the graph query</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "dialect",
            "description": "<p>Dialect of the graph query (<code>cypher</code>, <code>gremlin</code>, <code>sparql</code>, etc.)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 2,\n  \"name\": \"my other saved query\",\n  \"dialect\": \"cypher\",\n  \"content\": \"MATCH (n)-[r:DIRECTED]-(n2) RETURN n, r, n2\",\n  \"createdAt\": \"2015-06-11T13:22:51.000Z\",\n  \"updatedAt\": \"2015-06-11T13:22:51.000Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/:dataSource/graph/my/rawQuery/all",
    "title": "Get all saved graph queries",
    "name": "ListRawGraphQuery",
    "group": "Graph",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:savedGraphQuery.read"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Get all the graph queries owned by the current user.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "queries",
            "description": "<p>Graph queries</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "queries.id",
            "description": "<p>ID of the graph query</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "queries.content",
            "description": "<p>Content of the graph query</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": true,
            "field": "queries.name",
            "description": "<p>Name of the graph query</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "queries.dialect",
            "description": "<p>Dialect of the graph query (<code>cypher</code>, <code>gremlin</code>, <code>sparql</code>, etc.)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "queries.createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "queries.updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n[\n  {\n    \"id\": 1,\n    \"name\": \"my saved query\",\n    \"dialect\": \"cypher\",\n    \"content\": \"MATCH (n) RETURN n\",\n    \"createdAt\": \"2015-06-11T13:22:51.000Z\",\n    \"updatedAt\": \"2015-06-11T13:22:51.000Z\"\n  },\n  {\n    \"id\": 2,\n    \"name\": \"my other saved query\",\n    \"dialect\": \"cypher\",\n    \"content\": \"MATCH (n)-[r:DIRECTED]-(n2) RETURN n, r, n2\",\n    \"createdAt\": \"2015-06-11T13:22:51.000Z\",\n    \"updatedAt\": \"2015-06-11T13:22:51.000Z\"\n  }\n]",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/graph.js",
    "groupTitle": "Graph"
  },
  {
    "type": "post",
    "url": "/api/:dataSource/graph/rawQuery",
    "title": "Execute a graph query",
    "name": "RunRawGraphQuery",
    "group": "Graph",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:rawReadQuery"
      },
      {
        "name": "apiright:rawWriteQuery"
      },
      {
        "name": "apiright:admin.alerts"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Get all the nodes and edges matching the given graph query.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "dialect",
            "description": "<p>Dialect of the graph query (<code>cypher</code>, <code>gremlin</code>, <code>sparql</code>, etc.). If not defined, it defaults to the first supported dialect of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "query",
            "description": "<p>Content of the graph query</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "description": "<p>Maximum limit for number of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "timeout",
            "description": "<p>Query maximum execution time (in milliseconds)</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_version",
            "defaultValue": "false",
            "description": "<p>Whether to include the node and edge versions</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_digest",
            "defaultValue": "false",
            "description": "<p>Whether to include the adjacency digest in the returned nodes</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_degree",
            "defaultValue": "false",
            "description": "<p>Whether to include the degree in the returned nodes</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "groupResults",
            "defaultValue": "true",
            "description": "<p>Whether to group all the matched subgraphs in one subgraph</p>"
          },
          {
            "group": "Parameter",
            "type": "object[]",
            "optional": true,
            "field": "columns",
            "description": "<p>Columns among the returned values of the query to return as scalar values (this is a valid parameter only if <code>group_results</code> is <code>false</code>)</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"number\"",
              "\"string\""
            ],
            "optional": false,
            "field": "columns.type",
            "description": "<p>Type of the column</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "columns.columnName",
            "description": "<p>Name of the column in the query</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "groupResults=false:",
          "content": "HTTP/1.1 200 OK\n[\n  {\n    \"nodes\": [\n      {\n        \"id\": 1,\n        \"data\": {\n          \"name\": \"Keanu Reeves\",\n          \"born\": 1964\n        },\n        \"categories\": [\"Person\"],\n        \"statistics\": {\n          \"digest\": [\n            {\n              \"nodeCategories\": [\"Movie\", \"TheMatrix\", \"TheMatrixReloaded\"],\n              \"edgeType\": \"ACTED_IN\",\n              \"nodes\": 3,\n              \"edges\": 3\n            }\n          ]\n        },\n        \"edges\": [\n          {\n            \"id\": 100,\n            \"type\": \"ACTED_IN\",\n            \"source\": 1,\n            \"target\": 2,\n            \"data\": {\n              \"role\": \"Neo\"\n            }\n          },\n          {\n            \"id\": 101,\n            \"type\": \"ACTED_IN\",\n            \"source\": 1,\n            \"target\": 3,\n            \"data\": {\n              \"role\": \"Neo\"\n            }\n          }\n        ]\n      },\n      {\n        \"id\": 2,\n        \"data\": {\n          \"title\": \"The Matrix\",\n          \"release\": 1999\n        },\n        \"categories\": [\"Movie\"],\n        \"statistics\": {\n          \"digest\": [\n            {\n              \"nodeCategories\": [\"Person\"],\n              \"edgeType\": \"ACTED_IN\",\n              \"nodes\": 2,\n              \"edges\": 2\n            }\n          ]\n        },\n        \"edges\": [\n          {\n            \"id\": 100,\n            \"type\": \"ACTED_IN\",\n            \"source\": 1,\n            \"target\": 2,\n            \"data\": {\n              \"role\": \"Neo\"\n            }\n          },\n          {\n            \"id\": 102\n            \"type\": \"SEQUEL_OF\",\n            \"source\": 3,\n            \"target\": 2,\n            \"data\": {}\n          }\n        ]\n      },\n      {\n        \"id\": 3,\n        \"data\": {\n          \"title\": \"The Matrix Reloaded\",\n          \"release\": 2003\n        },\n        \"categories\": [\"Movie\"],\n        \"statistics\": {\n          \"digest\": [\n            {\n              \"nodeCategories\": [\"Person\"],\n              \"edgeType\": \"ACTED_IN\",\n              \"nodes\": 2,\n              \"edges\": 2\n            }\n          ]\n        },\n        \"edges\": [\n          {\n            \"id\": 101,\n            \"type\": \"ACTED_IN\",\n            \"source\": 1,\n            \"target\": 3,\n            \"data\": {\n              \"role\": \"Neo\"\n            }\n          },\n          {\n            \"id\": 102\n            \"type\": \"SEQUEL_OF\",\n            \"source\": 3,\n            \"target\": 2,\n            \"data\": {}\n          }\n        ]\n      }\n    ],\n    \"columns\": [\n      1999\n    ]\n  },\n  {\n    \"nodes\": [\n      // ...\n    ],\n    \"columns\": [\n      1998\n    ]\n  }\n]",
          "type": "json"
        },
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n[\n  {\n    \"id\": 1,\n    \"data\": {\n      \"name\": \"Keanu Reeves\",\n      \"born\": 1964\n    },\n    \"categories\": [\"Person\"],\n    \"statistics\": {\n      \"digest\": [\n        {\n          \"nodeCategories\": [\"Movie\", \"TheMatrix\", \"TheMatrixReloaded\"],\n          \"edgeType\": \"ACTED_IN\",\n          \"nodes\": 3,\n          \"edges\": 3\n        }\n      ]\n    },\n    \"edges\": [\n      {\n        \"id\": 100,\n        \"type\": \"ACTED_IN\",\n        \"source\": 1,\n        \"target\": 2,\n        \"data\": {\n          \"role\": \"Neo\"\n        }\n      },\n      {\n        \"id\": 101,\n        \"type\": \"ACTED_IN\",\n        \"source\": 1,\n        \"target\": 3,\n        \"data\": {\n          \"role\": \"Neo\"\n        }\n      }\n    ]\n  },\n  {\n    \"id\": 2,\n    \"data\": {\n      \"title\": \"The Matrix\",\n      \"release\": 1999\n    },\n    \"categories\": [\"Movie\"],\n    \"statistics\": {\n      \"digest\": [\n        {\n          \"nodeCategories\": [\"Person\"],\n          \"edgeType\": \"ACTED_IN\",\n          \"nodes\": 2,\n          \"edges\": 2\n        }\n      ]\n    },\n    \"edges\": [\n      {\n        \"id\": 100,\n        \"type\": \"ACTED_IN\",\n        \"source\": 1,\n        \"target\": 2,\n        \"data\": {\n          \"role\": \"Neo\"\n        }\n      },\n      {\n        \"id\": 102\n        \"type\": \"SEQUEL_OF\",\n        \"source\": 3,\n        \"target\": 2,\n        \"data\": {}\n      }\n    ]\n  },\n  {\n    \"id\": 3,\n    \"data\": {\n      \"title\": \"The Matrix Reloaded\",\n      \"release\": 2003\n    },\n    \"categories\": [\"Movie\"],\n    \"statistics\": {\n      \"digest\": [\n        {\n          \"nodeCategories\": [\"Person\"],\n          \"edgeType\": \"ACTED_IN\",\n          \"nodes\": 2,\n          \"edges\": 2\n        }\n      ]\n    },\n    \"edges\": [\n      {\n        \"id\": 101,\n        \"type\": \"ACTED_IN\",\n        \"source\": 1,\n        \"target\": 3,\n        \"data\": {\n          \"role\": \"Neo\"\n        }\n      },\n      {\n        \"id\": 102\n        \"type\": \"SEQUEL_OF\",\n        \"source\": 3,\n        \"target\": 2,\n        \"data\": {}\n      }\n    ]\n  }\n]",
          "type": "json"
        }
      ],
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "nodes",
            "description": "<p>Nodes</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodes.id",
            "description": "<p>ID of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "nodes.data",
            "description": "<p>Properties of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "nodes.categories",
            "description": "<p>Categories of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": true,
            "field": "nodes.statistics",
            "description": "<p>Statistics of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "type:LkDigestItem[]",
            "optional": true,
            "field": "nodes.statistics.digest",
            "description": "<p>Statistics of the neighborhood of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": true,
            "field": "nodes.statistics.degree",
            "description": "<p>Number of neighbors of the node readable by the current user</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "nodes.edges",
            "description": "<p>Subset of adjacent edges of this node (only the ones matching the API description)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodes.edges.id",
            "description": "<p>ID of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "nodes.edges.data",
            "description": "<p>Properties of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodes.edges.type",
            "description": "<p>Type of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodes.edges.source",
            "description": "<p>ID of the source node</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodes.edges.target",
            "description": "<p>ID of the target node</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/graph.js",
    "groupTitle": "Graph"
  },
  {
    "type": "post",
    "url": "/api/:dataSource/graph/my/rawQuery",
    "title": "Save a graph query",
    "name": "SaveRawGraphQuery",
    "group": "Graph",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:savedGraphQuery.create"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Save a graph query for the current user.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dialect",
            "description": "<p>Dialect of the graph query (<code>cypher</code>, <code>gremlin</code>, <code>sparql</code>, etc.)</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "content",
            "description": "<p>Content of the graph query</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "name",
            "description": "<p>Name of the graph query</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/graph.js",
    "groupTitle": "Graph",
    "success": {
      "fields": {
        "Success 201": [
          {
            "group": "Success 201",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the graph query</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "content",
            "description": "<p>Content of the graph query</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": true,
            "field": "name",
            "description": "<p>Name of the graph query</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "dialect",
            "description": "<p>Dialect of the graph query (<code>cypher</code>, <code>gremlin</code>, <code>sparql</code>, etc.)</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 201 Created\n{\n  \"id\": 1,\n  \"name\": \"my saved query\",\n  \"dialect\": \"cypher\",\n  \"content\": \"MATCH (n) RETURN n\",\n  \"createdAt\": \"2015-06-11T13:22:51.000Z\",\n  \"updatedAt\": \"2015-06-11T13:22:51.000Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "patch",
    "url": "/api/:dataSource/graph/my/rawQuery/:id",
    "title": "Update a saved graph query",
    "name": "UpdateRawGraphQuery",
    "group": "Graph",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:savedGraphQuery.edit"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Update a graph query owned by the current user.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the graph query</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "name",
            "description": "<p>New name of the graph query</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "content",
            "description": "<p>New content of the graph query</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/graph.js",
    "groupTitle": "Graph",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the graph query</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "content",
            "description": "<p>Content of the graph query</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": true,
            "field": "name",
            "description": "<p>Name of the graph query</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "dialect",
            "description": "<p>Dialect of the graph query (<code>cypher</code>, <code>gremlin</code>, <code>sparql</code>, etc.)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 2,\n  \"name\": \"my other saved query\",\n  \"dialect\": \"cypher\",\n  \"content\": \"MATCH (n)-[r:DIRECTED]-(n2) RETURN n, r, n2\",\n  \"createdAt\": \"2015-06-11T13:22:51.000Z\",\n  \"updatedAt\": \"2015-06-11T13:22:51.000Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/admin/report",
    "title": "Create a report",
    "name": "CreateReport",
    "group": "Linkurious",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.report"
      }
    ],
    "description": "<p>Collect all the analytics and log files in a compressed tarball and return it.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_configuration",
            "defaultValue": "false",
            "description": "<p>Whether to include the configuration within the tarball</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK",
          "type": "tar.gz"
        }
      ]
    },
    "filename": "server/services/webServer/routes/admin/general.js",
    "groupTitle": "Linkurious"
  },
  {
    "type": "get",
    "url": "/api/dataSources",
    "title": "Get data-sources status",
    "name": "DataSourcesStatus",
    "group": "Linkurious",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      }
    ],
    "description": "<p>Get the status of all the data-sources. Users can only see data-sources with at least one group belonging to that data-source. If a user has the &quot;admin.connect&quot; access right, he can also see all the disconnected data-sources.</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "sources",
            "description": "<p>Data-sources</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.name",
            "description": "<p>Name of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "sources.configIndex",
            "description": "<p>Index of the data-source in the <code>dataSources</code> array in the configuration</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.key",
            "description": "<p>Unique key of this data-source (it's <code>null</code> if the data-source is not connected)</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.connected",
            "description": "<p>Whether the data-source is connected</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"offline\"",
              "\"connecting\"",
              "\"needConfig\"",
              "\"needFirstIndex\"",
              "\"needReindex\"",
              "\"indexing\"",
              "\"ready\""
            ],
            "optional": false,
            "field": "sources.state",
            "description": "<p>Current state of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.reason",
            "description": "<p>Explanation of the current state</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": true,
            "field": "sources.error",
            "description": "<p>The error that caused the current state, if any</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "sources.settings",
            "description": "<p>Settings of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "sources.settings.alternativeIds",
            "description": "<p>Current source alternative IDs</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.settings.alternativeIds.node",
            "description": "<p>Alternative node ID</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.settings.alternativeIds.edge",
            "description": "<p>Alternative edge ID</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.settings.latitudeProperty",
            "description": "<p>The default node property used for latitude</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.settings.longitudeProperty",
            "description": "<p>The default node property used for longitude</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.settings.skipEdgeIndexation",
            "description": "<p>Whether edges are not indexed for this source</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.settings.readOnly",
            "description": "<p>Whether the source is in readonly mode</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "sources.settings.specialProperties",
            "description": "<p>Properties with special access rights for this source</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.settings.specialProperties.key",
            "description": "<p>Key of the property</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.settings.specialProperties.read",
            "description": "<p>Whether the property can be read</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.settings.specialProperties.create",
            "description": "<p>Whether the property can be created</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.settings.specialProperties.update",
            "description": "<p>Whether the property can be updated</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "sources.features",
            "description": "<p>Features of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "sources.features.schema",
            "description": "<p>Whether the schema is available</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.schema.counts",
            "description": "<p>Whether the schema can be modified or not (<code>false</code> implies that the schema is frozen)</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.schema.properties",
            "description": "<p>Whether the properties of each category/type are included in the schema</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.schema.inferred",
            "description": "<p>Whether the schema is able to discover inferred node/edge types</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.typing",
            "description": "<p>Whether property types are available in the schema</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.edgeProperties",
            "description": "<p>Whether edge properties are allowed</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.immutableNodeCategories",
            "description": "<p>Whether node categories are immutable</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "sources.features.minNodeCategories",
            "description": "<p>Minimum number of categories for a node</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "sources.features.maxNodeCategories",
            "description": "<p>Maximum number of categories for a node</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.canCount",
            "description": "<p>Whether one among the graph or the index can count nodes and edges</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.alerts",
            "description": "<p>Whether alerts are available</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "sources.features.dialects",
            "description": "<p>Dialects supported by the graph database</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.shortestPath",
            "description": "<p>Whether shortest paths queries are allowed</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.externalIndex",
            "description": "<p>Whether the search index is internal (e.g: elasticsearch) or external (e.g: DSE Search)</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.alternativeIds",
            "description": "<p>Whether alternative IDs can be used</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.fuzzy",
            "description": "<p>Whether the search index allows fuzzy search queries</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.canIndexEdges",
            "description": "<p>Whether the search index can index edges</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.canIndexCategories",
            "description": "<p>Whether the search index can index categories</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.versions",
            "description": "<p>Whether nodes and edges versions are increased on edit</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sources.features.advancedQueryDialect",
            "description": "<p>Whether the index provide advanced queries and with which 'dialect'</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "sources.features.searchHitsCount",
            "description": "<p>Whether the search result will contain 'totalHits' or 'moreResults'</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"sources\": [\n    {\n      \"name\": \"Database #0\",\n      \"configIndex\": 0,\n      \"key\": \"a2e3c50f\",\n      \"connected\": true,\n      \"state\": \"ready\",\n      \"reason\": \"The data-source is ready.\",\n      \"settings\": {\n        \"alternativeIds\": {\n          \"node\": \"name\",\n          \"edge\": \"altEdgeID\"\n        },\n        \"skipEdgeIndexation\": false,\n        \"readOnly\": false,\n        \"specialProperties\": [\n          {\n            \"key\": \"propertyName\",\n            \"read\": true,\n            \"create\": true,\n            \"update\": false\n          }\n        ]\n      },\n      \"features\": {\n        \"schema\": {\n          \"counts\": true,\n          \"properties\": true,\n          \"inferred\": true\n        },\n        \"typing\": true,\n        \"edgeProperties\": true,\n        \"immutableNodeCategories\": false,\n        \"minNodeCategories\": 0,\n        \"canCount\": true,\n        \"alerts\": true,\n        \"dialects\": [\n          \"cypher\"\n        ],\n        \"shortestPaths\": true,\n        \"externalIndex\": false,\n        \"alternativeIds\": true,\n        \"fuzzy\": true,\n        \"canIndexEdges\": true,\n        \"canIndexCategories\": true,\n        \"versions\": true,\n        \"advancedQueryDialect\": \"elasticsearch\",\n        \"searchHitsCount\": true\n      }\n    }, {\n      \"name\": \"Database #1\",\n      \"configIndex\": 1,\n      \"key\": \"ef984bb0\",\n      \"connected\": true,\n      \"state\": \"needFirstIndex\",\n      \"reason\": \"The data-source needs to be indexed at least once.\",\n      \"settings\": {\n        // ...\n      },\n      \"features\": {\n        // ...\n      }\n    }, {\n      \"name\": \"Database #2\",\n      \"configIndex\": 2,\n      \"key\": null,\n      \"connected\": false,\n      \"state\": \"offline\",\n      \"reason\": \"Could not connect to graph database server.\",\n      \"error\": \"Connection refused (check your username and password)\",\n      \"settings\": {\n        // ...\n      },\n      \"features\": {\n        // ...\n      }\n    }\n  ]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/general.js",
    "groupTitle": "Linkurious"
  },
  {
    "type": "get",
    "url": "/api/config",
    "title": "Get the configuration",
    "name": "GetConfiguration",
    "group": "Linkurious",
    "version": "1.0.0",
    "description": "<p>Get the configuration of Linkurious.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "sourceIndex",
            "defaultValue": "0",
            "description": "<p>Index of the data-source in the <code>dataSources</code> array in the configuration of which the <code>source</code> field in the response will be about</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "access",
            "description": "<p>Access configuration</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "access.authRequired",
            "description": "<p>Whether authentication is required</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "access.loginTimeout",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"dashboard\"",
              "\"workspace\""
            ],
            "optional": false,
            "field": "access.defaultPage",
            "description": "<p>Default page</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "access.defaultPageParams",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "access.dataEdition",
            "description": "<p>Whether it's possible to create, update and delete nodes and edges</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "access.widget",
            "description": "<p>Whether the widget feature is enabled</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "ogma",
            "description": "<p>Configuration of Ogma</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "enterprise",
            "description": "<p>Whether this is Linkurious Enterprise or Linkurious Starter</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "domain",
            "description": "<p>The server domain</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "ssoProvider",
            "description": "<p>The current SSO provider (or <code>null</code> if none)</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "defaultStyles",
            "description": "<p>Default styles configuration</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "defaultCaptions",
            "description": "<p>Default captions configuration</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "advanced",
            "description": "<p>Advanced data-source settings applied to all data-sources</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "advanced.maxPathLength",
            "description": "<p>Maximum path length returned by the shortest path API</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "advanced.shortestPathsMaxResults",
            "description": "<p>Maximum number of results returned by shortest paths API</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "advanced.connectionRetries",
            "description": "<p>Maximum number of retries when connecting/reconnecting to data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "advanced.pollInterval",
            "description": "<p>Number of seconds between &quot;pings&quot; to a data-source when connected</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "advanced.indexationChunkSize",
            "description": "<p>Number of nodes/edges read at once from a data-source when indexing it</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "advanced.expandThreshold",
            "description": "<p>Number of expanded nodes that will trigger the &quot;limit expand to&quot; popup</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "advanced.searchAddAllThreshold",
            "description": "<p>Maximum number of added nodes using the &quot;add all&quot; in a search</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "advanced.searchThreshold",
            "description": "<p>Maximum value of the <code>&quot;size&quot;</code> parameter in all search APIs</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "advanced.minSearchQueryLength",
            "description": "<p>Minimum number of characters in a search query before it is sent to the server</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "advanced.rawQueryTimeout",
            "description": "<p>Timeout of pattern queries (<code>cypher</code>, <code>gremlin</code>, etc.) in milliseconds</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "advanced.layoutWorkers",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "advanced.defaultFuzziness",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "advanced.extraCertificateAuthorities",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "advanced.obfuscation",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "palette",
            "description": "<p>Palette configuration</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "leaflet",
            "description": "<p>Leaflet layer configuration</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "leaflet.name",
            "description": "<p>Name of the layer</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "leaflet.urlTemplate",
            "description": "<p>Tile-URL template for this layer</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "leaflet.attribution",
            "description": "<p>Copyright attribution text for this layer</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "leaflet.minZoom",
            "description": "<p>Minimum valid zoom of the layer</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "leaflet.maxZoom",
            "description": "<p>Maximum valid zoom of the layer</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "leaflet.thumbnail",
            "description": "<p>Path of this layer's thumbnail, relative to client root</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "leaflet.subdomains",
            "description": "<p>Subdomain letters to use in tile-URL template</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "leaflet.id",
            "description": "<p>Layer ID (needed for MapBox layers)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "leaflet.accessToken",
            "description": "<p>Layer access token (user for MapBox layers)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "leaflet.overlay",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "db",
            "description": "<p>DB configuration (if admin)</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "server",
            "description": "<p>Server configuration (if admin)</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "alerts",
            "description": "<p>Alerts configuration (if admin)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "alerts.maxMatchTTL",
            "description": "<p>The maximum and default number of days after which the matches of this alert are going to be deleted</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "alerts.maxMatchesLimit",
            "description": "<p>The maximum and default number of matches stored for an alert</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "alerts.maxRuntimeLimit",
            "description": "<p>The maximum and default runtime limit for an alert update (in milliseconds)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "alerts.maxConcurrency",
            "description": "<p>The maximum number of alerts updated at the same time</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "auditTrail",
            "description": "<p>AuditTrail configuration (if admin)</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "defaultPreferences",
            "description": "<p>Default preferences of a newly created user (if admin)</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "guestPreferences",
            "description": "<p>Preferences of the guest user (if admin)</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Data-source configuration (if admin)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "dataSource.name",
            "description": "<p>Name of the current data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "dataSource.readOnly",
            "description": "<p>Whether the current data-source is read-only</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "dataSource.graphdb",
            "description": "<p>Graph configuration of the current data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "dataSource.index",
            "description": "<p>Index configuration of the current data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "needRestart",
            "description": "<p>Whether the Linkurious Server needs to be restarted</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/general.js",
    "groupTitle": "Linkurious"
  },
  {
    "type": "post",
    "url": "/api/admin/restart",
    "title": "Restart Linkurious",
    "name": "RestartLinkurious",
    "group": "Linkurious",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.config"
      }
    ],
    "description": "<p>Restart Linkurious.</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "url",
            "description": "<p>The url of Linkurious to connect to after the restart</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"url\": \"http://localhost:3000\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/admin/general.js",
    "groupTitle": "Linkurious"
  },
  {
    "type": "post",
    "url": "/api/analytics",
    "title": "Save an event",
    "name": "SaveEvent",
    "group": "Linkurious",
    "version": "1.0.0",
    "description": "<p>Save an event to the analytics' log file. All events follow the Segment Spec.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"identify\"",
              "\"track\"",
              "\"page\""
            ],
            "optional": false,
            "field": "type",
            "description": "<p>Type of message</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "userId",
            "description": "<p>ID of the user</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "event",
            "description": "<p>Name of the action that the user has performed</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "name",
            "description": "<p>Name of the page that the user has seen</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "properties",
            "description": "<p>Free-form dictionary of properties of the event/page</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "traits",
            "description": "<p>Free-form dictionary of traits of the user</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "timestamp",
            "description": "<p>Timestamp when the message itself took place, defaulted to the current time, in ISO-8601 format</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "context",
            "description": "<p>Dictionary of extra information of the user</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 204 No Content",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/general.js",
    "groupTitle": "Linkurious"
  },
  {
    "type": "get",
    "url": "/api/status",
    "title": "Get status",
    "name": "Status",
    "group": "Linkurious",
    "version": "1.0.0",
    "description": "<p>Get the status of the Linkurious Server.</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "status",
            "description": "<p>Status of the server</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "status.code",
            "description": "<p>Status code of the server (<code>100</code> : starting, <code>200</code> : OK, <code>&gt;400</code> : problem)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "status.name",
            "description": "<p>Current server status</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "status.message",
            "description": "<p>Description of the current server status</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "status.uptime",
            "description": "<p>Seconds since the server is up</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"status\": {\n    \"code\": 200,\n    \"name\": \"initialized\",\n    \"message\": \"Linkurious ready to go :)\",\n    \"uptime\": 122\n  }\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/general.js",
    "groupTitle": "Linkurious"
  },
  {
    "type": "post",
    "url": "/api/config",
    "title": "Update the configuration",
    "name": "UpdateConfiguration",
    "group": "Linkurious",
    "permission": [
      {
        "name": "action:admin.config"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Update Linkurious' configuration.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "path",
            "description": "<p>The configuration path to override (use <code>dataSource.*</code> to edit the current data-source configuration)</p>"
          },
          {
            "group": "Parameter",
            "type": "any",
            "optional": true,
            "field": "configuration",
            "description": "<p>The configuration value to set for the given path</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "sourceIndex",
            "defaultValue": "0",
            "description": "<p>Index of the data-source in the <code>dataSources</code> array in the configuration</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "reset",
            "defaultValue": "false",
            "description": "<p>Whether to reset the configuration to default values (the <code>configuration</code> parameter will be ignored). If the <code>path</code> parameter is specified, only the configuration corresponding to the specified path will be reset</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n  \"path\": \"dataSource.name\",\n  \"configuration\": \"New data-source name\",\n  \"sourceIndex\": 2\n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP 1.1 201 Created",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/general.js",
    "groupTitle": "Linkurious"
  },
  {
    "type": "get",
    "url": "/api/version",
    "title": "Get version",
    "name": "Version",
    "group": "Linkurious",
    "version": "1.0.0",
    "description": "<p>Get Linkurious' current version information.</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "tag_name",
            "description": "<p>Version tag</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "name",
            "description": "<p>Version name</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "prerelease",
            "description": "<p>Whether this is a pre-release</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "enterprise",
            "description": "<p>Whether this is Linkurious Enterprise or Linkurious Starter</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"tag_name\": \"v0.5.0\",\n  \"name\": \"Nasty Nostradamus\",\n  \"prerelease\": true,\n  \"enterprise\": true\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/general.js",
    "groupTitle": "Linkurious"
  },
  {
    "type": "delete",
    "url": "/api/:dataSource/graph/nodes/:id",
    "title": "Delete a node",
    "name": "DeleteNode",
    "group": "Nodes",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:graphItem.delete"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Delete a node and its adjacent edges from the graph.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the node</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 204 No Content",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/graphNode.js",
    "groupTitle": "Nodes"
  },
  {
    "type": "post",
    "url": "/api/:dataSource/graph/nodes/expand",
    "title": "Get adjacent nodes and edges",
    "name": "GetAdjacentGraph",
    "group": "Nodes",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "__guest",
        "title": "The guest user can use this API if guest mode is allowed.",
        "description": ""
      },
      {
        "name": "apiright:graphItem.read"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Get all the adjacent nodes and edges to one or more source nodes (<code>ids</code>). The result is an array of nodes containing the sources nodes and their neighbors. Edges between sources nodes and their neighbors - as well as edges between the neighbors themselves - are returned in the <code>edges</code> field of each node.</p> <p>If <code>visible_nodes</code> is specified, edges between source nodes, their neighbors and the visible nodes are also included.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "type:id[]",
            "optional": false,
            "field": "ids",
            "description": "<p>List of node IDs</p>"
          },
          {
            "group": "Parameter",
            "type": "type:id[]",
            "optional": false,
            "field": "ignored_nodes",
            "description": "<p>IDs of the nodes to ignore (they won't be included in the result)</p>"
          },
          {
            "group": "Parameter",
            "type": "type:id[]",
            "optional": false,
            "field": "visible_nodes",
            "description": "<p>IDs of nodes that are already visible (they won't be included in the result, but their adjacent edges will be included in the <code>edges</code> field of the adjacent nodes)</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "node_category",
            "description": "<p>Filter by node category (use <code>[no_category]</code> to match nodes with no categories)</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "edge_type",
            "description": "<p>Filter by edge type</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "limit",
            "description": "<p>Maximum number of returned nodes (<strong>EXCLUDING</strong> source nodes)</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"id\"",
              "\"highestDegree\"",
              "\"lowestDegree\""
            ],
            "optional": true,
            "field": "limit_type",
            "defaultValue": "id",
            "description": "<p>Order direction used to limit the result</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_digest",
            "defaultValue": "false",
            "description": "<p>Whether to include the adjacency digest</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_degree",
            "defaultValue": "false",
            "description": "<p>Whether to include the degree in the returned nodes</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_version",
            "defaultValue": "false",
            "description": "<p>Whether to include the node version</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n  \"ids\": [1],\n  \"node_category\": \"Movie\",\n  \"limit\": 2,\n  \"limit_type\": \"highestDegree\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/graphNode.js",
    "groupTitle": "Nodes",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "nodes",
            "description": "<p>Nodes</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodes.id",
            "description": "<p>ID of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "nodes.data",
            "description": "<p>Properties of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "nodes.categories",
            "description": "<p>Categories of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": true,
            "field": "nodes.statistics",
            "description": "<p>Statistics of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "type:LkDigestItem[]",
            "optional": true,
            "field": "nodes.statistics.digest",
            "description": "<p>Statistics of the neighborhood of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": true,
            "field": "nodes.statistics.degree",
            "description": "<p>Number of neighbors of the node readable by the current user</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "nodes.edges",
            "description": "<p>Subset of adjacent edges of this node (only the ones matching the API description)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodes.edges.id",
            "description": "<p>ID of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "nodes.edges.data",
            "description": "<p>Properties of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodes.edges.type",
            "description": "<p>Type of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodes.edges.source",
            "description": "<p>ID of the source node</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodes.edges.target",
            "description": "<p>ID of the target node</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n[\n  {\n    \"id\": 1,\n    \"data\": {\n      \"name\": \"Keanu Reeves\",\n      \"born\": 1964\n    },\n    \"categories\": [\"Person\"],\n    \"statistics\": {\n      \"digest\": [\n        {\n          \"nodeCategories\": [\"Movie\", \"TheMatrix\", \"TheMatrixReloaded\"],\n          \"edgeType\": \"ACTED_IN\",\n          \"nodes\": 3,\n          \"edges\": 3\n        }\n      ]\n    },\n    \"edges\": [\n      {\n        \"id\": 100,\n        \"type\": \"ACTED_IN\",\n        \"source\": 1,\n        \"target\": 2,\n        \"data\": {\n          \"role\": \"Neo\"\n        }\n      },\n      {\n        \"id\": 101,\n        \"type\": \"ACTED_IN\",\n        \"source\": 1,\n        \"target\": 3,\n        \"data\": {\n          \"role\": \"Neo\"\n        }\n      }\n    ]\n  },\n  {\n    \"id\": 2,\n    \"data\": {\n      \"title\": \"The Matrix\",\n      \"release\": 1999\n    },\n    \"categories\": [\"Movie\"],\n    \"statistics\": {\n      \"digest\": [\n        {\n          \"nodeCategories\": [\"Person\"],\n          \"edgeType\": \"ACTED_IN\",\n          \"nodes\": 2,\n          \"edges\": 2\n        }\n      ]\n    },\n    \"edges\": [\n      {\n        \"id\": 100,\n        \"type\": \"ACTED_IN\",\n        \"source\": 1,\n        \"target\": 2,\n        \"data\": {\n          \"role\": \"Neo\"\n        }\n      },\n      {\n        \"id\": 102\n        \"type\": \"SEQUEL_OF\",\n        \"source\": 3,\n        \"target\": 2,\n        \"data\": {}\n      }\n    ]\n  },\n  {\n    \"id\": 3,\n    \"data\": {\n      \"title\": \"The Matrix Reloaded\",\n      \"release\": 2003\n    },\n    \"categories\": [\"Movie\"],\n    \"statistics\": {\n      \"digest\": [\n        {\n          \"nodeCategories\": [\"Person\"],\n          \"edgeType\": \"ACTED_IN\",\n          \"nodes\": 2,\n          \"edges\": 2\n        }\n      ]\n    },\n    \"edges\": [\n      {\n        \"id\": 101,\n        \"type\": \"ACTED_IN\",\n        \"source\": 1,\n        \"target\": 3,\n        \"data\": {\n          \"role\": \"Neo\"\n        }\n      },\n      {\n        \"id\": 102\n        \"type\": \"SEQUEL_OF\",\n        \"source\": 3,\n        \"target\": 2,\n        \"data\": {}\n      }\n    ]\n  }\n]",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/api/:dataSource/graph/neighborhood/statistics",
    "title": "Get statistics of adjacent nodes/edges",
    "name": "GetNeighborsStatistics",
    "group": "Nodes",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "__guest",
        "title": "The guest user can use this API if guest mode is allowed.",
        "description": ""
      },
      {
        "name": "apiright:graphItem.read"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Get the digest (the number of adjacent nodes and edges grouped by node categories and edge types) and/or the degree of a given subset of nodes (<code>ids</code>). You can't get aggregated statistics of a subset of nodes containing one or more supernodes. To get the statistics of a supernode invoke the API with only its node ID.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "type:id[]",
            "optional": false,
            "field": "ids",
            "description": "<p>List of node IDs</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_digest",
            "defaultValue": "false",
            "description": "<p>Whether to include the adjacency digest</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_degree",
            "defaultValue": "false",
            "description": "<p>Whether to include the degree in the returned nodes</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "type:LkDigestItem[]",
            "optional": true,
            "field": "digest",
            "description": "<p>Statistics of the neighborhood of the nodes</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": true,
            "field": "degree",
            "description": "<p>Number of neighbors of the nodes readable by the current user</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"digest\": [\n    {\n      \"edgeType\": \"ACTED_IN\",\n      \"nodeCategories\": [\"TheMatrix\", \"Movie\"],\n      \"nodes\": 1,\n      \"edges\": 1\n    }\n  ],\n  \"degree\": 1\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/graphNode.js",
    "groupTitle": "Nodes"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/graph/nodes/:id",
    "title": "Get a node",
    "name": "GetNode",
    "group": "Nodes",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "__guest",
        "title": "The guest user can use this API if guest mode is allowed.",
        "description": ""
      },
      {
        "name": "apiright:graphItem.read"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Get a node of the graph.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the node</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_edges",
            "defaultValue": "false",
            "description": "<p>Whether to include adjacent edges</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_digest",
            "defaultValue": "false",
            "description": "<p>Whether to include the adjacency digest</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_degree",
            "defaultValue": "false",
            "description": "<p>Whether to include the degree in the returned nodes</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_version",
            "defaultValue": "false",
            "description": "<p>Whether to include the node version</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/graphNode.js",
    "groupTitle": "Nodes",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "data",
            "description": "<p>Properties of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": true,
            "field": "statistics",
            "description": "<p>Statistics of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "type:LkDigestItem[]",
            "optional": true,
            "field": "statistics.digest",
            "description": "<p>Statistics of the neighborhood of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": true,
            "field": "statistics.degree",
            "description": "<p>Number of neighbors of the node readable by the current user</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "categories",
            "description": "<p>Categories of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": true,
            "field": "version",
            "description": "<p>Version of the node</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 123,\n  \"data\": {\n    \"name\": \"Keanu Reeves\",\n    \"born\": 1964\n  },\n  \"categories\": [\n    \"Person\"\n  ],\n  \"statistics\": {\n    \"digest\": [\n      {\n        \"nodeCategories\": [\"Movie\"],\n        \"edgeType\": \"ACTED_IN\",\n        \"nodes\": 1,\n        \"edges\": 1\n      }\n    ]\n  }\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/:dataSource/graph/nodes/count",
    "title": "Get nodes count",
    "name": "GetNodesCount",
    "group": "Nodes",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      }
    ],
    "version": "1.0.0",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "count",
            "description": "<p>The number of nodes</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"count\": 42\n}",
          "type": "json"
        }
      ]
    },
    "description": "<p>Get the number of nodes in the graph.</p>",
    "filename": "server/services/webServer/routes/graphNode.js",
    "groupTitle": "Nodes"
  },
  {
    "type": "patch",
    "url": "/api/:dataSource/graph/nodes/:id",
    "title": "Update a node",
    "name": "PatchNode",
    "group": "Nodes",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:graphItem.edit"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Update a subset of properties and categories of a node. Keep every other property and category of the node unchanged.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the node</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "properties",
            "description": "<p>Properties to update or create</p>"
          },
          {
            "group": "Parameter",
            "type": "string[]",
            "optional": true,
            "field": "deleted_properties",
            "description": "<p>Properties to delete</p>"
          },
          {
            "group": "Parameter",
            "type": "string[]",
            "optional": true,
            "field": "added_categories",
            "description": "<p>Categories of the node to add</p>"
          },
          {
            "group": "Parameter",
            "type": "string[]",
            "optional": true,
            "field": "deleted_categories",
            "description": "<p>Categories of the node to delete</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "version",
            "description": "<p>The current node version</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/graphNode.js",
    "groupTitle": "Nodes",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "data",
            "description": "<p>Properties of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "categories",
            "description": "<p>Categories of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "version",
            "description": "<p>Version of the node</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 123,\n  \"data\": {\n    \"name\": \"Keanu Reeves\",\n    \"born\": 1964\n  },\n  \"categories\": [\n    \"Person\"\n  ],\n  \"version\": 2\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/api/:dataSource/graph/nodes",
    "title": "Create a node",
    "name": "PostNode",
    "group": "Nodes",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:graphItem.create"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Add a node to the graph.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "properties",
            "description": "<p>Properties of the node</p>"
          },
          {
            "group": "Parameter",
            "type": "string[]",
            "optional": true,
            "field": "categories",
            "description": "<p>Categories of the node</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/graphNode.js",
    "groupTitle": "Nodes",
    "success": {
      "fields": {
        "Success 201": [
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the node</p>"
          },
          {
            "group": "Success 201",
            "type": "object",
            "optional": false,
            "field": "data",
            "description": "<p>Properties of the node</p>"
          },
          {
            "group": "Success 201",
            "type": "string[]",
            "optional": false,
            "field": "categories",
            "description": "<p>Categories of the node</p>"
          },
          {
            "group": "Success 201",
            "type": "number",
            "optional": false,
            "field": "version",
            "description": "<p>Version of the node</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 201 Created\n{\n  \"id\": 123,\n  \"data\": {\n    \"name\": \"Keanu Reeves\",\n    \"born\": 1964\n  },\n  \"categories\": [\n    \"Person\"\n  ],\n  \"version\": 1\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/:dataSource/graph/schema/edgeTypes/properties",
    "title": "List edge-type properties",
    "name": "GetSchemaEdgeProperties",
    "group": "Schema",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "__guest",
        "title": "The guest user can use this API if guest mode is allowed.",
        "description": ""
      },
      {
        "name": "apiright:schema"
      }
    ],
    "version": "1.0.0",
    "description": "<p>List all edgeType properties (aggregated from all edgeTypes)</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of a data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "include_type",
            "defaultValue": "false",
            "description": "<p>Whether to include property type info (from index)</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "omit_noindex",
            "defaultValue": "false",
            "description": "<p>whether to omit no-index properties</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "properties",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "properties.key",
            "description": "<p>Key of the property.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "properties.count",
            "description": "<p>Number of properties with that key.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "undefined",
              "\"string\"",
              "\"boolean\"",
              "\"long\"",
              "\"integer\"",
              "\"double\"",
              "\"float\"",
              "\"date\""
            ],
            "optional": false,
            "field": "properties.type",
            "description": "<p>Type of the property (Only when <code>&quot;include_type&quot;</code> is true).</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"properties\": [\n    {\"key\": \"tagline\", \"count\": 38},\n    {\"key\": \"born\", \"count\": 128},\n    {\"key\": \"name\", \"count\": 133}\n  ]\n}",
          "type": "json"
        },
        {
          "title": "Success-Response (with type):",
          "content": "HTTP/1.1 200 OK\n{\n  \"properties\": [\n    {\"key\": \"tagline\", \"count\": 38, \"type\": \"string\"},\n    {\"key\": \"born\", \"count\": 128, \"type\": \"date\"},\n    {\"key\": \"name\", \"count\": 133, \"type\": \"string\"}\n  ]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/graphSchema.js",
    "groupTitle": "Schema"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/graph/schema/edgeTypes",
    "title": "List edge-types",
    "name": "GetSchemaEdgeTypes",
    "group": "Schema",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "__guest",
        "title": "The guest user can use this API if guest mode is allowed.",
        "description": ""
      },
      {
        "name": "apiright:schema"
      }
    ],
    "version": "1.0.0",
    "description": "<p>List edge-types indexed by linkurious</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "include_type",
            "defaultValue": "false",
            "description": "<p>Whether to include property type info (from index)</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of a data-source</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "edgeTypes",
            "description": "<p>All known edge types.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "edgeTypes.name",
            "description": "<p>Name of the node type</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "edgeTypes.count",
            "description": "<p>Number of edges with this type.</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "edgeTypes.properties",
            "description": "<p>Existing properties for the edge type.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "edgeTypes.properties.key",
            "description": "<p>Key of the edge-type property.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "edgeTypes.properties.count",
            "description": "<p>Number properties with this key for this edge-type.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "undefined",
              "\"string\"",
              "\"boolean\"",
              "\"long\"",
              "\"integer\"",
              "\"double\"",
              "\"float\"",
              "\"date\""
            ],
            "optional": false,
            "field": "edgeTypes.properties.type",
            "description": "<p>Type of the property (Only when <code>&quot;include_type&quot;</code> is true).</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"edgeTypes\": [\n    {\n      \"count\": 38,\n      \"name\": \"DIRECTED_BY\"\n      \"properties\": [\n        {\"key\": \"released\", \"count\": 38},\n        {\"key\": \"tagline\", \"count\": 37},\n        {\"key\": \"title\", \"count\": 38}\n      ]\n    },\n    {\n      \"count\": 71,\n      \"name\": \"ACTED_IN\"\n      \"properties\": [\n        {\"key\": \"role\", \"count\": 4},\n        {\"key\": \"salary\", \"count\": 12}\n      ]\n    }\n  ]\n}",
          "type": "json"
        },
        {
          "title": "Success-Response (with type):",
          "content": "HTTP/1.1 200 OK\n{\n  \"edgeTypes\": [\n    {\n      \"count\": 38,\n      \"name\": \"DIRECTED_BY\"\n      \"properties\": [\n        {\"key\": \"released\", \"count\": 38, \"type\": \"date\"},\n        {\"key\": \"tagline\", \"count\": 37, \"type\": \"string\"},\n        {\"key\": \"title\", \"count\": 38, \"type\": \"string\"}\n      ]\n    },\n    {\n      \"count\": 71,\n      \"name\": \"ACTED_IN\"\n      \"properties\": [\n        {\"key\": \"role\", \"count\": 4, \"type\": \"string\"},\n        {\"key\": \"salary\", \"count\": 12, \"type\": \"integer\"}\n      ]\n    }\n  ]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/graphSchema.js",
    "groupTitle": "Schema"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/graph/schema/nodeTypes/properties",
    "title": "List node-type properties",
    "name": "GetSchemaNodeProperties",
    "group": "Schema",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "__guest",
        "title": "The guest user can use this API if guest mode is allowed.",
        "description": ""
      },
      {
        "name": "apiright:schema"
      }
    ],
    "version": "1.0.0",
    "description": "<p>List all node-type properties (aggregated from all nodeTypes)</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>key of a data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "include_type",
            "defaultValue": "false",
            "description": "<p>whether to include property type info (from index)</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "omit_noindex",
            "defaultValue": "false",
            "description": "<p>whether to omit no-index properties</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "properties",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "properties.key",
            "description": "<p>Key of the property.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "properties.count",
            "description": "<p>Number of properties with that key.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "undefined",
              "\"string\"",
              "\"boolean\"",
              "\"long\"",
              "\"integer\"",
              "\"double\"",
              "\"float\"",
              "\"date\""
            ],
            "optional": false,
            "field": "properties.type",
            "description": "<p>Type of the property (Only when <code>&quot;include_type&quot;</code> is true).</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"properties\": [\n    {\"key\": \"tagline\", \"count\": 38},\n    {\"key\": \"released\", \"count\": 39},\n    {\"key\": \"name\", \"count\": 133}\n  ]\n}",
          "type": "json"
        },
        {
          "title": "Success-Response (with type):",
          "content": "HTTP/1.1 200 OK\n{\n  \"properties\": [\n    {\"key\": \"tagline\", \"count\": 38, \"type\": \"string\"},\n    {\"key\": \"released\", \"count\": 39, \"type\": \"date\"},\n    {\"key\": \"name\", \"count\": 133, \"type\": \"string\"}\n  ]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/graphSchema.js",
    "groupTitle": "Schema"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/graph/schema/nodeTypes",
    "title": "Get node schema",
    "name": "GetSchemaNodeTypes",
    "group": "Schema",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "__guest",
        "title": "The guest user can use this API if guest mode is allowed.",
        "description": ""
      },
      {
        "name": "apiright:schema"
      }
    ],
    "version": "1.0.0",
    "description": "<p>List node-types indexed by Linkurious</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of a data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "omit_inferred",
            "defaultValue": "false",
            "description": "<p>Whether to omit inferred types (they have ugly names)</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "include_type",
            "defaultValue": "false",
            "description": "<p>Whether to include property type info (from index)</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "nodeTypes",
            "description": "<p>All known node types.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodeTypes.name",
            "description": "<p>Name of the node type (node category)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodeTypes.count",
            "description": "<p>Number of nodes with this type.</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "nodeTypes.properties",
            "description": "<p>Existing properties for the node type.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodeTypes.properties.key",
            "description": "<p>Key of the node-type property.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodeTypes.properties.count",
            "description": "<p>Number properties with this key for this node-type.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "undefined",
              "\"string\"",
              "\"boolean\"",
              "\"long\"",
              "\"integer\"",
              "\"double\"",
              "\"float\"",
              "\"date\""
            ],
            "optional": false,
            "field": "nodeTypes.properties.type",
            "description": "<p>Type of the property (Only when <code>&quot;include_type&quot;</code> is true).</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": " HTTP/1.1 200 OK\n {\n   \"nodeTypes\": [\n        {\n             \"name\": \"Movie\",\n             \"count\": 38,\n             \"properties\": [\n                 {\"key\": \"released\", \"count\": 38},\n                 {\"key\": \"tagline\", \"count\": 37},\n                 {\"key\": \"title\", \"count\": 38}\n            ]\n        }\n    ]\n}",
          "type": "json"
        },
        {
          "title": "Success-Response (with type):",
          "content": " HTTP/1.1 200 OK\n {\n   \"nodeTypes\": [\n        {\n             \"name\": \"Movie\",\n             \"count\": 38,\n             \"properties\": [\n                 {\"key\": \"released\", \"count\": 38, \"type\": \"date\"},\n                 {\"key\": \"tagline\", \"count\": 37, \"type\": \"string\"},\n                 {\"key\": \"title\", \"count\": 38, \"type\": \"string\"}\n            ]\n        }\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/graphSchema.js",
    "groupTitle": "Schema"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/graph/schema/simple",
    "title": "Get simple schema before first indexation",
    "name": "GetSimpleSchema",
    "group": "Schema",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:schema"
      }
    ],
    "version": "1.0.0",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of a data-source</p>"
          }
        ]
      }
    },
    "description": "<p>List nodeCategories, edgeTypes, nodeProperties and edgeProperties before the first indexation.</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "nodeCategories",
            "description": "<p>list of node categories defined in the graph DB</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "edgeTypes",
            "description": "<p>list of edge types defined in the graph DB</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "nodeProperties",
            "description": "<p>list of node properties defined in the graph DB</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "edgeProperties",
            "description": "<p>list of edge properties defined in the graph DB</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": " HTTP/1.1 200 OK\n {\n   \"nodeCategories\": [\"Movie\", \"Person\"],\n   \"edgeTypes\": [\"ACTED_IN\", \"DIRECTED\"],\n   \"nodeProperties\": [\"title\", \"name\", \"released\"],\n   \"edgeProperties\": [\"role\"]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/graphSchema.js",
    "groupTitle": "Schema"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/search/nodes/full",
    "title": "Search full nodes or edges",
    "name": "SearchFull",
    "group": "Search",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "__guest",
        "title": "The guest user can use this API if guest mode is allowed.",
        "description": ""
      },
      {
        "name": "apiright:graphItem.search"
      }
    ],
    "description": "<p>Perform a search of nodes or edges based on a search query, a fuzziness value and a filter. An array of nodes is returned.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"nodes\"",
              "\"edges\""
            ],
            "optional": false,
            "field": "type",
            "description": "<p>The item type to search</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "q",
            "description": "<p>Search query</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "strict_edges",
            "defaultValue": "false",
            "description": "<p>Return only edges between nodes in the result (taken into account only if <code>type</code> is <code>&quot;nodes&quot;</code>)</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "fuzziness",
            "description": "<p>Fuzziness value (<code>1</code> means exact match, <code>0</code> completely fuzzy)</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "size",
            "description": "<p>Page size (maximum number of returned items)</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "from",
            "description": "<p>Offset from the first result</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "filter",
            "description": "<p>String containing all the filters, e.g.: <code>&quot;name::todd|city::denver&quot;</code></p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_digest",
            "defaultValue": "false",
            "description": "<p>Whether to include the adjacency digest</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_degree",
            "defaultValue": "false",
            "description": "<p>Whether to include the degree in the returned nodes</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/search.js",
    "groupTitle": "Search",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "nodes",
            "description": "<p>Nodes</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodes.id",
            "description": "<p>ID of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "nodes.data",
            "description": "<p>Properties of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "nodes.categories",
            "description": "<p>Categories of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": true,
            "field": "nodes.statistics",
            "description": "<p>Statistics of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "type:LkDigestItem[]",
            "optional": true,
            "field": "nodes.statistics.digest",
            "description": "<p>Statistics of the neighborhood of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": true,
            "field": "nodes.statistics.degree",
            "description": "<p>Number of neighbors of the node readable by the current user</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "nodes.edges",
            "description": "<p>Subset of adjacent edges of this node (only the ones matching the API description)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodes.edges.id",
            "description": "<p>ID of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "nodes.edges.data",
            "description": "<p>Properties of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodes.edges.type",
            "description": "<p>Type of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodes.edges.source",
            "description": "<p>ID of the source node</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "nodes.edges.target",
            "description": "<p>ID of the target node</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n[\n  {\n    \"id\": 1,\n    \"data\": {\n      \"name\": \"Keanu Reeves\",\n      \"born\": 1964\n    },\n    \"categories\": [\"Person\"],\n    \"statistics\": {\n      \"digest\": [\n        {\n          \"nodeCategories\": [\"Movie\", \"TheMatrix\", \"TheMatrixReloaded\"],\n          \"edgeType\": \"ACTED_IN\",\n          \"nodes\": 3,\n          \"edges\": 3\n        }\n      ]\n    },\n    \"edges\": [\n      {\n        \"id\": 100,\n        \"type\": \"ACTED_IN\",\n        \"source\": 1,\n        \"target\": 2,\n        \"data\": {\n          \"role\": \"Neo\"\n        }\n      },\n      {\n        \"id\": 101,\n        \"type\": \"ACTED_IN\",\n        \"source\": 1,\n        \"target\": 3,\n        \"data\": {\n          \"role\": \"Neo\"\n        }\n      }\n    ]\n  },\n  {\n    \"id\": 2,\n    \"data\": {\n      \"title\": \"The Matrix\",\n      \"release\": 1999\n    },\n    \"categories\": [\"Movie\"],\n    \"statistics\": {\n      \"digest\": [\n        {\n          \"nodeCategories\": [\"Person\"],\n          \"edgeType\": \"ACTED_IN\",\n          \"nodes\": 2,\n          \"edges\": 2\n        }\n      ]\n    },\n    \"edges\": [\n      {\n        \"id\": 100,\n        \"type\": \"ACTED_IN\",\n        \"source\": 1,\n        \"target\": 2,\n        \"data\": {\n          \"role\": \"Neo\"\n        }\n      },\n      {\n        \"id\": 102\n        \"type\": \"SEQUEL_OF\",\n        \"source\": 3,\n        \"target\": 2,\n        \"data\": {}\n      }\n    ]\n  },\n  {\n    \"id\": 3,\n    \"data\": {\n      \"title\": \"The Matrix Reloaded\",\n      \"release\": 2003\n    },\n    \"categories\": [\"Movie\"],\n    \"statistics\": {\n      \"digest\": [\n        {\n          \"nodeCategories\": [\"Person\"],\n          \"edgeType\": \"ACTED_IN\",\n          \"nodes\": 2,\n          \"edges\": 2\n        }\n      ]\n    },\n    \"edges\": [\n      {\n        \"id\": 101,\n        \"type\": \"ACTED_IN\",\n        \"source\": 1,\n        \"target\": 3,\n        \"data\": {\n          \"role\": \"Neo\"\n        }\n      },\n      {\n        \"id\": 102\n        \"type\": \"SEQUEL_OF\",\n        \"source\": 3,\n        \"target\": 2,\n        \"data\": {}\n      }\n    ]\n  }\n]",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/:dataSource/search/:type",
    "title": "Search for nodes or edges grouped by category/type",
    "name": "SearchNodesOrEdges",
    "group": "Search",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "__guest",
        "title": "The guest user can use this API if guest mode is allowed.",
        "description": ""
      },
      {
        "name": "apiright:graphItem.search"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"nodes\"",
              "\"edges\""
            ],
            "optional": false,
            "field": "type",
            "description": "<p>The item type to search</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "q",
            "description": "<p>Search query</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "size": "0-1",
            "optional": true,
            "field": "fuzziness",
            "description": "<p>Fuzziness value (<code>1</code> means exact match, <code>0</code> completely fuzzy)</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "size": "1-",
            "optional": true,
            "field": "size",
            "description": "<p>Page size (maximum number of returned items)</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "size": "0-",
            "optional": true,
            "field": "from",
            "description": "<p>Offset from the first result</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "filter",
            "description": "<p>String containing all the filters, e.g.: <code>&quot;name::todd|city::denver&quot;</code></p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "full",
            "defaultValue": "false",
            "description": "<p>Include the <code>data</code> field for each returned item</p>"
          }
        ]
      }
    },
    "description": "<p>Perform a search of nodes or edges based on a search query, a fuzziness value and a filter. Search results are grouped by category for nodes and type for edges.</p> <p>Search results are grouped by categories. So, for example:</p> <ul> <li><code>results[0].categories</code> is the collection of categories for the first group</li> <li><code>results[0].children</code> are the actual items returned for the first group</li> <li><code>results[0].children[0]</code> is the first node (or edge) that matches the search query</li> </ul>",
    "examples": [
      {
        "title": "Example usage:",
        "content": "curl -i http://localhost:3000/api/a1ez3a/search/nodes?q=Matrix\ncurl -i http://localhost:3000/api/a1ez3a/search/nodes?q=Matrix&fuzziness=0.9\ncurl -i http://localhost:3000/api/a1ez3a/search/nodes?q=Reloaded%20OR%20Revolutions\ncurl -i http://localhost:3000/api/a1ez3a/search/nodes?q=Reloded&filter=released::1999|title::test",
        "type": "json"
      }
    ],
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"node\"",
              "\"edge\""
            ],
            "optional": false,
            "field": "type",
            "description": "<p>The item type given in input</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": true,
            "field": "totalHits",
            "description": "<p>The total number of matching items (not guaranteed to be available)</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": true,
            "field": "moreResults",
            "description": "<p>If <code>totalHits</code> is <code>undefined</code>, <code>moreResults</code> will indicates if there are more items or not to still be retrieved (<code>undefined</code> if <code>totalHits</code> is returned)</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "results",
            "description": "<p>Groups of matching items</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "results.title",
            "description": "<p>Title of the group (based on categories for nodes and type for edges)</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "results.categories",
            "description": "<p>List of categories/types of the group</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "results.children",
            "description": "<p>Matching items</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "results.children.id",
            "description": "<p>ID of the item</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "results.children.name",
            "description": "<p>Name of the matching items (based on heuristics, using 'title' or 'name' properties when available)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "results.children.field",
            "description": "<p>Property field that matched with the search query</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "results.children.value",
            "description": "<p>Value of the property that matched the search query (the matching part of the string is surrounded by <code>[match]</code> and <code>[/match]</code>)</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"type\": \"node\",\n  \"totalHits\": 2,\n  \"results\": [{\n    \"title\": \"Movie, Matrix\",\n    \"categories\": [\"Movie\", \"Matrix\"]\n    \"children\": [{\n      \"id\": 11399,\n      \"name\": \"The Matrix Reloaded\",\n      \"field\": \"title\"\n      \"value\": \"The Matrix [match]Reloaded[/match]\"\n    }, {\n      \"id\": 11400,\n      \"name\": \"The Matrix Revolutions\"\n      \"field\": \"title\"\n      \"value\": \"The Matrix [match]Revolutions[/match]\"\n    }]\n  }]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/search.js",
    "groupTitle": "Search"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/search/reindex",
    "title": "Run the indexation",
    "name": "SearchReIndex",
    "group": "Search",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.index"
      }
    ],
    "description": "<p>Reindex the graph database.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 204 No Content",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/search.js",
    "groupTitle": "Search"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/search/status",
    "title": "Get the indexation status",
    "name": "SearchStatus",
    "group": "Search",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      }
    ],
    "description": "<p>Get the indexation status for a given data-source.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"ongoing\"",
              "\"needed\"",
              "\"done\"",
              "\"unknown\""
            ],
            "optional": false,
            "field": "indexing",
            "description": "<p>The status of the indexation</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "indexing_progress",
            "description": "<p>Percentage of the indexation (<code>null</code> if the indexing is not ongoing)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "node_count",
            "description": "<p>Number of nodes in the graph database (<code>null</code> if the indexing is not ongoing)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "edge_count",
            "description": "<p>Number of edges in the graph database (<code>null</code> if the indexing is not ongoing)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "index_size",
            "description": "<p>Number of nodes and edges in the index (<code>null</code> if the indexing is not ongoing)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "indexed_source",
            "description": "<p>Key of the data-source (<code>null</code> if the indexing is not ongoing)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "indexing_status",
            "description": "<p>A human readable string describing the indexation status</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"indexing\": \"ongoing\",\n  \"indexing_progress\": \"62.55\",\n  \"node_count\": 10,\n  \"edge_count\": 25,\n  \"index_size\": 19,\n  \"indexed_source\": \"c1d3fe\",\n  \"indexing_status\": \"Currently indexing 12375 nodes/s. Time left: 25 seconds.\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/search.js",
    "groupTitle": "Search"
  },
  {
    "type": "post",
    "url": "/api/admin/:dataSource/groups",
    "title": "Create a group",
    "name": "CreateGroup",
    "group": "Users",
    "permission": [
      {
        "name": "action:admin.users"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Add a new group.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "name",
            "description": "<p>Name of the group</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/user.js",
    "groupTitle": "Users",
    "success": {
      "fields": {
        "Success 201": [
          {
            "group": "Success 201",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the group</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "name",
            "description": "<p>Name of the group</p>"
          },
          {
            "group": "Success 201",
            "type": "boolean",
            "optional": false,
            "field": "builtin",
            "description": "<p>Whether the group was created internally by Linkurious</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "sourceKey",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Success 201",
            "type": "number",
            "optional": false,
            "field": "userCount",
            "description": "<p>Number of users in the group</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          },
          {
            "group": "Success 201",
            "type": "object[]",
            "optional": false,
            "field": "accessRights",
            "description": "<p>List of access rights</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "allowedValues": [
              "\"read\"",
              "\"write\"",
              "\"edit\"",
              "\"do\"",
              "\"none\""
            ],
            "optional": false,
            "field": "accessRights.type",
            "description": "<p>Type of the right</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "allowedValues": [
              "\"nodeCategory\"",
              "\"edgeType\"",
              "\"alert\"",
              "\"action\""
            ],
            "optional": false,
            "field": "accessRights.targetType",
            "description": "<p>Type of the target</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "accessRights.targetName",
            "description": "<p>Name of the target (node category, edge label, alert id or action name)</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 201 Created\n{\n  \"id\": 31,\n  \"name\": \"newGroup\",\n  \"builtin\": false,\n  \"sourceKey\": \"584f2569\",\n  \"userCount\": 0,\n  \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n  \"updatedAt\": \"2016-05-16T08:23:35.730Z\",\n  \"accessRights\": [\n    {\n      \"type\": \"none\",\n      \"targetType\": \"nodeCategory\",\n      \"targetName\": \"Movie\"\n    },\n    {\n      \"type\": \"none\",\n      \"targetType\": \"nodeCategory\",\n      \"targetName\": \"Person\"\n    },\n    {\n      \"type\": \"none\",\n      \"targetType\": \"edgeType\",\n      \"targetName\": \"ACTED_IN\"\n    }\n  ]\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/api/admin/users",
    "title": "Create a user",
    "name": "CreateUser",
    "group": "Users",
    "permission": [
      {
        "name": "action:admin.users"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Add a new user.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "username",
            "description": "<p>Username of the user</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "email",
            "description": "<p>E-mail of the user</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "password",
            "description": "<p>Password of the user</p>"
          },
          {
            "group": "Parameter",
            "type": "number[]",
            "optional": true,
            "field": "groups",
            "description": "<p>IDs of the groups the user belong to</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/user.js",
    "groupTitle": "Users",
    "success": {
      "fields": {
        "Success 201": [
          {
            "group": "Success 201",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the user</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "username",
            "description": "<p>Username of the user</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "email",
            "description": "<p>E-mail of the user</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "source",
            "description": "<p>Source of the user (<code>&quot;local&quot;</code>, <code>&quot;ldap&quot;</code>, <code>&quot;oauth2&quot;</code>, etc.)</p>"
          },
          {
            "group": "Success 201",
            "type": "type:group[]",
            "optional": false,
            "field": "groups",
            "description": "<p>Groups the user belongs to</p>"
          },
          {
            "group": "Success 201",
            "type": "type:preferences",
            "optional": false,
            "field": "preferences",
            "description": "<p>Preferences of the user</p>"
          },
          {
            "group": "Success 201",
            "type": "object",
            "optional": false,
            "field": "actions",
            "description": "<p>Arrays of authorized actions indexed by data-source key. The special key <code>&quot;*&quot;</code> lists actions authorized on all the data-sources</p>"
          },
          {
            "group": "Success 201",
            "type": "object",
            "optional": false,
            "field": "accessRights",
            "description": "<p>Arrays of authorized node categories and edge types indexed by data-source key, by type and by right. The special key <code>&quot;*&quot;</code> lists access rights authorized on all the data-sources</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 201",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 201 Created\n{\n  \"id\": 2,\n  \"username\": \"newUser\",\n  \"email\": \"new@linkurio.us\",\n  \"source\": \"local\",\n  \"groups\": [\n    {\n      \"id\": 2,\n      \"name\": \"source manager\",\n      \"builtin\": true,\n      \"sourceKey\": \"584f2569\"\n    }\n  ],\n  \"preferences\": {\n    \"pinOnDrag\": false,\n    \"locale\": \"en-US\"\n  },\n  \"actions\": {\n    \"*\": [],\n    \"584f2569\": [\n      \"admin.users\",\n      \"admin.alerts\",\n      \"admin.connect\",\n      \"admin.index\",\n      \"rawReadQuery\",\n      \"rawWriteQuery\"\n    ]\n  },\n  \"accessRights\": {\n    \"*\": {\n      \"nodes\": {\n        \"edit\": [],\n        \"write\": []\n      },\n      \"edges\": {\n        \"edit\": [],\n        \"write\": []\n      },\n      \"alerts\": {\n        \"read\": []\n      }\n    },\n    \"584f2569\": {\n      \"nodes\": {\n        \"edit\": [],\n        \"write\": [\"*\"]\n      },\n      \"edges\": {\n        \"edit\": [],\n        \"write\": [\"*\"]\n      },\n      \"alerts\": {\n        \"read\": [\"*\"]\n      }\n    }\n  },\n  \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n  \"updatedAt\": \"2016-05-16T08:23:35.730Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "delete",
    "url": "/api/admin/:dataSource/groups/:id/access_rights",
    "title": "Delete access right",
    "name": "DeleteAccessRight",
    "group": "Users",
    "permission": [
      {
        "name": "action:admin.users"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Delete an access right from a group.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "groupId",
            "description": "<p>ID of the group</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"nodeCategory\"",
              "\"edgeType\"",
              "\"alert\"",
              "\"action\""
            ],
            "optional": false,
            "field": "targetType",
            "description": "<p>Type of the target</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "targetName",
            "description": "<p>Name of the target (node category, edge label, alert id or action name)</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 204 No Content",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/admin/user.js",
    "groupTitle": "Users"
  },
  {
    "type": "delete",
    "url": "/api/admin/:dataSource/groups/:id",
    "title": "Delete a group",
    "name": "DeleteGroup",
    "group": "Users",
    "permission": [
      {
        "name": "action:admin.users"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Delete a group.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the group</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 204 No Content",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/admin/user.js",
    "groupTitle": "Users"
  },
  {
    "type": "delete",
    "url": "/api/admin/users/:id",
    "title": "Delete a user",
    "name": "DeleteUser",
    "group": "Users",
    "permission": [
      {
        "name": "action:admin.users.delete"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Delete a user.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the user</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 204 No Content",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/admin/user.js",
    "groupTitle": "Users"
  },
  {
    "type": "get",
    "url": "/api/admin/groups/rights_info",
    "title": "Get all access rights options",
    "name": "GetAccessRightsInfo",
    "group": "Users",
    "permission": [
      {
        "name": "action:admin.users"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Get all the possible access rights options: <code>types</code>, <code>targetTypes</code> and <code>actions</code>.</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "types",
            "description": "<p>All the possible right types</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "targetTypes",
            "description": "<p>All the possible target types</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "actions",
            "description": "<p>All the possible actions</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "actions.key",
            "description": "<p>Key of the action</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "actions.description",
            "description": "<p>Description of the action</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"types\": [\"read\", \"edit\", \"write\", \"do\", \"none\"],\n  \"targetTypes\": [\"nodeCategory\", \"edgeType\", \"action\", \"alert\"],\n  \"actions\": [\"admin.connect\", \"admin.index\", \"admin.users\", \"admin.alerts\", \"rawReadQuery\", \"rawWriteQuery\"]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/admin/user.js",
    "groupTitle": "Users"
  },
  {
    "type": "get",
    "url": "/api/admin/:dataSource/groups/:id",
    "title": "Get a group",
    "name": "GetGroup",
    "group": "Users",
    "permission": [
      {
        "name": "action:admin.users"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Get a group.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the group</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/user.js",
    "groupTitle": "Users",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the group</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "name",
            "description": "<p>Name of the group</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "builtin",
            "description": "<p>Whether the group was created internally by Linkurious</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sourceKey",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "userCount",
            "description": "<p>Number of users in the group</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "accessRights",
            "description": "<p>List of access rights</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"read\"",
              "\"write\"",
              "\"edit\"",
              "\"do\"",
              "\"none\""
            ],
            "optional": false,
            "field": "accessRights.type",
            "description": "<p>Type of the right</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"nodeCategory\"",
              "\"edgeType\"",
              "\"alert\"",
              "\"action\""
            ],
            "optional": false,
            "field": "accessRights.targetType",
            "description": "<p>Type of the target</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "accessRights.targetName",
            "description": "<p>Name of the target (node category, edge label, alert id or action name)</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 30,\n  \"name\": \"customGroup\",\n  \"builtin\": false,\n  \"sourceKey\": \"584f2569\",\n  \"userCount\": 2,\n  \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n  \"updatedAt\": \"2016-05-16T08:23:35.730Z\",\n  \"accessRights\": [\n    {\n      \"type\": \"edit\",\n      \"targetType\": \"nodeCategory\",\n      \"targetName\": \"Movie\"\n    },\n    {\n      \"type\": \"read\",\n      \"targetType\": \"nodeCategory\",\n      \"targetName\": \"Person\"\n    },\n    {\n      \"type\": \"read\",\n      \"targetType\": \"edgeType\",\n      \"targetName\": \"ACTED_IN\"\n    },\n    {\n      \"type\": \"do\",\n      \"targetType\": \"actions\",\n      \"targetName\": \"admin.connect\"\n    }\n  ]\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/admin/:dataSource/groups",
    "title": "Get all groups",
    "name": "GetGroups",
    "group": "Users",
    "permission": [
      {
        "name": "action:admin.users"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Get all the groups within a data-source.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_access_rights",
            "description": "<p>Whether to include the access rights</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "groups",
            "description": "<p>List of groups</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "groups.id",
            "description": "<p>ID of the group</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "groups.name",
            "description": "<p>Name of the group</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "groups.builtin",
            "description": "<p>Whether the group was created internally by Linkurious</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "groups.sourceKey",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "groups.userCount",
            "description": "<p>Number of users in the group</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "groups.createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "groups.updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": true,
            "field": "groups.accessRights",
            "description": "<p>List of access rights</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"read\"",
              "\"write\"",
              "\"edit\"",
              "\"do\"",
              "\"none\""
            ],
            "optional": false,
            "field": "groups.accessRights.type",
            "description": "<p>Type of the right</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"nodeCategory\"",
              "\"edgeType\"",
              "\"alert\"",
              "\"action\""
            ],
            "optional": false,
            "field": "groups.accessRights.targetType",
            "description": "<p>Type of the target</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "groups.accessRights.targetName",
            "description": "<p>Name of the target (node category, edge label, alert id or action name)</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n[\n  {\n    \"id\": 1,\n    \"name\": \"admin\",\n    \"builtin\": true,\n    \"sourceKey\": \"*\",\n    \"userCount\": 1,\n    \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n    \"updatedAt\": \"2016-05-16T08:23:35.730Z\"\n  },\n  {\n    \"id\": 2,\n    \"name\": \"read\",\n    \"builtin\": true,\n    \"sourceKey\": \"584f2569\",\n    \"userCount\": 1,\n    \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n    \"updatedAt\": \"2016-05-16T08:23:35.730Z\"\n  },\n  {\n    \"id\": 3,\n    \"name\": \"read and edit\",\n    \"builtin\": true,\n    \"sourceKey\": \"584f2569\",\n    \"userCount\": 0,\n    \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n    \"updatedAt\": \"2016-05-16T08:23:35.730Z\"\n  },\n  {\n    \"id\": 4,\n    \"name\": \"read, edit and delete\",\n    \"builtin\": true,\n    \"sourceKey\": \"584f2569\",\n    \"userCount\": 0,\n    \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n    \"updatedAt\": \"2016-05-16T08:23:35.730Z\"\n  },\n  {\n    \"id\": 5,\n    \"name\": \"source manager\",\n    \"builtin\": true,\n    \"sourceKey\": \"584f2569\",\n    \"userCount\": 0,\n    \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n    \"updatedAt\": \"2016-05-16T08:23:35.730Z\"\n  },\n  {\n    \"id\": 6,\n    \"name\": \"custom group\",\n    \"builtin\": false,\n    \"sourceKey\": \"584f2569\",\n    \"userCount\": 0,\n    \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n    \"updatedAt\": \"2016-05-16T08:23:35.730Z\"\n  }\n]",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/admin/user.js",
    "groupTitle": "Users"
  },
  {
    "type": "get",
    "url": "/api/admin/users/:id",
    "title": "Get a user",
    "name": "GetUser",
    "group": "Users",
    "version": "1.0.0",
    "permission": [
      {
        "name": "action:admin.users"
      }
    ],
    "description": "<p>Get a user by id.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the user</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/user.js",
    "groupTitle": "Users",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "username",
            "description": "<p>Username of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "email",
            "description": "<p>E-mail of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "source",
            "description": "<p>Source of the user (<code>&quot;local&quot;</code>, <code>&quot;ldap&quot;</code>, <code>&quot;oauth2&quot;</code>, etc.)</p>"
          },
          {
            "group": "Success 200",
            "type": "type:group[]",
            "optional": false,
            "field": "groups",
            "description": "<p>Groups the user belongs to</p>"
          },
          {
            "group": "Success 200",
            "type": "type:preferences",
            "optional": false,
            "field": "preferences",
            "description": "<p>Preferences of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "actions",
            "description": "<p>Arrays of authorized actions indexed by data-source key. The special key <code>&quot;*&quot;</code> lists actions authorized on all the data-sources</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "accessRights",
            "description": "<p>Arrays of authorized node categories and edge types indexed by data-source key, by type and by right. The special key <code>&quot;*&quot;</code> lists access rights authorized on all the data-sources</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 1,\n  \"username\": \"Unique user\",\n  \"email\": \"user@linkurio.us\",\n  \"source\": \"local\",\n  \"groups\": [\n    {\n      \"id\": 1,\n      \"name\": \"admin\",\n      \"builtin\": true,\n      \"sourceKey\": \"*\"\n    }\n  ],\n  \"preferences\": {\n    \"pinOnDrag\": false,\n    \"locale\": \"en-US\"\n  },\n  \"actions\": {\n    \"*\": [\n      \"admin.users\",\n      \"admin.alerts\",\n      \"admin.connect\",\n      \"admin.index\",\n      \"admin.app\",\n      \"admin.report\",\n      \"admin.users.delete\",\n      \"admin.config\",\n      \"rawReadQuery\",\n      \"rawWriteQuery\"\n    ]\n  },\n  \"accessRights\": {\n    \"*\": {\n      \"nodes\": {\n        \"edit\": [],\n        \"write\": [\"*\"]\n      },\n      \"edges\": {\n        \"edit\": [],\n        \"write\": [\"*\"]\n      },\n      \"alerts\": {\n        \"read\": [\"*\"]\n      }\n    }\n  },\n  \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n  \"updatedAt\": \"2016-05-16T08:23:45.730Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/api/users",
    "title": "Get users",
    "name": "GetUsers",
    "group": "Users",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      }
    ],
    "description": "<p>Get all the users or filter them by username, e-mail or group id.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "starts_with",
            "description": "<p>Return only users which username or e-mail starts with this</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "contains",
            "description": "<p>Return only users which username or e-mail contains this</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "group_id",
            "description": "<p>Return only users belongings to this group</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "offset",
            "description": "<p>Offset from the first result</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "description": "<p>Page size (maximum number of returned users)</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"id\"",
              "\"username\"",
              "\"email\""
            ],
            "optional": true,
            "field": "sort_by",
            "defaultValue": "id",
            "description": "<p>Sort by id, username or e-mail</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"asc\"",
              "\"desc\""
            ],
            "optional": true,
            "field": "sort_direction",
            "defaultValue": "asc",
            "description": "<p>Direction used to sort the users</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "found",
            "description": "<p>Number of hits</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "results",
            "description": "<p>Users</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "results.id",
            "description": "<p>ID of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "results.username",
            "description": "<p>Username of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "results.email",
            "description": "<p>E-mail of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "results.source",
            "description": "<p>Source of the user (<code>&quot;local&quot;</code>, <code>&quot;ldap&quot;</code>, <code>&quot;oauth2&quot;</code>, etc.)</p>"
          },
          {
            "group": "Success 200",
            "type": "type:group[]",
            "optional": false,
            "field": "results.groups",
            "description": "<p>Groups the user belongs to</p>"
          },
          {
            "group": "Success 200",
            "type": "type:preferences",
            "optional": false,
            "field": "results.preferences",
            "description": "<p>Preferences of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "results.actions",
            "description": "<p>Arrays of authorized actions indexed by data-source key. The special key <code>&quot;*&quot;</code> lists actions authorized on all the data-sources</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "results.visCount",
            "description": "<p>Number of visualization owned by the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "results.createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "results.updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"found\": 2,\n  \"results\": [\n    {\n      \"id\": 1,\n      \"username\": \"Unique user\",\n      \"email\": \"user@linkurio.us\",\n      \"source\": \"local\",\n      \"groups\": [\n        {\n          \"id\": 1,\n          \"name\": \"admin\",\n          \"builtin\": true,\n          \"sourceKey\": \"*\"\n        }\n      ],\n      \"preferences\": {\n        \"pinOnDrag\": false,\n        \"locale\": \"en-US\"\n      },\n      \"actions\": {\n        \"*\": [\n          \"admin.users\",\n          \"admin.alerts\",\n          \"admin.connect\",\n          \"admin.index\",\n          \"admin.app\",\n          \"admin.report\",\n          \"admin.users.delete\",\n          \"admin.config\",\n          \"rawReadQuery\",\n          \"rawWriteQuery\"\n        ]\n      },\n      \"accessRights\": {\n        \"*\": {\n          \"nodes\": {\n            \"edit\": [],\n            \"write\": [\"*\"]\n          },\n          \"edges\": {\n            \"edit\": [],\n            \"write\": [\"*\"]\n          },\n          \"alerts\": {\n            \"read\": [\"*\"]\n          }\n        }\n      },\n      \"visCount\": 2,\n      \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n      \"updatedAt\": \"2016-05-16T08:23:35.730Z\"\n    },\n    {\n      \"id\": 2,\n      \"username\": \"newUser\",\n      \"email\": \"new@linkurio.us\",\n      \"source\": \"local\",\n      \"groups\": [\n        {\n          \"id\": 2,\n          \"name\": \"source manager\",\n          \"builtin\": true,\n          \"sourceKey\": \"584f2569\"\n        }\n      ],\n      \"preferences\": {\n        \"pinOnDrag\": false,\n        \"locale\": \"en-US\"\n      },\n      \"actions\": {\n        \"*\": [],\n        \"584f2569\": [\n          \"admin.users\",\n          \"admin.alerts\",\n          \"admin.connect\",\n          \"admin.index\",\n          \"rawReadQuery\",\n          \"rawWriteQuery\"\n        ]\n      },\n      \"accessRights\": {\n        \"*\": {\n          \"nodes\": {\n            \"edit\": [],\n            \"write\": []\n          },\n          \"edges\": {\n            \"edit\": [],\n            \"write\": []\n          },\n          \"alerts\": {\n            \"read\": []\n          }\n        },\n        \"584f2569\": {\n          \"nodes\": {\n            \"edit\": [],\n            \"write\": [\"*\"]\n          },\n          \"edges\": {\n            \"edit\": [],\n            \"write\": [\"*\"]\n          },\n          \"alerts\": {\n            \"read\": [\"*\"]\n          }\n        }\n      },\n      \"visCount\": 0,\n      \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n      \"updatedAt\": \"2016-05-16T08:23:35.730Z\"\n    }\n  ]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/general.js",
    "groupTitle": "Users"
  },
  {
    "type": "put",
    "url": "/api/admin/:dataSource/groups/:id/access_rights",
    "title": "Set access rights",
    "name": "PutAccessRights",
    "group": "Users",
    "permission": [
      {
        "name": "action:admin.users"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Set access rights on a group. Use <code>&quot;[no_category]&quot;</code> as <code>targetName</code> to set the access right for nodes with no categories.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "groupId",
            "description": "<p>ID of the group</p>"
          },
          {
            "group": "Parameter",
            "type": "object[]",
            "optional": false,
            "field": "accessRights",
            "description": "<p>List of access rights</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"read\"",
              "\"write\"",
              "\"edit\"",
              "\"do\"",
              "\"none\""
            ],
            "optional": false,
            "field": "accessRights.type",
            "description": "<p>Type of the right</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"nodeCategory\"",
              "\"edgeType\"",
              "\"alert\"",
              "\"action\""
            ],
            "optional": false,
            "field": "accessRights.targetType",
            "description": "<p>Type of the target</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "accessRights.targetName",
            "description": "<p>Name of the target (node category, edge label, alert id or action name)</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "validateAgainstSchema",
            "description": "<p>Whether the access rights will be checked to be of node categories or edge types in the schema</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 204 No Content",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/admin/user.js",
    "groupTitle": "Users"
  },
  {
    "type": "patch",
    "url": "/api/admin/:dataSource/groups/:id",
    "title": "Rename a group",
    "name": "RenameGroup",
    "group": "Users",
    "permission": [
      {
        "name": "action:admin.users"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Rename a group.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the group</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "name",
            "description": "<p>Name of the group</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/user.js",
    "groupTitle": "Users",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the group</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "name",
            "description": "<p>Name of the group</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "builtin",
            "description": "<p>Whether the group was created internally by Linkurious</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sourceKey",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "userCount",
            "description": "<p>Number of users in the group</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "accessRights",
            "description": "<p>List of access rights</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"read\"",
              "\"write\"",
              "\"edit\"",
              "\"do\"",
              "\"none\""
            ],
            "optional": false,
            "field": "accessRights.type",
            "description": "<p>Type of the right</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"nodeCategory\"",
              "\"edgeType\"",
              "\"alert\"",
              "\"action\""
            ],
            "optional": false,
            "field": "accessRights.targetType",
            "description": "<p>Type of the target</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "accessRights.targetName",
            "description": "<p>Name of the target (node category, edge label, alert id or action name)</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 30,\n  \"name\": \"customGroup\",\n  \"builtin\": false,\n  \"sourceKey\": \"584f2569\",\n  \"userCount\": 2,\n  \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n  \"updatedAt\": \"2016-05-16T08:23:35.730Z\",\n  \"accessRights\": [\n    {\n      \"type\": \"edit\",\n      \"targetType\": \"nodeCategory\",\n      \"targetName\": \"Movie\"\n    },\n    {\n      \"type\": \"read\",\n      \"targetType\": \"nodeCategory\",\n      \"targetName\": \"Person\"\n    },\n    {\n      \"type\": \"read\",\n      \"targetType\": \"edgeType\",\n      \"targetName\": \"ACTED_IN\"\n    },\n    {\n      \"type\": \"do\",\n      \"targetType\": \"actions\",\n      \"targetName\": \"admin.connect\"\n    }\n  ]\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "patch",
    "url": "/api/admin/users/:id",
    "title": "Update a user",
    "name": "UpdateUser",
    "group": "Users",
    "permission": [
      {
        "name": "action:admin.users"
      }
    ],
    "version": "1.0.0",
    "description": "<p>Update a user.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the user</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "username",
            "description": "<p>New username of the user</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "email",
            "description": "<p>New e-mail of the user</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "password",
            "description": "<p>New password of the user</p>"
          },
          {
            "group": "Parameter",
            "type": "type:preferences",
            "optional": true,
            "field": "preferences",
            "description": "<p>New preferences of the user</p>"
          },
          {
            "group": "Parameter",
            "type": "number[]",
            "optional": true,
            "field": "addedGroups",
            "description": "<p>IDs of the groups to add to the user</p>"
          },
          {
            "group": "Parameter",
            "type": "number[]",
            "optional": true,
            "field": "removedGroups",
            "description": "<p>IDs of the groups to remove from the user</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/admin/user.js",
    "groupTitle": "Users",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "username",
            "description": "<p>Username of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "email",
            "description": "<p>E-mail of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "source",
            "description": "<p>Source of the user (<code>&quot;local&quot;</code>, <code>&quot;ldap&quot;</code>, <code>&quot;oauth2&quot;</code>, etc.)</p>"
          },
          {
            "group": "Success 200",
            "type": "type:group[]",
            "optional": false,
            "field": "groups",
            "description": "<p>Groups the user belongs to</p>"
          },
          {
            "group": "Success 200",
            "type": "type:preferences",
            "optional": false,
            "field": "preferences",
            "description": "<p>Preferences of the user</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "actions",
            "description": "<p>Arrays of authorized actions indexed by data-source key. The special key <code>&quot;*&quot;</code> lists actions authorized on all the data-sources</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "accessRights",
            "description": "<p>Arrays of authorized node categories and edge types indexed by data-source key, by type and by right. The special key <code>&quot;*&quot;</code> lists access rights authorized on all the data-sources</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"id\": 1,\n  \"username\": \"Unique user\",\n  \"email\": \"user@linkurio.us\",\n  \"source\": \"local\",\n  \"groups\": [\n    {\n      \"id\": 1,\n      \"name\": \"admin\",\n      \"builtin\": true,\n      \"sourceKey\": \"*\"\n    }\n  ],\n  \"preferences\": {\n    \"pinOnDrag\": false,\n    \"locale\": \"en-US\"\n  },\n  \"actions\": {\n    \"*\": [\n      \"admin.users\",\n      \"admin.alerts\",\n      \"admin.connect\",\n      \"admin.index\",\n      \"admin.app\",\n      \"admin.report\",\n      \"admin.users.delete\",\n      \"admin.config\",\n      \"rawReadQuery\",\n      \"rawWriteQuery\"\n    ]\n  },\n  \"accessRights\": {\n    \"*\": {\n      \"nodes\": {\n        \"edit\": [],\n        \"write\": [\"*\"]\n      },\n      \"edges\": {\n        \"edit\": [],\n        \"write\": [\"*\"]\n      },\n      \"alerts\": {\n        \"read\": [\"*\"]\n      }\n    }\n  },\n  \"createdAt\": \"2016-05-16T08:23:35.730Z\",\n  \"updatedAt\": \"2016-05-16T08:23:45.730Z\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "post",
    "url": "/api/:dataSource/visualizations",
    "title": "Create a visualization",
    "name": "CreateVisualization",
    "group": "Visualizations",
    "version": "1.0.0",
    "description": "<p>Create a new visualization.</p>",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:visualization.create"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source containing the nodes and edges.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "title",
            "description": "<p>Title of the new visualization.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "folder",
            "defaultValue": "-1",
            "description": "<p>ID of the folder to save the visualization in. (<code>-1</code> for root)</p>"
          },
          {
            "group": "Parameter",
            "type": "object[]",
            "optional": false,
            "field": "nodes",
            "description": "<p>Nodes in this visualization.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "nodes.id",
            "description": "<p>Identifier of the node (native ID or alternative ID, see <code>alternativeIds</code>).</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "nodes.selected",
            "description": "<p>Whether the node is selected.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "nodes.nodelink",
            "description": "<p>The node position information (in &quot;nodelink&quot; mode).</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "nodes.nodelink.x",
            "description": "<p>X coordinate of the node.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "nodes.nodelink.y",
            "description": "<p>Y coordinate of the node.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "nodes.nodelink.fixed",
            "description": "<p>Whether the node position has been locked.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "nodes.geo",
            "description": "<p>The node position information (in &quot;geo&quot; mode).</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "nodes.geo.latitude",
            "description": "<p>Latitude of the node (decimal format).</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "nodes.geo.longitude",
            "description": "<p>Longitude of the node (decimal format).</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "nodes.geo.latitudeDiff",
            "description": "<p>Latitude diff (if the node has been dragged).</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "nodes.geo.longitudeDiff",
            "description": "<p>Longitude diff (if the node has been dragged).</p>"
          },
          {
            "group": "Parameter",
            "type": "object[]",
            "optional": false,
            "field": "edges",
            "description": "<p>Edges in this visualization.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "edges.id",
            "description": "<p>Identifier of the edge (native ID or alternative ID, see <code>alternativeIds</code>).</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "edges.selected",
            "description": "<p>Whether the edge is selected</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "alternativeIds",
            "description": "<p>If nodes and/or edges should be referenced by a property instead of their database ID.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "alternativeIds.node",
            "description": "<p>Node property to use as identifier instead of database ID.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "alternativeIds.edge",
            "description": "<p>Edge property to use as identifier instead of database ID.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "layout",
            "description": "<p>The last layout used.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"force\"",
              "\"hierarchical\""
            ],
            "optional": true,
            "field": "layout.algorithm",
            "description": "<p>Layout algorithm.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "layout.mode",
            "description": "<p>Layout algorithm mode (depends on algorithm).</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "layout.incremental",
            "description": "<p>Whether the layout is incremental (only for <code>&quot;force&quot;</code> algorithm).</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"nodelink\"",
              "\"geo\""
            ],
            "optional": true,
            "field": "mode",
            "defaultValue": "nodelink",
            "description": "<p>The current interaction mode.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "geo",
            "description": "<p>Geographical info.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "geo.latitudeProperty",
            "description": "<p>Node property containing the latitude info.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "geo.longitudeProperty",
            "description": "<p>Node property containing the longitude info.</p>"
          },
          {
            "group": "Parameter",
            "type": "string[]",
            "optional": true,
            "field": "geo.layers",
            "description": "<p>Names of used leaflet tile layers.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "design",
            "description": "<p>Design.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "design.styles",
            "description": "<p>Color, size and icon mapping.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "design.palette",
            "description": "<p>Color and icon palette.</p>"
          },
          {
            "group": "Parameter",
            "type": "object[]",
            "optional": true,
            "field": "filters",
            "description": "<p>Filters.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "nodeFields",
            "description": "<p>Captions and fields options</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "nodeFields.captions",
            "description": "<p>Caption descriptions indexed by node-category.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": false,
            "field": "nodeFields.captions.",
            "description": "<p>*.active       Whether to use this caption.</p>"
          },
          {
            "group": "Parameter",
            "type": "object[]",
            "optional": false,
            "field": "nodeFields.fields",
            "description": "<p>Fields listed in context menu.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "nodeFields.fields.name",
            "description": "<p>Name of the field.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": false,
            "field": "nodeFields.fields.active",
            "description": "<p>Whether the field is visible in the context menu.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "edgeFields",
            "description": "<p>Captions and fields options</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "edgeFields.captions",
            "description": "<p>Caption descriptions indexed by edge-type.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": false,
            "field": "edgeFields.captions.",
            "description": "<p>*.active       Whether to use this caption.</p>"
          },
          {
            "group": "Parameter",
            "type": "object[]",
            "optional": false,
            "field": "edgeFields.fields",
            "description": "<p>Fields listed in context menu.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "edgeFields.fields.name",
            "description": "<p>Name of the field.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": false,
            "field": "edgeFields.fields.active",
            "description": "<p>Whether the field is visible in the context menu.</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization",
            "description": "<p>The visualization object.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.title",
            "description": "<p>Title of the visualization</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.folder",
            "description": "<p>Parent visualizationFolder ID (<code>null</code> for root folder)</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "visualization.nodes",
            "description": "<p>Nodes in this visualization.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.nodes.id",
            "description": "<p>Identifier of the node (native ID or alternative ID, see <code>alternativeIds</code>).</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.nodes.selected",
            "description": "<p>Whether the node is selected.</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.nodes.nodelink",
            "description": "<p>The node position information (in &quot;nodelink&quot; mode).</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.nodes.nodelink.x",
            "description": "<p>X coordinate of the node.</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.nodes.nodelink.y",
            "description": "<p>Y coordinate of the node.</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.nodes.nodelink.fixed",
            "description": "<p>Whether the node position has been locked.</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.nodes.geo",
            "description": "<p>The node position information (in &quot;geo&quot; mode).</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.nodes.geo.latitude",
            "description": "<p>Latitude of the node (decimal format).</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.nodes.geo.longitude",
            "description": "<p>Longitude of the node (decimal format).</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.nodes.geo.latitudeDiff",
            "description": "<p>Latitude diff (if the node has been dragged).</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.nodes.geo.longitudeDiff",
            "description": "<p>Longitude diff (if the node has been dragged).</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "visualization.edges",
            "description": "<p>Edges in this visualization.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.edges.id",
            "description": "<p>Identifier of the edge (native ID or alternative ID, see <code>alternativeIds</code>).</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.edges.selected",
            "description": "<p>Whether the edge is selected</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.alternativeIds",
            "description": "<p>Used to reference nodes or edges by a property instead of their database ID.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.alternativeIds.node",
            "description": "<p>Node property to use as identifier instead of database ID.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.alternativeIds.edge",
            "description": "<p>Edge property to use as identifier instead of database ID.</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.layout",
            "description": "<p>The last used layout.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.layout.algorithm",
            "description": "<p>Layout algorithm name (&quot;force&quot;, &quot;hierarchical&quot;).</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.layout.mode",
            "description": "<p>Layout algorithm mode (depends on algorithm).</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.layout.incremental",
            "description": "<p>Whether the layout is incremental (only for <code>&quot;force&quot;</code> algorithm).</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.geo",
            "description": "<p>Geographical info.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.geo.latitudeProperty",
            "description": "<p>Node property containing the latitude.</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "visualization.geo.layers",
            "description": "<p>Names of enabled leaflet tile layers.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"nodelink\"",
              "\"geo\""
            ],
            "optional": false,
            "field": "visualization.mode",
            "description": "<p>The current interaction mode.</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.design",
            "description": "<p>Design.</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.design.styles",
            "description": "<p>Style mappings.</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.design.palette",
            "description": "<p>Color and icon palette.</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "visualization.filters",
            "description": "<p>Filters.</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.nodeFields",
            "description": "<p>Captions and fields options</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.nodeFields.captions",
            "description": "<p>Caption descriptions indexed by node-category.</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.nodeFields.captions.",
            "description": "<p>*.active      Whether to use this caption.</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "visualization.nodeFields.fields",
            "description": "<p>Fields listed in context menu.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.nodeFields.fields.name",
            "description": "<p>Name of the field.</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.nodeFields.fields.active",
            "description": "<p>Whether the field is visible in the context menu.</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.edgeFields",
            "description": "<p>Captions and fields options</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.edgeFields.captions",
            "description": "<p>Caption descriptions indexed by edge-type.</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.edgeFields.captions.",
            "description": "<p>*.active      Whether to use this caption.</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "visualization.edgeFields.fields",
            "description": "<p>Fields listed in context menu.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.edgeFields.fields.name",
            "description": "<p>Name of the field.</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.edgeFields.fields.active",
            "description": "<p>Whether the field is visible in the context menu.</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "delete",
    "url": "/api/:dataSource/visualizations/:id",
    "title": "Delete a visualization",
    "name": "DeleteVisualization",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:visualization.delete"
      }
    ],
    "description": "<p>Delete the visualization selected by id.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the visualization</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 204 No Content",
          "type": "none"
        }
      ]
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "post",
    "url": "/api/:dataSource/visualizations/:id/duplicate",
    "title": "Duplicate a visualization",
    "name": "DuplicateVisualization",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:visualization.create"
      }
    ],
    "description": "<p>Duplicates a visualization.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "dataSource",
            "description": "<p>key of a data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>The id of the visualization to duplicate</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "title",
            "description": "<p>Name of the created visualization (defaults to &quot;Copy of [source title]&quot;).</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "folder",
            "description": "<p>ID of the folder to duplicate the visualization to (defaults to the source visualization's folder).</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/visualizations/:id",
    "title": "Get a visualization",
    "name": "GetVisualization",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:visualization.read"
      }
    ],
    "description": "<p>Return a visualization selected by ID.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>ID of the isualization</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "populated",
            "defaultValue": "false",
            "description": "<p>Whether nodes and edges are populated of data, categories, version, type, source and target</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_digest",
            "defaultValue": "false",
            "description": "<p>Whether to include the adjacency digest in the returned nodes</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_degree",
            "defaultValue": "false",
            "description": "<p>Whether to include the degree in the returned nodes</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization",
            "description": "<p>The visualization</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.id",
            "description": "<p>ID of the visualization</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.title",
            "description": "<p>Title of the visualization</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.folder",
            "description": "<p>Parent visualizationFolder ID (-1 for root folder)</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "visualization.nodes",
            "description": "<p>Nodes in this visualization</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.nodes.id",
            "description": "<p>ID of the node (native or alternative ID)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.nodes.nodelink",
            "description": "<p>The node position (in &quot;nodelink&quot; mode)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.nodes.nodelink.x",
            "description": "<p>X coordinate of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.nodes.nodelink.y",
            "description": "<p>Y coordinate of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.nodes.geo",
            "description": "<p>The node position (in &quot;geo&quot; mode)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": true,
            "field": "visualization.nodes.geo.latitude",
            "description": "<p>Latitude of the node (decimal format)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": true,
            "field": "visualization.nodes.geo.longitude",
            "description": "<p>Longitude of the node (decimal format)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.nodes.geo.latitudeDiff",
            "description": "<p>Latitude diff (if the node has been dragged)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.nodes.geo.longitudeDiff",
            "description": "<p>Longitude diff (if the node has been dragged)</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.nodes.selected",
            "description": "<p>Whether the node is selected</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": true,
            "field": "visualization.nodes.data",
            "description": "<p>Properties of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": true,
            "field": "visualization.nodes.categories",
            "description": "<p>Categories of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": true,
            "field": "visualization.nodes.statistics",
            "description": "<p>Statistics of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "type:LkDigestItem[]",
            "optional": true,
            "field": "visualization.nodes.statistics.digest",
            "description": "<p>Statistics of the neighborhood of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": true,
            "field": "visualization.nodes.statistics.degree",
            "description": "<p>Number of neighbors of the node readable by the current user</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": true,
            "field": "visualization.nodes.version",
            "description": "<p>Version of the node</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "visualization.edges",
            "description": "<p>Edges in this visualization</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.edges.id",
            "description": "<p>ID of the edge (native or alternative ID)</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.edges.selected",
            "description": "<p>Whether the edge is selected</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": true,
            "field": "visualization.edges.type",
            "description": "<p>Type of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": true,
            "field": "visualization.edges.data",
            "description": "<p>Properties of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": true,
            "field": "visualization.edges.source",
            "description": "<p>Source of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": true,
            "field": "visualization.edges.target",
            "description": "<p>Target of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": true,
            "field": "visualization.edges.version",
            "description": "<p>Version of the edge</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.design",
            "description": "<p>Design</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.design.styles",
            "description": "<p>Style mappings</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.design.palette",
            "description": "<p>Color and icon palette</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"nodelink\"",
              "\"geo\""
            ],
            "optional": false,
            "field": "visualization.mode",
            "description": "<p>The current interaction mode</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.layout",
            "description": "<p>The last used layout</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.layout.algorithm",
            "description": "<p>Layout algorithm name (<code>&quot;force&quot;</code>, <code>&quot;hierarchical&quot;</code>)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.layout.mode",
            "description": "<p>Layout algorithm mode (depends on the algorithm)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": true,
            "field": "visualization.layout.incremental",
            "description": "<p>Whether the layout is incremental (only for <code>&quot;force&quot;</code> algorithm)</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.geo",
            "description": "<p>Geographical info</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": true,
            "field": "visualization.geo.latitudeProperty",
            "description": "<p>Property name containing the latitude</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "visualization.geo.layers",
            "description": "<p>Names of enabled leaflet tile layers</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Creation date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Last update date in ISO-8601 format</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.alternativeIds",
            "description": "<p>Used to reference nodes or edges by a property instead of their database ID</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": true,
            "field": "visualization.alternativeIds.node",
            "description": "<p>Node property to use as identifier instead of database ID</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": true,
            "field": "visualization.alternativeIds.edge",
            "description": "<p>Edge property to use as identifier instead of database ID</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "visualization.filters",
            "description": "<p>Filters</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "allowedValues": [
              "\"node.data.categories\"",
              "\"node.data.properties.propertyName\"",
              "\"edge.data.type\"",
              "\"edge.data.properties.propertyName\"",
              "\"geo-coordinates\""
            ],
            "optional": false,
            "field": "visualization.filters.key",
            "description": "<p>Key of the filter</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": true,
            "field": "visualization.filters.values",
            "description": "<p>Values of the filter (no values for <code>&quot;geo-coordinates&quot;</code>)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.sourceKey",
            "description": "<p>Key of the data-source</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.user",
            "description": "<p>Owner of the visualization</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualization.userId",
            "description": "<p>ID of the owner of the visualization</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.widgetKey",
            "description": "<p>Key of the widget (<code>null</code> if the no widget exists)</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.sandbox",
            "description": "<p>Whether the visualization is the sandbox</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.right",
            "description": "<p>Right on the visualization of the current user</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.nodeFields",
            "description": "<p>Captions and fields options</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.nodeFields.captions",
            "description": "<p>Caption descriptions indexed by node category</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.nodeFields.captions.nodeCategory",
            "description": "<p><code>nodeCategory</code> is a placeholder for the actual node category</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.nodeFields.captions.nodeCategory.active",
            "description": "<p>Whether to use this caption</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.nodeFields.captions.nodeCategory.displayName",
            "description": "<p>Whether to include the node category in the caption</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "visualization.nodeFields.captions.nodeCategory.properties",
            "description": "<p>List of properties to include in the caption</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "visualization.nodeFields.fields",
            "description": "<p>Fields listed in context menu</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.nodeFields.fields.name",
            "description": "<p>Name of the field</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.nodeFields.fields.active",
            "description": "<p>Whether the field is visible in the context menu</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.edgeFields",
            "description": "<p>Captions and fields options</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.edgeFields.captions",
            "description": "<p>Caption descriptions indexed by edge type</p>"
          },
          {
            "group": "Success 200",
            "type": "object",
            "optional": false,
            "field": "visualization.edgeFields.captions.edgeType",
            "description": "<p><code>edgeType</code> is a placeholder for the actual edge type</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.edgeFields.captions.edgeType.active",
            "description": "<p>Whether to use this caption</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.edgeFields.captions.edgeType.displayName",
            "description": "<p>Whether to include the edge type in the caption</p>"
          },
          {
            "group": "Success 200",
            "type": "string[]",
            "optional": false,
            "field": "visualization.edgeFields.captions.edgeType.properties",
            "description": "<p>List of properties to include in the caption</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": false,
            "field": "visualization.edgeFields.fields",
            "description": "<p>Fields listed in context menu</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "visualization.edgeFields.fields.name",
            "description": "<p>Name of the field</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "visualization.edgeFields.fields.active",
            "description": "<p>Whether the field is visible in the context menu</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"visualization\": {\n    \"id\": 2,\n    \"version\": 2,\n    \"title\": \"Viz name\",\n    \"folder\": -1,\n    \"nodes\": [\n      {\n        \"id\": 1,\n        \"nodelink\": {\n          \"x\": 10.124,\n          \"y\": 12.505\n        },\n        \"geo\": {\n          \"latitudeDiff\": 0,\n          \"longitudeDiff\": 0\n        },\n        \"selected\": true,\n        \"data\": {\n          \"firstName\": \"David\"\n        },\n        \"categories\": [\n          \"Person\"\n        ],\n        \"statistics\": {\n          \"digest\": [\n            {\n              \"edgeType\": \"worksAt\",\n              \"nodeCategories\": [\n                \"Company\"\n              ],\n              \"nodes\": 1,\n              \"edges\": 1\n            }\n          ]\n        },\n        \"version\": 1\n      },\n      {\n        \"id\": 2,\n        \"nodelink\": {\n          \"x\": -6.552,\n          \"y\": -8.094\n        },\n        \"geo\": {\n          \"latitudeDiff\": 0,\n          \"longitudeDiff\": 0\n        },\n        \"data\": {\n          \"name\": \"Linkurious\"\n        },\n        \"categories\": [\n          \"Company\"\n        ],\n        \"statistics\": {\n          \"digest\": [\n            {\n              \"edgeType\": \"worksAt\",\n              \"nodeCategories\": [\n                \"Person\"\n              ],\n              \"nodes\": 1,\n              \"edges\": 1\n            }\n          ]\n        },\n        \"version\": 1\n      }\n    ],\n    \"edges\": [\n      {\n        \"id\": 0,\n        \"type\": \"worksAt\",\n        \"data\": {},\n        \"source\": 1,\n        \"target\": 2,\n        \"version\": 1\n      }\n    ],\n    \"nodeFields\": {\n      \"fields\": [\n        {\n          \"name\": \"firstName\",\n          \"active\": true\n        },\n        {\n          \"name\": \"name\",\n          \"active\": true\n        }\n      ],\n      \"captions\": {\n        \"Person\": {\n          \"active\": true,\n          \"displayName\": true,\n          \"properties\": []\n        },\n        \"Company\": {\n          \"active\": true,\n          \"displayName\": true,\n          \"properties\": []\n        },\n        \"No category\": {\n          \"active\": true,\n          \"displayName\": true,\n          \"properties\": []\n        }\n      }\n    },\n    \"edgeFields\": {\n      \"fields\": [],\n      \"captions\": {\n        \"worksAt\": {\n          \"name\": \"worksAt\",\n          \"active\": true,\n          \"displayName\": true,\n          \"properties\": []\n        }\n      }\n    },\n    \"design\": {\n      // ...\n    },\n    \"filters\": [\n      {\n        \"key\": \"node.data.properties.firstName\",\n        \"values\": [\"David\"]\n      }\n    ],\n    \"sourceKey\": \"860555c4\",\n    \"user\": {\n      \"id\": 1,\n      \"username\": \"Unique user\",\n      \"email\": \"user@linkurio.us\",\n      \"source\": \"local\",\n      \"preferences\": {\n        \"pinOnDrag\": false,\n        \"locale\": \"en-US\"\n      }\n    },\n    \"userId\": 1,\n    \"sandbox\": false,\n    \"createdAt\": \"2017-06-01T12:30:40.397Z\",\n    \"updatedAt\": \"2017-06-01T12:30:55.389Z\",\n    \"alternativeIds\": {},\n    \"mode\": \"nodelink\",\n    \"layout\": {\n      \"incremental\": false,\n      \"algorithm\": \"force\",\n      \"mode\": \"fast\"\n    },\n    \"geo\": {\n      \"layers\": []\n    },\n    \"right\": \"owner\",\n    \"widgetKey\": null\n  }\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/visualizations/count",
    "title": "Get visualizations count",
    "name": "GetVisualizationCount",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      }
    ],
    "description": "<p>Get the number of visualizations for this data-source.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>key of a data-source</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "count",
            "description": ""
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "patch",
    "url": "/api/:dataSource/visualizations/:id",
    "title": "Update a visualization",
    "name": "UpdateVisualization",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:visualization.edit"
      }
    ],
    "description": "<p>Update visualization selected by id.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>key of a data-source (ignored in this API)</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "id",
            "description": "<p>Visualization ID.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "visualization",
            "description": "<p>The visualization object. Only passed fields will be updated.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "force_lock",
            "defaultValue": "false",
            "description": "<p>Take the edit-lock by force (in case the current user doesn't own it)</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "do_layout",
            "defaultValue": "false",
            "description": "<p>Do a server-side layout of the visualization graph.</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "post",
    "url": "/api/:dataSource/visualizations/folder",
    "title": "Create a visualization folder",
    "name": "createVisualizationFolder",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:visualizationFolder.create"
      }
    ],
    "description": "<p>Create a folder for visualizations</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "title",
            "description": "<p>Folder title</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "parent",
            "description": "<p>Parent folder id</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>key of a data-source</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "post",
    "url": "/api/widget",
    "title": "Create a widget",
    "name": "createVisualizationWidget",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:widget.create"
      }
    ],
    "description": "<p>Create a widget for a visualization.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "visualization_id",
            "description": "<p>The visualization id</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "options",
            "description": "<p>The configuration of the user interface elements.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "options.search",
            "defaultValue": "false",
            "description": "<p>Whether the search bar is shown.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "options.share",
            "defaultValue": "false",
            "description": "<p>The the share button is shown.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "options.layout",
            "defaultValue": "false",
            "description": "<p>Whether the layout button is shown.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "options.fullscreen",
            "defaultValue": "false",
            "description": "<p>Whether the full-screen button is shown.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "options.zoom",
            "defaultValue": "false",
            "description": "<p>Whether to zoom-in and zoom-out controllers are shown.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "options.legend",
            "defaultValue": "false",
            "description": "<p>Whether the graph legend is shown.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "options.geo",
            "defaultValue": "false",
            "description": "<p>Whether the geo-mode toggle button is visible. Ignored if the nodes don't have geo coordinates.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "options.password",
            "description": "<p>Optional password to protect the widget</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "key",
            "description": "<p>The key of the created widget</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "delete",
    "url": "/api/:dataSource/visualizations/folder/:id",
    "title": "Delete a visualization folder",
    "name": "deleteVisualizationFolder",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:visualizationFolder.delete"
      }
    ],
    "description": "<p>Remove the specified folder and its children (visualizations and sub-folders)</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "visualization",
            "description": "<p>ID</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>key of a data-source (for API homogeneity, not actually used)</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "delete",
    "url": "/api/:dataSource/visualizations/:id/share/:userId",
    "title": "Un-share a visualization",
    "name": "deleteVisualizationShare",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:visualizationShare.delete"
      }
    ],
    "description": "<p>Remove a share right of a user on a visualization</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>key of a data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "userId",
            "description": "<p>id of a user</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "delete",
    "url": "/api/widget/:key",
    "title": "Delete a widget",
    "name": "deleteVisualizationWidget",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:widget.delete"
      }
    ],
    "description": "<p>Delete a widget for a visualization.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "key",
            "description": "<p>the key of the widget to delete</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/sandbox",
    "title": "Get the visualization sandbox",
    "name": "getSandbox",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "__guest",
        "title": "The guest user can use this API if guest mode is allowed.",
        "description": ""
      },
      {
        "name": "apiright:sandbox"
      }
    ],
    "description": "<p>Return the visualization sandbox of the current user for a given data-source</p>",
    "examples": [
      {
        "title": "Populate examples:",
        "content": "# Visualization by ID\ncurl -i \"http://localhost:3000/api/e4b5d8/sandbox?populate=visualizationId&item_id=123\"\n\n# Node by ID\ncurl -i \"http://localhost:3000/api/e4b5d8/sandbox?populate=nodeId&item_id=123\"\n\n# Edge by ID\ncurl -i \"http://localhost:3000/api/e4b5d8/sandbox?populate=edgeId&item_id=456\"\n\n# Node by ID + neighbors\ncurl -i \"http://localhost:3000/api/e4b5d8/sandbox?populate=expandNodeId&item_id=123\"\n\n# Nodes by search query\ncurl -i \"http://localhost:3000/api/e4b5d8/sandbox?populate=searchNodes&search_query=paris&search_fuzziness=0.8\"\n\n# Edges by search query\ncurl -i \"http://localhost:3000/api/e4b5d8/sandbox?populate=searchEdges&search_query=has_city\"\n\n# Nodes and/or edges by pattern query\ncurl -i \"http://localhost:3000/api/e4b5d8/sandbox?populate=pattern&pattern_dialect=cypher&pattern_query=MATCH+(n1)-%5Be%5D-(n2)+WHERE+ID(n1)%3D10+RETURN+e\"",
        "type": "curl"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>key of a data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"visualizationId\"",
              "\"expandNodeId\"",
              "\"nodeId\"",
              "\"edgeId\"",
              "\"searchNodes\"",
              "\"searchEdges\"",
              "\"pattern\"",
              "\"matchId\""
            ],
            "optional": true,
            "field": "populate",
            "description": "<p>Describes how the sandbox should be populated.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "item_id",
            "description": "<p>ID of the node, edge or visualization to load (when <code>populate</code> is one of  <code>[&quot;visualizationId&quot;, &quot;nodeId&quot;, &quot;edgeId&quot;, &quot;expandNodeId&quot;]</code>).</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "match_id",
            "description": "<p>ID of alert match to load (when <code>populate</code> is <code>&quot;matchId&quot;</code>).</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "search_query",
            "description": "<p>Search query to search for nodes or edges (when <code>populate</code> is one of  <code>[&quot;searchNodes&quot;, &quot;searchEdges&quot;]</code>).</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "size": "0-1",
            "optional": true,
            "field": "search_fuzziness",
            "defaultValue": "0.9",
            "description": "<p>Search query fuzziness (when <code>populate</code> is one of  <code>[&quot;searchNodes&quot;, &quot;searchEdges&quot;]</code>).</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "pattern_query",
            "description": "<p>Pattern query to match nodes and/or edges (when <code>populate</code> is <code>&quot;pattern&quot;</code>).</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "do_layout",
            "description": "<p>Whether to do a server-side layout of the graph.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"cypher\"",
              "\"gremlin\""
            ],
            "optional": true,
            "field": "pattern_dialect",
            "description": "<p>Pattern dialect (when <code>populate</code> is <code>&quot;pattern&quot;</code>).</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_digest",
            "defaultValue": "false",
            "description": "<p>Whether to include the adjacency digest in the returned nodes</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "with_degree",
            "defaultValue": "false",
            "description": "<p>Whether to include the degree in the returned nodes</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/visualizations/tree",
    "title": "Get the visualization tree",
    "name": "getVisualizationTree",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:visualization.list"
      }
    ],
    "description": "<p>Return visualizations ordered with folders hierarchy.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>key of a data-source</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "response",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "response.tree",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "response.tree.type",
            "description": "<p><code>&quot;visu&quot;</code> or <code>&quot;folder&quot;</code></p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "response.tree.id",
            "description": "<p>visualization or folder ID</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "response.tree.title",
            "description": "<p>visualization or folder title</p>"
          },
          {
            "group": "Success 200",
            "type": "object[]",
            "optional": true,
            "field": "response.tree.children",
            "description": "<p>children visualizations and folders (mandatory when <code>type</code> is <code>&quot;folder&quot;</code>)</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": true,
            "field": "response.tree.shareCount",
            "description": "<p>number of users a visualization is shared with (mandatory <code>type</code> is <code>&quot;visu&quot;</code>)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": true,
            "field": "response.tree.widgetKey",
            "description": "<p>key of the widget created for this visualization (possible if <code>type</code> is <code>&quot;visu&quot;</code>)</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"tree\": [\n   {\n     \"id\": 1,\n     \"type\": \"folder\",\n     \"title\": \"Toto\",\n     \"children\": [\n       {\n         \"id\": 2,\n         \"type\": \"folder\",\n         \"title\": \"Titi\",\n         \"children\": [\n           {\n             \"id\": 3,\n             \"type\": \"visu\",\n             \"title\": \"vis. three\",\n             \"shareCount\": 0,\n             \"widgetKey\": \"aef3ce\"\n           }\n         ]\n       },\n       {\n         \"id\": 1,\n         \"type\": \"vis. one\",\n         \"title\": \"a\",\n         \"shareCount\": 0\n       },\n       {\n         \"id\": 2,\n         \"type\": \"visu\",\n         \"title\": \"vis. two\",\n         \"shareCount\": 0\n       }\n     ]\n   },\n   {\n     \"id\": 4,\n     \"type\": \"visu\",\n     \"title\": \"vis. four\",\n     \"shareCount\": 0\n   }\n ]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "get",
    "url": "/api/widget/:key",
    "title": "Get a widget",
    "name": "getWidgetByKey",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:widget.read"
      }
    ],
    "description": "<p>Get a visualization widget's data by key</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "key",
            "description": "<p>the key of a widget</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "title",
            "description": "<p>the title of the visualization used to generate this widget</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "key",
            "description": "<p>the key of this widget</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "userId",
            "description": "<p>the owner ID of the visualization used to generate this widget</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualizationId",
            "description": "<p>the ID of the visualization used to generate this widget</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "password",
            "description": "<p>Whether password protection is enabled</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "content",
            "description": "<p>the content of the widget, as sent while generating this widget</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n\n{\n  \"title\": \"Foo Bar\",\n  \"key\": \"key\",\n  \"userId\": 12,\n  \"password\": false,\n  \"visualizationId\": 3,\n  \"content\": {\n     \"key\": \"value\"\n  }\n}",
          "type": "json"
        }
      ]
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "put",
    "url": "/api/:dataSource/visualizations/:id/share/:userId",
    "title": "Share a visualization",
    "name": "setVisualizationShare",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:visualizationShare.create"
      }
    ],
    "description": "<p>Set the share right of a user on a visualization</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>key of a data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "userId",
            "description": "<p>id of a user User to grant access to</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "allowedValues": [
              "\"read\"",
              "\"write\""
            ],
            "optional": false,
            "field": "right",
            "description": "<p>Granted access level</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>a visualization id Visualization to grant access to</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualizationId",
            "description": "<p>ID of the shared visualization.</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "userId",
            "description": "<p>ID of the user the visualization has been shared with.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "right",
            "description": "<p>Name of the right (<code>&quot;none&quot;</code>, <code>&quot;read&quot;</code>, <code>&quot;write&quot;</code> or <code>&quot;owner&quot;</code>)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "createdAt",
            "description": "<p>Date the visualization has been shared.</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "updatedAt",
            "description": "<p>Date at which the share has been updated.</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/visualizations/shared",
    "title": "Get visualizations shared with current user",
    "name": "sharedVisualizations",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:visualization.list"
      }
    ],
    "description": "<p>Get all visualizations shared with the current user</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>key of a data-source</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "title",
            "description": "<p>Title of the visualization</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "visualizationId",
            "description": "<p>ID of the visualization</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "ownerId",
            "description": "<p>ID of the user that owns the visualization</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "sourceKey",
            "description": "<p>Key of the dataSource the visualization is related to</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "patch",
    "url": "/api/:dataSource/sandbox",
    "title": "Update the visualization sandbox",
    "name": "updateSandbox",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:sandbox"
      }
    ],
    "description": "<p>Update the sandbox of the current user for a given data-source.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>key of a data-source (ignored in this API)</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "visualization",
            "description": "<p>The sandbox visualization object.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "visualization.design",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "visualization.nodeFields",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "visualization.edgeFields",
            "description": ""
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "patch",
    "url": "/api/:dataSource/visualizations/folder/:id",
    "title": "Update a visualization folder",
    "name": "updateVisualizationFolder",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:visualizationFolder.edit"
      }
    ],
    "description": "<p>Update a property of a folder</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "key",
            "description": "<p>Property key to edit</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "value",
            "description": "<p>Property new value of the edited property</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>key of a data-source (for API homogeneity, not actually used)</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "put",
    "url": "/api/widget",
    "title": "Update a widget",
    "name": "updateVisualizationWidget",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:widget.edit"
      }
    ],
    "description": "<p>Update a widget for a visualization.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "visualization_id",
            "description": "<p>The visualization id</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "options",
            "description": "<p>The configuration of the user interface elements.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "options.search",
            "defaultValue": "false",
            "description": "<p>Whether the search bar is shown.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "options.share",
            "defaultValue": "false",
            "description": "<p>The the share button is shown.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "options.layout",
            "defaultValue": "false",
            "description": "<p>Whether the layout button is shown.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "options.fullscreen",
            "defaultValue": "false",
            "description": "<p>Whether the full-screen button is shown.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "options.zoom",
            "defaultValue": "false",
            "description": "<p>Whether to zoom-in and zoom-out controllers are shown.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "options.legend",
            "defaultValue": "false",
            "description": "<p>Whether the graph legend is shown.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "options.geo",
            "defaultValue": "false",
            "description": "<p>Whether the geo-mode toggle button is visible. Ignored if the nodes don't have geo coordinates.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "options.password",
            "description": "<p>Optional password to protect the widget</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "key",
            "description": "<p>The key of the updated widget</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  },
  {
    "type": "get",
    "url": "/api/:dataSource/visualizations/:id/shares",
    "title": "Get visualization share rights",
    "name": "visualizationShares",
    "group": "Visualizations",
    "version": "1.0.0",
    "permission": [
      {
        "name": "authenticated",
        "title": "Any authenticated user can use this API.",
        "description": ""
      },
      {
        "name": "apiright:visualizationShare.read"
      }
    ],
    "description": "<p>Get all share rights on a visualization</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dataSource",
            "description": "<p>key of a data-source</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": false,
            "field": "id",
            "description": "<p>a visualization id</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "res",
            "description": "<p>result object</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "res.owner",
            "description": "<p>Owner of the shares</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "res.owner.id",
            "description": "<p>Owner's user id</p>"
          },
          {
            "group": "Success 200",
            "type": "boolean",
            "optional": false,
            "field": "res.owner.source",
            "description": "<p>Owner's source ('local', 'ldap', 'azure', etc.)</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "res.owner.username",
            "description": "<p>Owner's username</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "res.owner.email",
            "description": "<p>Owner's email</p>"
          },
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "res.shares",
            "description": "<p>Description of all shares defined by owner</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "res.shares.userId",
            "description": "<p>ID of the target user of this share</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "res.shares.username",
            "description": "<p>Username of the target user of this share</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "res.shares.email",
            "description": "<p>Email of the target user of this share</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "res.shares.visualizationId",
            "description": "<p>ID of the shared visualization</p>"
          },
          {
            "group": "Success 200",
            "type": "string",
            "optional": false,
            "field": "res.shares.right",
            "description": "<p>type of right granted to target user (<code>&quot;read&quot;</code>, <code>&quot;write&quot;</code> or <code>&quot;owner&quot;</code>)</p>"
          }
        ]
      }
    },
    "filename": "server/services/webServer/routes/visualization.js",
    "groupTitle": "Visualizations"
  }
] });
