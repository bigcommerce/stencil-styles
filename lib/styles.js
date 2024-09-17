const autoprefixer = require('autoprefixer');
const postcss = require('postcss');
const { promisify } = require('util');

const ScssCompiler = require("./ScssCompiler");
const StylesheetsFileResolver = require('./StylesheetsFileResolver');
const CssAssembler = require('./CssAssembler');

class StencilStyles {
    /**
     * @param {object} logger
     * @param compilers
     */
    constructor(
        logger = console,
        compilers = {
            scss: new ScssCompiler(logger),
        },
    ) {
        this.logger = logger;
        this.compilers = compilers;
    }

    /**
     * Calls a compiler for the specified syntax and then processes the output with autoprefixer
     *
     * @param {string} syntax
     * @param {object} options
     */
    async compileCss(syntax, { autoprefixerOptions, ...compilerOptions }) {
        const compiler = this.compilers[syntax];
        if (compiler) {
            const css = await compiler.compile(compilerOptions);
            return this.autoPrefix(css, autoprefixerOptions)
        }
    }

    autoPrefix(css, autoprefixerOptions) {
        if (!css || (typeof css !== 'string' && !(css instanceof Buffer))) {
            return "";
        }
        if (!autoprefixerOptions || Object.keys(autoprefixerOptions).length === 0) {
            return css;
        }
        const payload = typeof css === 'string' || css instanceof Buffer ? css : '';
        let output = css;

        // todo check if autoprefixerOptions is not an empty object
        try {
            output = postcss([autoprefixer(autoprefixerOptions)]).process(payload).css;
        } catch (e) {
            // invalid css
        }

        return output;
    }

    activateEngine(engine) {
        if (engine === 'dart-sass') {
            this.compilers['scss'].activateDartSassEngine();
        } else {
            this.compilers['scss'].activateNodeSassEngine();
        }
    }

    async getCssFiles(themePath) {
        const resolver = new StylesheetsFileResolver(themePath);
        const files = await resolver.get();
        return files;
    }

    async assembleCssFiles(cssFiles, absolutePath, type, options) {
        const assemble = promisify(CssAssembler.assemble);
        return assemble(cssFiles, absolutePath, type, options);
    } 
}

module.exports = StencilStyles;
