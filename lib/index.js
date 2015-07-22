var _ = require('lodash'),
    Autoprefixer = require('autoprefixer-core'),
    Fs = require('fs'),
    Hoek = require('hoek'),
    Less = require('less'),
    Path = require('path'),
    Sass = require('node-sass'),
    internals = {
        options: {
            importRegex: /@import\s*?"(.*)";/g
        }
    };

module.exports.register = function (server, options, next) {
    internals.options = Hoek.applyToDefaults(internals.options, options);

    server.expose('compile', internals.compileCss);

    return next();
};

module.exports.register.attributes = {
    name: 'StencilStyles',
    version: '0.0.1'
};

/**
 * Compiles the CSS based on which compiler has been specified
 *
 * @param compiler
 * @param options
 * @param callback
 */
internals.compileCss = function (compiler, options, callback) {
    switch(compiler) {
        case 'scss':
            internals.scssCompiler(options, doneCompiling);
            break;
        case 'less':
            internals.lessCompiler(options, doneCompiling);
            break;
    }

    function doneCompiling(err, css) {
        var autoprefixerProcessor;

        if (err) {
            return callback(err);
        }

        autoprefixerProcessor = Autoprefixer(options.autoprefixerOptions);
        css = autoprefixerProcessor.process(css).css;

        callback(null, css);
    }
};

/**
 * Compile SCSS into CSS and return the content
 *
 * @param options
 * @param callback
 */
internals.scssCompiler = function (options, callback) {
    var sassFunctions = {},
        fullUrls = {},
        importer;

    sassFunctions['stencilNumber($name, $unit: px)'] = function(nameObj, unitObj) {
        var name = nameObj.getValue(),
            unit = unitObj.getValue(),
            ret;

        if (options.themeSettings[name]) {
            ret = new Sass.types.Number(options.themeSettings[name], unit);
        } else {
            ret = Sass.NULL;
        }

        return ret;
    };

    sassFunctions['stencilColor($name)'] = function(nameObj) {
        var name = nameObj.getValue(),
            val,
            ret;

        if (options.themeSettings[name]) {
            val = options.themeSettings[name];

            if (val[0] === '#') {
                val = val.substr(1);
            }

            ret = new Sass.types.Color(parseInt('0xff' + val, 16));
        } else {
            ret = Sass.NULL;
        }

        return ret;
    };

    sassFunctions['stencilString($name)'] = function(nameObj) {
        var name = nameObj.getValue(),
            ret;

        if (options.themeSettings[name]) {
            ret = new Sass.types.String(options.themeSettings[name]);
        } else {
            ret = Sass.NULL;
        }

        return ret;
    };

    importer = function(url, prev) {
        var basePath,
            prevParts = Path.parse(prev),
            urlParts = Path.parse(url),
            fullUrl = url + (urlParts.ext === 'scss' ? '' : '.scss'),
            possiblePaths;

        if (prev !== 'stdin') {
            basePath = prevParts.dir;
        }

        if (basePath) {
            fullUrl = Path.join(basePath, fullUrl);
        }

        if (options.files[fullUrl] === undefined) {
            possiblePaths = _.keys(_.pick(fullUrls, function(val) {return val.indexOf(prev) !== -1;}));
            _.each(possiblePaths, function(possiblePath) {
                var possibleFullUrl = Path.join(Path.parse(possiblePath).dir, url);
                if (options.files[possibleFullUrl] !== undefined) {
                    fullUrl = possibleFullUrl;
                    // We found it so lets kick out of the loop
                    return false;
                }
            });
        }

        if (options.files[fullUrl] === undefined) {
            return new Error('doesn\'t exist!');
        } else {
            if (! fullUrls[fullUrl]) {
                fullUrls[fullUrl] = [url];
            } else if (fullUrls[fullUrl].indexOf(url) === -1) {
                fullUrls[fullUrl].push(url)
            }

            return {file: fullUrl, contents: options.files[fullUrl]};
        }
    };

    try {
        var result = Sass.renderSync({
            functions: sassFunctions,
            data: options.data,
            outFile: options.dest,
            sourceMap: true,
            importer: importer,
            sourceMapEmbed: true
        });

        callback(null, result.css);
    } catch (e) {
        callback(e);
    }
};

/**
 * Compile LESS into CSS and return the content
 *
 * @param options
 * @param callback
 */
internals.lessCompiler = function (options, callback) {
    var lessOptions = {
            filename: options.file,
            compress: false,
            sourceMap: {
                sourceMapFileInline: true
            }
        };

    function stencilNumber(nameObj, unitObj) {
        var name = nameObj.value,
            unit = unitObj.value || 'px',
            ret;

        if (options.themeSettings[name]) {
            ret = new Less.tree.Dimension(options.themeSettings[name], unit);
        } else {
            ret = null;
        }

        return ret;
    }

    function stencilString(nameObj) {
        var name = nameObj.value,
            ret;

        if (options.themeSettings[name]) {
            ret = new Less.tree.Anonymous(options.themeSettings[name]);
        } else {
            ret = null;
        }

        return ret;
    }

    function stencilColor(nameObj) {
        var name = nameObj.value,
            val,
            ret;

        if (options.themeSettings[name]) {
            val = options.themeSettings[name];

            if (val[0] === '#') {
                val = val.substr(1);
            }

            ret = new Less.tree.Color(val);
        } else {
            ret = null;
        }

        return ret;
    }

    Less.functions.functionRegistry.addMultiple({
        'stencil-number': stencilNumber,
        'stencil-string': stencilString,
        'stencil-color': stencilColor
    });

    Less.render(options.data, lessOptions).then(function(result) {
        callback(null, result.css);
    }, function(err) {
        callback('LESS Error: ' + err.message + ' at ' + (err.filename + '@' + err.line + ':' + err.column));
    });
};
