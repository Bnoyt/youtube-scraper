# Linkurious Enterprise

The Linkurious server is a Node.js application which provides REST services for web applications to leverage graph databases and visualization in organizations.

## Authors

Linkurious SAS: contact@linkurio.us

## Copyright and LICENSE

Linkurious SAS 2014. All rights reserved.

All information contained herein is, and remains the property of Linkurious SAS and its suppliers, if any. The intellectual and technical concepts contained herein are proprietary to Linkurious SAS and its suppliers and may be covered by French and Foreign Patents, patents in process, and are protected by trade secret or copyright law. Dissemination of this information or reproduction of this material is strictly forbidden unless prior written permission is obtained from Linkurious SAS.

## Requirements

Linkurious server works on Windows 8, Linux and Mac OSX systems.

The Linkurious server runs as a Node.js application. It connects to a Neo4j graph database. Currently Neo4j 2.x and more recent versions are supported. It also comes with an embedded ElasticSearch server that may be replaced by your own cluster.

## How to install it

Unzip the archive and optionally move the extracted folder to another directory.

## How to use it

Use the **start** script or open the administration **menu**.

Be sure to have a Neo4j server launched beforehand.

### Start

- Windows: run `start.bat`. Alternately, run `menu.bat` and select `Start Linkurious processes` from the administration menu.
- Linux: run `start.sh`. Alternately, run `menu.sh` and select `Start Linkurious processes` from the administration menu.
- OSX: run `start.sh.command`. Alternately, run `menu.sh.command` and select `Start Linkurious processes` from the administration menu.

### Stop

- Windows: run `stop.bat`. Alternately, run `menu.bat` and select `Stop Linkurious processes` from the administration menu.
- Linux: run `stop.sh`. Alternately, run `menu.sh` and select `Stop Linkurious processes` from the administration menu.
- OSX: run `stop.sh.command`. Alternately, run `menu.sh.command` and select `Stop Linkurious processes` from the administration menu.

### Status

- Windows: run `menu.bat` (the status is above the menu). Alternately, run `menu.bat status`.
- Linux: run `menu.sh` (the status is above the menu). Alternately, run `menu.sh status`.
- OSX: run `menu.sh.command` (the status is above the menu). Alternately, run `menu.sh.command status`.

## Configuration

For help on how to edit the configuration, see the [Linkurious online documentation (configuration)](http://doc.linkurio.us/content/en/getting-started/configure.html).

## L.D.A.P. Authentication

If you have a LDAP service running in your network, you can use it to authenticate users in Linkurious.
To enable LDAP authentication in Linkurious, see the [Linkurious online documentation (LDAP)](https://doc.linkurio.us/content/en/getting-started/configure.html#authentication-via-ldap).

## F.A.Q.

### Stop reindexing at each startup

Just edit configuration and change `forceReindex` to **false**.

### How to run multiple instances of Linkurious

Linkurious is designed to run a single instance per machine.
While it is not recommended and with no guarantee to work, you may run multiple instances of Linkurious by doing the following:

Copy the entire linkurious directory (the one including this file) to a new place, and edit the `data/config/production.json` file:
You will need to change ``listenPort`` to set a different port from the one used in the `production.json` file. You may also edit `graphdb` and `db.storage`.

This is an example of a second instance of Linkurious served on `http://localhost:3001`, that calls the Neo4j API on the port `7475`:

```JavaScript
{
  "dataSources": [{
    "graphdb": {
      "vendor": "neo4j",
      "url": "http://localhost:7475"
    },
    "index": {
      "vendor": "elasticSearch",
      "host": "localhost",
      "port": 9201
    }
  }],
  "db": {
    "username": null,
    "password": null,
    "logging": true,
    "options": {
      "dialect": "sqlite",
      "storage": "database_secondInstance.sqlite"
    }
  },
  "server": {
    "listenPort": 3001,
    "clientFolder": "/public",
    "cookieSecret": "zO6Yb7u5H907dfEcmjS8pXgWNEo3B9pNQF8mKjdzRR3I64o88GrGLWEjqNq1Yx5"
  }
}
```

If you use the ElasticSearch software bundled with Linkurious, you will also need to modify the configuration in `system/elasticsearch/config/elasticsearch.yml` to set an alternate port to the default of 9201.

Finally, note that it is not currently possible to install different versions of Linkurious as a system service, at the same time, on the same machine.

### SQLite and GLIBC 2.14

Linkurious uses an embedded SQLite database for persistence. This database requires GLIBC >= 2.14.
Some older Linux distributions don't have this version of GLIBC available.

If you encounter this problem, one solution is to use another persistence store for Linkurious, such as [MySQL](https://www.mysql.fr/) or [PostgreSQL](http://www.postgresql.org/).
You can use an existing database server or install a new one (Linkurious will store it's state in a specific "linkurious" database).

To change the persistence store used by Linkurious, edit the configuration file located under "config/production.json" in the linkurious installation folder.
The section you need to edit is user "db":
```JavaScript
"db": {
  "name": "linkurious",
  "username": "username to connect to the database",
  "password": "password to connect to the database",
  "options": {
    "dialect": "sqlite", // or "mysql" or "postres"
    "storage": "database.sqlite" // only used for sqlite
  }
}
```

Alternatively, on debian stable, you may be able to fix the problem by upgrading the GLIBC manually:
```Bash
echo 'deb http://ftp.fr.debian.org/debian/ testing main' > /etc/apt/sources.list
apt-get update
apt-get install -t testing libc6-dev=2.19-9
```
