const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const path = require('path');
const TailwindCompiler = require('../lib/TailwindCompiler');

const lab = exports.lab = Lab.script();
const describe = lab.experiment;
const expect = Code.expect;
const it = lab.it;

describe('TailwindCompiler', () => {
    const themePath = path.join(__dirname, 'mocks/themes/tailwind');
    const entryCss = '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n';

    const buildCompiler = () => new TailwindCompiler(console, {
        presets: [path.join(__dirname, 'mocks/fixturePreset.js')],
    });

    describe('compile', () => {
        it('should generate utilities for classes used in theme templates only', async () => {
            const css = await buildCompiler().compile({
                data: entryCss,
                themePath,
                themeSettings: {},
            });

            expect(css).to.contain('.flex');
            expect(css).to.contain('.p-4');
            expect(css).to.not.contain('.p-8');
        });

        it('should apply tokens and plugins from allowlisted presets', async () => {
            const css = await buildCompiler().compile({
                data: entryCss,
                themePath,
                themeSettings: {},
            });

            expect(css).to.contain('.text-fixture');
            expect(css).to.contain('rgb(171 205 239');
            expect(css).to.contain('scrollbar-width: none');
        });

        it('should unwrap the default export of transpiled ESM presets', async () => {
            const compiler = new TailwindCompiler(console, {
                presets: [path.join(__dirname, 'mocks/fixtureEsmPreset.js')],
            });
            const css = await compiler.compile({
                data: entryCss,
                themePath,
                themeSettings: {},
            });

            expect(css).to.contain('.text-esmfixture');
        });

        it('should resolve stencil settings functions like the scss compiler does', async () => {
            const css = await buildCompiler().compile({
                data: `${entryCss}body { color: stencilColor("body-font-color"); font-family: stencilFontFamily("body-font"); }\n`,
                themePath,
                themeSettings: { 'body-font-color': '#3f51b5', 'body-font': 'Google_Karla_400' },
            });

            expect(css).to.contain('color: #3f51b5');
            expect(css).to.contain('font-family: "Karla"');
        });

        it('should ignore the theme\'s own tailwind.config.js entirely', async () => {
            // the fixture theme's config defines a "boobytrap" color and the
            // template uses text-boobytrap; it must never compile
            const css = await buildCompiler().compile({
                data: entryCss,
                themePath,
                themeSettings: {},
            });

            expect(css).to.contain('.flex');
            expect(css).to.not.contain('boobytrap');
        });
    });

    describe('multi-file themes', () => {
        it('should inline @import of theme files and resolve stencil functions inside them', async () => {
            const css = await buildCompiler().compile({
                data: `@import "./partials/buttons.css";\n${entryCss}`,
                themePath,
                themeSettings: { 'button-color': '#00ff00' },
            });

            expect(css).to.contain('.btn-fixture');
            expect(css).to.contain('color: #00ff00');
        });

        it('should reject @import paths that escape the theme directory', async () => {
            await expect(buildCompiler().compile({
                data: '@import "../../outsideTheme.css";\n',
                themePath,
                themeSettings: {},
            })).to.reject(Error, /outside the theme directory/);
        });

        it('should reject @config even when it hides inside an imported file', async () => {
            await expect(buildCompiler().compile({
                data: '@import "./partials/sneaky.css";\n',
                themePath,
                themeSettings: {},
            })).to.reject(Error, /@config/);
        });
    });

    describe('source maps', () => {
        it('should embed a source map when sourceMap is true, like the scss compiler', async () => {
            const css = await buildCompiler().compile({
                data: entryCss,
                themePath,
                themeSettings: {},
                sourceMap: true,
            });

            expect(css).to.contain('sourceMappingURL=data:');
        });
    });

    describe('config loading policy', () => {
        it('should reject @config directives in theme CSS', async () => {
            await expect(buildCompiler().compile({
                data: `@config "./tailwind.config.js";\n${entryCss}`,
                themePath,
                themeSettings: {},
            })).to.reject(Error, /@config/);
        });
    });

    describe('default presets', () => {
        it('should allowlist only the storefront-kit preset by default', () => {
            const compiler = new TailwindCompiler(console);

            expect(compiler.presets).to.equal(['storefront-kit/tailwind']);
        });
    });
});
