/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * Taken from Ogma: https://github.com/Linkurious/ogma/blob/develop/scripts/doc/parse.js
 */
'use strict';

const path = require('path');
const fs = require('fs');

let data = null,
  currentModule = null,
  currentItem = null;

function parsePath(p) {
  if (p.indexOf('.') === -1) {
    parseDirectory(p);
  } else if (p.endsWith('.js')) {
    parseFile(p);
  }
}

function parseDirectory(p) {
  const files = fs.readdirSync(p);

  for (let i = 0; i < files.length; ++i) {
    parsePath(path.join(p, files[i]));
  }
}

const TAGS = {
  version: v => data.version = v,
  module: line => {
    currentModule = parseItem(line, {settings: [], events: [], possessions: [], methods: [],
      examples: [], attributes: [], sections: [], demos: []});
    data.modules.push(currentModule);
  },
  plugin: line => {
    currentModule = parseItem(line, {settings: [], events: [], possessions: [], methods: [],
      examples: [], attributes: [], sections: [], demos: []});
    data.plugins.push(currentModule);
  },
  example: line => {
    if (currentItem) {
      currentItem.examples.push(parseItem(line));
    } else if (currentModule) {
      currentModule.examples.push(parseItem(line));
    }
  },
  param: line => { if (currentItem) {currentItem.params.push(parseItem(line));} },
  property: line => { if (currentItem) {currentItem.properties.push(parseItem(line));} },
  setting: line => { if (currentModule) {currentModule.settings.push(parseItem(line));} },
  event: line => { if (currentModule) {currentModule.events.push(parseItem(line));} },
  method: line => {
    if (currentModule) {
      currentItem = parseItem(line);
      currentModule.methods.push(currentItem);
    }
  },
  owns: line => { if (currentModule) {currentModule.possessions.push(parseItem(line));} },
  returns: line => { if (currentItem) {currentItem.returnValue = parseItem(line);} },
  return: line => { if (currentItem) {currentItem.returnValue = parseItem(line);} },
  attribute: line => { if (currentModule) {currentModule.attributes.push(parseItem(line));} },
  section: line => { if (currentModule) {currentModule.sections.push(parseItem(line));} },
  analog: line => { if (currentItem) {currentItem.analogs.push(parseItem(line));} },
  demo: line => { if (currentModule) {currentModule.demos.push(parseItem(line));} }
};

function parseBrackets(str, opening, closing) {
  if (str.charAt(0) === opening) {
    let count = 1;
    let i = 1;
    for (; i < str.length && count > 0; ++i) {
      const c = str.charAt(i);
      if (c === opening) {
        count += 1;
      } else if (c === closing) {
        count -= 1;
      }
    }

    if (count === 0) {
      return str.substring(1, i - 1);
    }
  }

  return null;
}

function parseItem(line, startingObject) {
  const item = startingObject || {};

  item.content = line;

  item.type = parseBrackets(line, '{', '}');
  if (item.type) {line = line.substring(3 + item.type.length).trim();}

  let space = line.indexOf(' ');
  if (space === -1) {space = line.length;}

  item.name = line.substring(0, space);
  line = line.substring(space).trim();

  if (item.name.charAt(0) === '[' && item.name.charAt(item.name.length - 1) === ']') {
    item.name = item.name.substring(1, item.name.length - 1);
    item.optional = true;
  } else {
    item.optional = false;
  }

  item.defaultValue = parseBrackets(line, '[', ']');
  if (item.defaultValue) {line = line.substring(3 + item.defaultValue.length).trim();}

  item.description = line;
  item.examples = [];
  item.params = [];
  item.properties = [];
  item.analogs = [];

  return item;
}

function parseFile(p) {
  const lines = fs.readFileSync(p, 'utf8').split('\n').map(l => l.trim())
    .filter(l => l.startsWith('*'));
  let value = null, tag = null;

  function apply() {
    if (tag) {
      if (TAGS[tag]) {
        TAGS[tag](value);
      } else {
        currentItem = parseItem(value);
        if (!data.tags[tag]) {data.tags[tag] = [];}
        !data.tags[tag].push(currentItem);
      }
    }
  }

  function reset() {
    currentItem = null;
    tag = null;
    value = null;
  }

  currentModule = null;
  reset();

  lines.forEach(line => {
    if (line.startsWith('*/')) {
      apply();
      reset();
    } else {
      line = line.substr(1);

      if (line.trim().startsWith('@')) {
        apply();

        line = line.trim();
        const space = line.indexOf(' ');
        tag = line.substring(1, space === -1 ? undefined : space);
        value = space === -1 ? '' : line.substring(space).trim();
      } else if (value !== null) {
        value += ' \n' + line;
      }
    }
  });
}

module.exports = function(p) {
  data = {
    version: null,
    modules: [],
    plugins: [],
    tags: {}
  };

  currentItem = null;
  currentModule = null;

  if (!Array.isArray(p)) {
    p = [p];
  }

  for (let i = 0; i < p.length; ++i) {
    if (fs.existsSync(p[i])) {
      parsePath(p[i]);
    }
  }

  return data;
};
