/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2016-03-04.
 */
'use strict';

/*
 * grunt-forceLink
 *
 * This task crush and minify ForceLink code.
 */
const uglify = require('uglify-js');

// Shorteners
function minify(string) {
  return uglify.minify(string, {fromString: true}).code;
}

// Crushing function
function crush(fnString) {
  let pattern,
    i,
    l;

  const np = [
    'x',
    'y',
    'dx',
    'dy',
    'old_dx',
    'old_dy',
    'mass',
    'convergence',
    'size',
    'fixed'
  ];

  const ep = [
    'source',
    'target',
    'weight'
  ];

  const rp = [
    'node',
    'centerX',
    'centerY',
    'size',
    'nextSibling',
    'firstChild',
    'mass',
    'massCenterX',
    'massCenterY'
  ];

  // Replacing matrix accessors by incremented indexes
  for (i = 0, l = rp.length; i < l; i++) {
    pattern = new RegExp('rp\\(([^,]*), \'' + rp[i] + '\'\\)', 'g');
    fnString = fnString.replace(
      pattern,
      (i === 0) ? '$1' : '$1 + ' + i
    );
  }

  for (i = 0, l = np.length; i < l; i++) {
    pattern = new RegExp('np\\(([^,]*), \'' + np[i] + '\'\\)', 'g');
    fnString = fnString.replace(
      pattern,
      (i === 0) ? '$1' : '$1 + ' + i
    );
  }

  for (i = 0, l = ep.length; i < l; i++) {
    pattern = new RegExp('ep\\(([^,]*), \'' + ep[i] + '\'\\)', 'g');
    fnString = fnString.replace(
      pattern,
      (i === 0) ? '$1' : '$1 + ' + i
    );
  }

  return fnString;
}

// Cleaning function
function clean(string) {
  return string.replace(
    /function crush\(fnString\)/,
    'var crush = null; function no_crush(fnString)'
  );
}

module.exports = function(grunt) {

  // Force atlas grunt multitask
  function multitask() {

    // Iterate over all specified file groups.
    this.files.forEach(f => {
      // Concat specified files.
      let src = f.src.filter(filepath => {
        // Warn on and remove invalid source files (if nonull was set).
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          return true;
        }
      }).map(filepath => {
        // Read file source.
        return grunt.file.read(filepath);
      }).join('\n');

      // Crushing, cleaning and minifying
      src = crush(src);
      src = clean(src);
      try {
        src = minify(src);
      } catch(e) {
        grunt.fail.fatal(`JavaScript parse error while minifying at ${e.line}:${e.col}`);
      }

      // Write the destination file.
      grunt.file.write(f.dest, src);

      // Print a success message.
      grunt.log.writeln('File "' + f.dest + '" created.');
    });
  }

  // Registering the task
  grunt.registerMultiTask(
    'forceLink',
    'A grunt task to crush and minify ForceLink.',
    multitask
  );
};
