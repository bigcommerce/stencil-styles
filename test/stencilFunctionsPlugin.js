const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const postcss = require('postcss');
const { stencilFunctionsPlugin } = require('../lib/stencilFunctionsPlugin');

const lab = exports.lab = Lab.script();
const describe = lab.experiment;
const expect = Code.expect;
const it = lab.it;

describe('stencilFunctionsPlugin', () => {
    const run = async (css, themeSettings) => {
        const result = await postcss([stencilFunctionsPlugin(themeSettings)])
            .process(css, { from: undefined });
        return result.css;
    };

    it('should resolve stencilColor to the setting value', async () => {
        const css = await run(
            'a { color: stencilColor("color-primary"); }',
            { 'color-primary': '#3f51b5' },
        );

        expect(css).to.equal('a { color: #3f51b5; }');
    });

    it('should remove the declaration when the setting is missing, like sass null', async () => {
        const css = await run(
            'a { color: stencilColor("nope"); background: #fff; }',
            {},
        );

        expect(css).to.equal('a { background: #fff; }');
    });

    it('should resolve stencilString verbatim', async () => {
        const css = await run(
            'a::before { content: stencilString("promo-text"); }',
            { 'promo-text': '"Sale"' },
        );

        expect(css).to.contain('content: "Sale";');
    });

    it('should resolve stencilNumber with px as the default unit', async () => {
        const css = await run(
            'a { font-size: stencilNumber("base-size"); }',
            { 'base-size': 16 },
        );

        expect(css).to.equal('a { font-size: 16px; }');
    });

    it('should resolve stencilNumber with an explicit unit and default to 0', async () => {
        const css = await run(
            'a { line-height: stencilNumber("line-height", em); margin: stencilNumber("nope", rem); }',
            { 'line-height': '1.5' },
        );

        expect(css).to.contain('line-height: 1.5em;');
        expect(css).to.contain('margin: 0rem;');
    });

    it('should parse Google font settings like the scss stencilFontFamily', async () => {
        const css = await run(
            'body { font-family: stencilFontFamily("body-font"); }',
            { 'body-font': 'Google_Open+Sans_400' },
        );

        expect(css).to.equal('body { font-family: "Open Sans"; }');
    });

    it('should parse font weight like the scss stencilFontWeight', async () => {
        const css = await run(
            'body { font-weight: stencilFontWeight("body-font"); }',
            { 'body-font': 'Google_Open+Sans_400,700_sans' },
        );

        expect(css).to.equal('body { font-weight: 400; }');
    });

    it('should resolve stencilImage with a valid size', async () => {
        const css = await run(
            'a { background-image: url(stencilImage("logo", "logo-size")); }',
            { logo: 'img/logo-{:size}.png', 'logo-size': '250x100' },
        );

        expect(css).to.contain('url(img/logo-250x100.png)');
    });

    it('should remove stencilImage declarations with an invalid size', async () => {
        const css = await run(
            'a { background-image: url(stencilImage("logo", "logo-size")); color: red; }',
            { logo: 'img/logo-{:size}.png', 'logo-size': 'huge' },
        );

        expect(css).to.equal('a { color: red; }');
    });

    it('should leave declarations without stencil functions untouched', async () => {
        const css = await run('a { color: red; }', { 'color-primary': '#fff' });

        expect(css).to.equal('a { color: red; }');
    });
});
