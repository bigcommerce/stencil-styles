const _ = require('lodash');
const path = require('path');
const { promisify } = require('util');

class ScssCompiler {
    /**
     * @param {object} logger
     * @param {function} logger.error
     * @param {object} [engine]

     */
    constructor(logger) {
        this.engine = null; // can't load module in the constructor, otherwise node-sass binaries will conflict
        this.logger = logger;
        this.files = {};
        this.fullUrls = {};
        this._wasUsed = false;
    }

    activateNodeSassEngine() {
        this.engine = require('node-sass');
    }

    activateDartSassEngine() {
        this.engine = require('sass');
    }

    get saasTypes() {
        return this.engine.types;
    }

    /**
     * Make sure sass engine is activated
     * 
     * @private
     */
    _assertEngineIsActive() {
        if (!this.engine) {
            throw new Error('ScssCompiler is used without activating specific implementation');
        }
    }

    /**
     * We need to make sure to create a new instance per each compilation to avoid processes interfering each other (e.g. sharing this.files)
     *
     * @private
     */
    _assertOneOffUsage() {
        if (this._wasUsed) {
            throw new Error('This ScssCompiler instance was already used. Please, create a new instance per compilation')
        } else {
            this._wasUsed = true;
        }
    }

    /**
     * Compile SCSS into CSS and return the content
     *
     * @public
     * @param options
     */
    async compile(options) {
        this._assertOneOffUsage();
        this._assertEngineIsActive();

        this.files = options.files || {};
        const engineOptions = {
            data: options.data,
            outFile: options.dest,
            files: options.files,
            sourceMap: options.sourceMap,
            sourceMapEmbed: options.sourceMap,
            functions: this.getScssFunctions(options.themeSettings),
            importer: this.scssImporter.bind(this),
            quietDeps: true, // suppress deprecation warnings
        };
        const result = await this._render(engineOptions);
        this.files = {};
        return result.css;
    }

    /**
     * Calls active engine with the specified options
     *
     * @private
     * @param options
     * @return {Promise<object>}
     */
    async _render(options) {
        return promisify(this.engine.render)(options);
    }

    /**
     * Generate sass helper functions with access to theme settings
     *
     * @private
     * @param themeSettings
     * @returns object
     */
    getScssFunctions(themeSettings) {
        const sassFunctions = {};

        sassFunctions['stencilNumber($name, $unit: px)'] = (nameObj, unitObj) => {
            const name = _.get(themeSettings, nameObj.getValue());
            const unit = unitObj.getValue();
            const value = parseFloat(name) || 0;

            return new this.saasTypes.Number(value, unit);
        };

        sassFunctions['stencilColor($name)'] = (nameObj) => {
            const name = _.get(themeSettings, nameObj.getValue());
            const val = name && name[0] === '#' ? name.substr(1) : name;

            return name
                ? new this.saasTypes.Color(parseInt('0xff' + val, 16))
                : this.saasTypes.Null.NULL;
        };

        sassFunctions['stencilString($name)'] = (nameObj) => {
            const name = _.get(themeSettings, nameObj.getValue());

            return name
                ? new this.saasTypes.String(name)
                : this.saasTypes.Null.NULL;
        };

        sassFunctions['stencilImage($image, $size)'] = (imageObj, sizeObj) => {
            const sizeRegex = /^\d+x\d+$/g;
            const image = _.get(themeSettings, imageObj.getValue());
            const size = _.get(themeSettings, sizeObj.getValue());

            if (image.indexOf('{:size}') !== -1 && sizeRegex.test(size)) {
                return new this.saasTypes.String(image.replace('{:size}', size));
            } else {
                return this.saasTypes.Null.NULL;
            }
        };

        sassFunctions['stencilFontFamily($name)'] = (nameObj) => {
            const name = _.get(themeSettings, nameObj.getValue());

            return this.stencilFont(name, 'family');
        };

        sassFunctions['stencilFontWeight($name)'] = (nameObj) => {
            const name = _.get(themeSettings, nameObj.getValue());

            return this.stencilFont(name, 'weight');
        };

        return sassFunctions;
    }

    /**
     * The custom importer callback function to pass to the node-sass compiler
     *
     * @private
     * @param url
     * @param prev
     * @returns object
     */
    scssImporter(url, prev) {
        let fullUrl = url + (url.match(/.*\.scss$/) ? '' : '.scss');

        if (prev !== 'stdin') {
            fullUrl = path.join(path.parse(prev).dir, fullUrl);
        }

        if (this.files[fullUrl] === undefined) {
            const possiblePaths = Object.keys(_.pickBy(this.fullUrls, val => val.indexOf(prev) !== -1));

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
    }

    /**
     * Calls the appropriate font parser for a given provider (Google, etc.)
     *
     * @private
     * @param value
     * @param type
     * @returns string or null
     */
    stencilFont(value, type) {
        const provider = value.split('_')[0];

        switch (provider) {
        case 'Google':
            return this.googleFontParser(value, type);
        default:
            return this.defaultFontParser(value, type);
        }
    }

    /**
     * Removes "Google_" from the value and calls the default parser
     * Expects the value in the config has a family_weight structure.
     * Eg value: "Google_Open+Sans_700", "Google_Open+Sans", "Google_Open+Sans_400_sans", "Google_Open+Sans_400,700_sans"
     *
     * @private
     * @param value
     * @param type - 'family' or 'weight'
     * @returns {*}
     */
    googleFontParser(value, type) {
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
    }

    /**
     * Returns the font family or weight
     * Expects the value to have a family_weight structure.
     * Will convert + to spaces
     * Eg value: "Open+Sans_700", "Open Sans", "Open+Sans_400_sans", "Open+Sans_400,700_sans"
     *
     * @private
     * @param value
     * @param type - 'family' or 'weight'
     * @returns {*}
     */
    defaultFontParser(value, type) {
        const typeFamily = type === 'family';
        const index = typeFamily ? 0 : 1;
        let formattedString;
        let split;

        if (!_.isString(value)) {
            return this.saasTypes.Null.NULL;
        }

        split = value.split('_');

        if (_.isEmpty(split[index])) {
            return this.saasTypes.Null.NULL;
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

        return new this.saasTypes.String(formattedString);
    }
}

module.exports = ScssCompiler;
