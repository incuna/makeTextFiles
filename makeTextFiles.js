#!/usr/bin/env node

'use strict';

// Nodejs libs.
var fs = require('fs');
var path = require('path');
var requirejs = require('requirejs');
var glob = require("glob");
var _ = require('lodash');

var program = process.argv[1];
var args = process.argv.splice(2);

function Usage(ret) {
    console.log('Usage');
    console.log(program+' [path/to/settings.js]');
    process.exit(ret||0);
}

var settingsPath;
if (args.length) {
    // settingsPath specified
    settingsPath = args.shift();
} else {
    // Guess settingsPath
    var cwd = process.cwd();
    settingsPath = path.join(cwd, 'settings.js');
    if (!fs.existsSync(settingsPath)) {
        var found = glob.sync("*/settings.js");
        if (found.length) {
            settingsPath = path.join(cwd, found[0]);
        }
    }
    console.log('Using '+settingsPath);
}

if (!fs.existsSync(settingsPath)) {
    console.log('Cant find settings.js');
    Usage(1);
}

var proj_dir = path.dirname(settingsPath);
var destinationPath = path.join(proj_dir, 'textFiles.js');
var require_config = path.join(proj_dir, 'jam', 'require.config.js');
var templatePath = path.join(__dirname, 'textFiles.template.js');


// Use require to resolve module paths.
if (fs.existsSync(require_config)) {
    requirejs(require_config);
} else {
    requirejs.config({
        'paths': {
        'lib': '../lib',
        'lodash': '../lib/require-underscore/underscore'
        }
    });
}

var root_len = requirejs.toUrl('').replace(/.js$/, '').length;
function modulePath(module) {
  return requirejs.toUrl(module).replace(/.js$/, '').substr(root_len);
};


// read the textFiles template
fs.readFile(templatePath, 'utf8', function (err, template) {
    if (err) {
        return console.log(err);
    }

    // Find the files
    var settings = requirejs(settingsPath);
    var filePaths = _.chain(settings.DATA_DIRS).map(function (module) {
        // Use require to determin the module path.
        var processedDir = modulePath(module);
        var options = {
            cwd: path.join(proj_dir, processedDir)
        }

        var files = glob.sync("**/*.{json,yaml,html}", options);

        // Append the file paths to the module path.
        return _(files).map(function (file) {return path.join(module, file);});
    }).flatten().value();

    if (!filePaths) {
        console.log('No files found');
        process.exit(2);
    }

    var sortedPaths = filePaths.sort();
    var textPaths = _(sortedPaths).map(function (filePath) {
        return 'text!' + filePath
    });

    // Write the textFiles
    console.log('Writting '+destinationPath);
    var fileTemplate = _.template(template);
    fs.writeFile(destinationPath, fileTemplate({
        textFiles: sortedPaths.join("',\n        '"),
        paths: textPaths.join("',\n    '")
    }));
});


