const autoprefixer = require('autoprefixer');
const postcss = require('postcss');
const ScssCompiler = require("./ScssCompiler");

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
        const payload = typeof css === 'string' || css instanceof Buffer ? css : '';
        let output = css;

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
}

module.exports = StencilStyles;
