#!/usr/bin/env node

// Nodejs libs.
var fs = require('fs');
var path = require('path');
var requirejs = require('requirejs');
var glob = require("glob");
var _ = require('lodash');

var arguments = process.argv.splice(2);

var proj_dir = path.resolve(arguments.length ? arguments.shift() : '.');
var templatePath = path.join(__dirname, 'textFiles.template.js');
var destinationPath = path.join(proj_dir, 'textFiles.js');
var settingsPath = path.join(proj_dir, 'settings.js');


// Use require to resolve module paths.
var require_config = path.join(proj_dir, 'jam', 'require.config.js');
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

    var sortedPaths = filePaths.sort();
    var textPaths = _(sortedPaths).map(function (filePath) {
        return 'text!' + filePath
    });

    // Write the textFiles
    var fileTemplate = _.template(template);
    fs.writeFile(destinationPath, fileTemplate({
        textFiles: sortedPaths.join("',\n        '"),
        paths: textPaths.join("',\n    '")
    }));
});


