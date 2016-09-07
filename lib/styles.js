var _ = require('lodash');
var Autoprefixer = require('autoprefixer-core');
var Fs = require('fs');
var Path = require('path');
var Sass = require('node-sass');

module.exports = function StencilStyles() {
    var self = this;

    self.files = {};
    self.fullUrls = {};

    /**
     * Compiles the CSS based on which compiler has been specified
     *
     * @param compiler
     * @param options
     * @param callback
     */
    self.compileCss = function(compiler, options, callback) {
        switch(compiler) {
            case 'scss':
                var compilerOptions = {
                    data: options.data,
                    dest: options.dest,
                    sourceMap: options.sourceMap,
                    functions: self.scssFunctions(options.themeSettings),
                    importer: self.scssImporter
                };

                self.files = options.files || {};
                self.scssCompiler(compilerOptions, doneCompiling);
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
    self.scssCompiler = function(options, callback) {
        var params = {
            data: options.data,
            outFile: options.dest,
            functions: options.functions,
            importer: options.importer,
            sourceMap: options.sourceMap,
            sourceMapEmbed: options.sourceMap
        };

        try {
            Sass.render(params, function(err, result) {
                if (err) {
                    return callback(err);
                }

                callback(null, result.css);
            });

        } catch (e) {
            process.nextTick(function() {
                callback(e);
            });
        }
    };

    /**
     * Generate sass helper functions with access to theme settings
     *
     * @param themeSettings
     * @returns object
     */
    self.scssFunctions = function(themeSettings) {
        var sassFunctions = {};

        sassFunctions['stencilNumber($name, $unit: px)'] = function(nameObj, unitObj) {
            var name = nameObj.getValue(),
                unit = unitObj.getValue(),
                value = 0;

            if (themeSettings[name]) {
                value = parseFloat(themeSettings[name]);
            }

            if (_.isNaN(value)) {
                value = 0;
            }

            return new Sass.types.Number(value, unit);
        };

        sassFunctions['stencilColor($name)'] = function(nameObj) {
            var name = nameObj.getValue(),
                val,
                ret;

            if (themeSettings[name]) {
                val = themeSettings[name];

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

            if (themeSettings[name]) {
                ret = new Sass.types.String(themeSettings[name]);
            } else {
                ret = Sass.NULL;
            }

            return ret;
        };

        sassFunctions['stencilImage($image, $size)'] = function(imageObj, sizeObj) {
            var sizeRegex = /^\d+x\d+$/g,
                image = imageObj.getValue(),
                size = sizeObj.getValue(),
                ret;

            if (_.indexOf(themeSettings[image], '{:size}') !== -1 && sizeRegex.test(themeSettings[size])) {
                ret = new Sass.types.String(themeSettings[image].replace('{:size}', themeSettings[size]));
            } else {
                ret = Sass.NULL;
            }

            return ret;
        };

        sassFunctions['stencilFontFamily($name)'] = function(nameObj) {
            return self.stencilFont(themeSettings[nameObj.getValue()], 'family');
        };

        sassFunctions['stencilFontWeight($name)'] = function(nameObj) {
            return self.stencilFont(themeSettings[nameObj.getValue()], 'weight');
        };

        return sassFunctions;
    };

    /**
     * The custom importer function to pass to the node-sass compiler
     *
     * @param url
     * @param prev
     * @returns object
     */
    self.scssImporter = function(url, prev) {
        var files = self.files,
            prevParts = Path.parse(prev),
            urlParts = Path.parse(url),
            fullUrls = self.fullUrls,
            fullUrl = url + (urlParts.ext === 'scss' ? '' : '.scss'),
            basePath,
            possiblePaths;

        if (prev !== 'stdin') {
            basePath = prevParts.dir;
        }

        if (basePath) {
            fullUrl = Path.join(basePath, fullUrl);
        }

        if (files[fullUrl] === undefined) {
            possiblePaths = _.keys(_.pick(fullUrls, function(val) { return val.indexOf(prev) !== -1; }));

            _.each(possiblePaths, function(possiblePath) {
                var possibleFullUrl = Path.join(Path.parse(possiblePath).dir, url);

                if (files[possibleFullUrl] !== undefined) {
                    fullUrl = possibleFullUrl;

                    // We found it so lets kick out of the loop
                    return false;
                }
            });
        }

        if (files[fullUrl] === undefined) {
            return new Error(fullUrl + ' doesn\'t exist!');
        } else {
            if (! fullUrls[fullUrl]) {
                fullUrls[fullUrl] = [url];
            } else if (fullUrls[fullUrl].indexOf(url) === -1) {
                fullUrls[fullUrl].push(url)
            }

            return {
                file: fullUrl,
                contents: files[fullUrl]
            };
        }
    };

    /**
     * Calls the appropriate font parser for a given provider (Google, etc.)
     *
     * @param value
     * @param type
     * @returns string or null
     */
    self.stencilFont = function(value, type) {
        var provider = value.split('_')[0];

        switch (provider) {
            case 'Google':
                return self.googleFontParser(value, type);
            default:
                return self.defaultFontParser(value, type);
        }
    };

    /**
     * Removes "Google_" from the value and calls the default parser
     * Expects the value in the config has a family_weight structure.
     * Eg value: "Google_Open+Sans_700", "Google_Open+Sans", "Google_Open+Sans_400_sans", "Google_Open+Sans_400,700_sans"
     * @param value
     * @param type - 'family' or 'weight'
     * @returns {*}
     */
    self.googleFontParser = function(value, type) {
        // Splitting the value
        // Eg: 'Google_Open+Sans_700' -> [Google, Open+Sans, 700]
        value = value.split('_');

        // Removing the Google value
        // Eg: [Google, Open+Sans, 700] -> [Open+Sans, 700]
        value = value.splice(1);

        // Join the value again
        // Eg: [Open+Sans, 700] -> 'Open+Sans_700'
        value = value.join('_');

        return self.defaultFontParser(value, type);
    };

    /**
     * Returns the font family or weight
     * Expects the value to have a family_weight structure.
     * Will convert + to spaces
     * Eg value: "Open+Sans_700", "Open Sans", "Open+Sans_400_sans", "Open+Sans_400,700_sans"
     * @param value
     * @param type - 'family' or 'weight'
     * @returns {*}
     */
    self.defaultFontParser = function(value, type) {
        var typeFamily = type === 'family',
            index = typeFamily ? 0 : 1,
            formattedString,
            split;


        if (!_.isString(value)) {
            return Sass.NULL;
        }

        split = value.split('_');

        if (_.isEmpty(split[index])) {
            return Sass.NULL;
        }

        formattedString = split[index].split(',')[0];
        formattedString = formattedString.replace(/\+/g, ' ');

        // Make sure the string has no quotes in it
        formattedString = formattedString.replace(/'|"/g, '');

        if (typeFamily) {
            // Wrap the string in quotes since Sass type String
            // works with quotes and without quotes (it won't add them)
            // and we end up with font-family: Open Sans with no quotes
            formattedString = '"' + formattedString + '"';
        }

        return Sass.types.String(formattedString);
    };
};
