'use strict';

const _ = require('lodash');
const autoprefixer = require('autoprefixer');
const postcss = require('postcss');
const path = require('path');
const sass = require('@bigcommerce/node-sass');

function StencilStyles() {
    this.files = {};
    this.fullUrls = {};

    /**
     * Compiles the CSS based on which compiler has been specified
     *
     * @param compiler
     * @param options
     * @param callback
     */
    this.compileCss = (compiler, options, callback) => {
        switch(compiler) {
        case 'scss':
            const compilerOptions = {
                data: options.data,
                dest: options.dest,
                sourceMap: options.sourceMap,
                functions: this.scssFunctions(options.themeSettings),
            };

            this.files = options.files || {};
            this.scssCompiler(compilerOptions, (err, css) => {
                if (err) {
                    return callback(err);
                }

                callback(null, this.autoPrefix(css, options.autoprefixerOptions));
            });
            break;
        }
    };

    this.autoPrefix = (css, autoprefixerOptions) => {
        const payload = typeof css === 'string' || css instanceof Buffer ? css : '';
        var output = css;

        try {
            output = postcss([autoprefixer(autoprefixerOptions)]).process(payload).css;
        } catch (e) {
            // invalid css
        }

        return output;
    };

    /**
     * Compile SCSS into CSS and return the content
     *
     * @param options
     * @param callback
     */
    this.scssCompiler = (options, callback) => {
        const params = {
            data: options.data,
            outFile: options.dest,
            functions: options.functions,
            importer: this.scssImporter,
            sourceMap: options.sourceMap,
            sourceMapEmbed: options.sourceMap,
        };

        try {
            sass.render(params, (err, result) => {
                if (err) {
                    return callback(err);
                }

                callback(null, result.css);
            });

        } catch (e) {
            process.nextTick(() => {
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
    this.scssFunctions = (themeSettings) => {
        const sassFunctions = {};

        sassFunctions['stencilNumber($name, $unit: px)'] = (nameObj, unitObj) => {
            const name = nameObj.getValue();
            const unit = unitObj.getValue();
            var value = 0;

            if (themeSettings[name]) {
                value = parseFloat(themeSettings[name]);
            }

            if (_.isNaN(value)) {
                value = 0;
            }

            return new sass.types.Number(value, unit);
        };

        sassFunctions['stencilColor($name)'] = (nameObj) => {
            const name = nameObj.getValue();
            var val;
            var ret;

            if (themeSettings[name]) {
                val = themeSettings[name];

                if (val[0] === '#') {
                    val = val.substr(1);
                }

                ret = new sass.types.Color(parseInt('0xff' + val, 16));
            } else {
                ret = sass.NULL;
            }

            return ret;
        };

        sassFunctions['stencilString($name)'] = (nameObj) => {
            const name = nameObj.getValue();

            return themeSettings[name]
                ? new sass.types.String(themeSettings[name])
                : sass.NULL;
        };

        sassFunctions['stencilImage($image, $size)'] = (imageObj, sizeObj) => {
            const sizeRegex = /^\d+x\d+$/g;
            const image = imageObj.getValue();
            const size = sizeObj.getValue();
            var ret;

            if (themeSettings[image].indexOf('{:size}') !== -1 && sizeRegex.test(themeSettings[size])) {
                ret = new sass.types.String(themeSettings[image].replace('{:size}', themeSettings[size]));
            } else {
                ret = sass.NULL;
            }

            return ret;
        };

        sassFunctions['stencilFontFamily($name)'] = (nameObj) => {
            return this.stencilFont(themeSettings[nameObj.getValue()], 'family');
        };

        sassFunctions['stencilFontWeight($name)'] = (nameObj) => {
            return this.stencilFont(themeSettings[nameObj.getValue()], 'weight');
        };

        return sassFunctions;
    };

    /**
     * The custom importer callback function to pass to the node-sass compiler
     *
     * @param url
     * @param prev
     * @returns object
     */
    this.scssImporter = (url, prev) => {
        let fullUrl = url + (url.match(/.*\.scss$/) ? '' : '.scss');

        if (prev !== 'stdin') {
            fullUrl = path.join(path.parse(prev).dir, fullUrl);
        }

        if (this.files[fullUrl] === undefined) {
            const possiblePaths = Object.keys(_.pick(this.fullUrls, val => val.indexOf(prev) !== -1));

            possiblePaths.find(possiblePath => {
                const possibleFullUrl = path.join(path.parse(possiblePath).dir, url);

                if (this.files[possibleFullUrl] !== undefined) {
                    fullUrl = possibleFullUrl;

                    // We found it so lets kick out of the loop
                    return true;
                }
            });
        }

        if (this.files[fullUrl] === undefined) {
            return new Error(fullUrl + ' doesn\'t exist!');
        }

        if (!this.fullUrls[fullUrl]) {
            this.fullUrls[fullUrl] = [url];
        } else if (this.fullUrls[fullUrl].indexOf(url) === -1) {
            this.fullUrls[fullUrl].push(url);
        }

        return {
            file: fullUrl,
            contents: this.files[fullUrl],
        };
    };

    /**
     * Calls the appropriate font parser for a given provider (Google, etc.)
     *
     * @param value
     * @param type
     * @returns string or null
     */
    this.stencilFont = (value, type) => {
        const provider = value.split('_')[0];

        switch (provider) {
        case 'Google':
            return this.googleFontParser(value, type);
        default:
            return this.defaultFontParser(value, type);
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
    this.googleFontParser = (value, type) => {
        // Splitting the value
        // Eg: 'Google_Open+Sans_700' -> [Google, Open+Sans, 700]
        value = value.split('_');

        // Removing the Google value
        // Eg: [Google, Open+Sans, 700] -> [Open+Sans, 700]
        value = value.splice(1);

        // Join the value again
        // Eg: [Open+Sans, 700] -> 'Open+Sans_700'
        value = value.join('_');

        return this.defaultFontParser(value, type);
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
    this.defaultFontParser = (value, type) => {
        const typeFamily = type === 'family';
        const index = typeFamily ? 0 : 1;
        var formattedString;
        var split;


        if (!_.isString(value)) {
            return sass.NULL;
        }

        split = value.split('_');

        if (_.isEmpty(split[index])) {
            return sass.NULL;
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

        return sass.types.String(formattedString);
    };
};

module.exports = StencilStyles;
