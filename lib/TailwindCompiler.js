const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const postcssImport = require('postcss-import');
const tailwindcss = require('tailwindcss');

const { stencilFunctionsPlugin } = require('./stencilFunctionsPlugin');

// Only BC-owned presets are ever loaded, and always from this package's own
// dependency tree - never from the uploaded theme.
const DEFAULT_PRESETS = ['storefront-kit/tailwind'];

class TailwindCompiler {
    /**
     * @param {object} logger
     * @param {object} [options]
     * @param {string[]} [options.presets] module specifiers of allowlisted Tailwind presets
     */
    constructor(logger = console, options = {}) {
        this.logger = logger;
        this.presets = options.presets || DEFAULT_PRESETS;
    }

    /**
     * Compile a theme's Tailwind entry into CSS
     *
     * @public
     * @param {object} options
     * @param {string} options.data entry CSS content (the @tailwind directives)
     * @param {string} options.themePath root of the theme; its templates and JS are scanned for class names
     * @param {object} [options.themeSettings]
     */
    async compile({ data, themePath, themeSettings, sourceMap }) {
        this._assertNoConfigDirective(data);
        const result = await postcss([
            postcssImport({
                root: themePath,
                resolve: (id, basedir) => this._resolveImport(id, basedir, themePath),
                load: (filename) => this._loadImport(filename),
            }),
            stencilFunctionsPlugin(themeSettings),
            tailwindcss(this._buildConfig(themePath)),
        ]).process(data, { from: undefined, map: sourceMap ? { inline: true } : false });
        return result.css;
    }

    /**
     * @import may only reach files inside the theme directory
     *
     * @private
     */
    _resolveImport(id, basedir, themePath) {
        const resolved = path.resolve(basedir, id);
        if (!this._isInside(resolved, themePath)) {
            throw new Error(`Cannot import "${id}": it is outside the theme directory`);
        }
        return resolved;
    }

    /**
     * Imported files get the same @config policy as the entry, so imports
     * can't act as a side door
     *
     * @private
     */
    _loadImport(filename) {
        const content = fs.readFileSync(filename, 'utf8');
        this._assertNoConfigDirective(content);
        return content;
    }

    _isInside(target, dir) {
        const relative = path.relative(dir, target);
        // isAbsolute only triggers for cross-drive paths on Windows
        // $lab:coverage:off$
        if (path.isAbsolute(relative)) {
            return false;
        }
        // $lab:coverage:on$
        return !relative.startsWith('..');
    }

    /**
     * Tailwind v3's @config directive loads arbitrary JavaScript, so theme CSS
     * may not use it
     *
     * @private
     */
    _assertNoConfigDirective(data) {
        if (/@config\b/.test(data)) {
            throw new Error(
                'The @config directive is not supported: theme-provided Tailwind configs are never loaded. ' +
                'Customization comes from the platform presets.',
            );
        }
    }

    /**
     * The theme's own tailwind.config.js is deliberately ignored: honoring it
     * would mean executing theme-authored JavaScript.
     *
     * @private
     */
    _buildConfig(themePath) {
        return {
            presets: this.presets.map((specifier) => this._loadPreset(specifier)),
            content: [
                path.join(themePath, 'templates/**/*.html'),
                path.join(themePath, 'assets/js/**/*.js'),
            ],
        };
    }

    _loadPreset(specifier) {
        const module = require(specifier);
        return module.__esModule && module.default ? module.default : module;
    }
}

module.exports = TailwindCompiler;
