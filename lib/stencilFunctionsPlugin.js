const _ = require('lodash');

const STENCIL_FUNCTION = /\bstencil(Color|String|Number|FontFamily|FontWeight|Image)\(\s*([^)]*)\)/g;

/**
 * PostCSS plugin giving Tailwind themes the same settings functions scss
 * themes use (stencilColor, stencilFontFamily, ...), with matching semantics:
 * values substitute at compile time.
 *
 * @param {object} [themeSettings]
 */
function stencilFunctionsPlugin(themeSettings = {}) {
    const resolvers = {
        Color: ([name]) => _.get(themeSettings, name) || null,
        String: ([name]) => _.get(themeSettings, name) || null,
        Number: ([name, unit = 'px']) => `${parseFloat(_.get(themeSettings, name)) || 0}${unit}`,
        FontFamily: ([name]) => parseFont(_.get(themeSettings, name), 'family'),
        FontWeight: ([name]) => parseFont(_.get(themeSettings, name), 'weight'),
        Image: ([imageName, sizeName]) => {
            const image = _.get(themeSettings, imageName);
            const size = _.get(themeSettings, sizeName);
            return _.isString(image) && image.includes('{:size}') && /^\d+x\d+$/.test(size)
                ? image.replace('{:size}', size)
                : null;
        },
    };

    return {
        postcssPlugin: 'stencil-functions',
        Once(root) {
            root.walkDecls((decl) => {
                if (!decl.value.includes('stencil')) {
                    return;
                }
                let unresolvable = false;
                const value = decl.value.replace(STENCIL_FUNCTION, (match, fn, rawArgs) => {
                    const args = rawArgs.split(',').map((arg) => arg.trim().replace(/^['"]|['"]$/g, ''));
                    const resolved = resolvers[fn](args);
                    if (resolved === null) {
                        unresolvable = true;
                        return match;
                    }
                    return resolved;
                });
                if (unresolvable) {
                    decl.remove();
                } else {
                    decl.value = value;
                }
            });
        },
    };
}

/**
 * Same parsing rules as ScssCompiler's font helpers: "Google_Open+Sans_400"
 * yields family "Open Sans" or weight 400
 */
function parseFont(value, type) {
    if (!_.isString(value)) {
        return null;
    }
    let parts = value.split('_');
    if (parts[0] === 'Google') {
        parts = parts.slice(1);
    }
    const raw = parts[type === 'family' ? 0 : 1];
    if (_.isEmpty(raw)) {
        return null;
    }
    const formatted = raw.split(',')[0].replace(/\+/g, ' ').replace(/'|"/g, '');
    return type === 'family' ? `"${formatted}"` : formatted;
}

module.exports = { stencilFunctionsPlugin };
