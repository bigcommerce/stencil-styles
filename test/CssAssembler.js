const path = require('path');
const { promisify } = require('util');

const { expect } =  require('@hapi/code');
const { describe, it } = exports.lab = require('@hapi/lab').script();

const { assemble } = require('../lib/CssAssembler');

const expected = {
    'theme.scss': '@import "tools/tools";\n@import "tools/onemore";\n\nh1 {\n    color: #0000AA;\n}\n\n$font: "Arial";',
    'tools/tools.scss': '.tools {\n    color: red;\n}',
    'tools/onemore.scss': '.underscore {\n    color: green;\n}',
};
if (process.platform === 'win32') {
    Object.keys(expected).forEach((key) => {
        expected[key] = expected[key].replace(/\n/g, '\r\n');
    });
}

describe('CssAssembler', () => {
    it('should return all assenbled stylesheet files', async () => {
        const cssFiles = 'theme.scss';
        const absolutePath = path.join(
            process.cwd(),
            'test/mocks/themes/valid/assets/scss',
        );
        const type = 'scss';
        const options = {};

        const result = await promisify(assemble)(cssFiles, absolutePath, type, options);
        expect(result).to.equal(expected);
    });

    it('should provide bunlded stylesheet files', async () => {
        const cssFiles = ['theme.scss', 'tools/tools.scss'];
        const absolutePath = path.join(
            process.cwd(),
            'test/mocks/themes/valid/assets/scss',
        );
        const type = 'scss';
        const options = { bundle: true };

        const result = await promisify(assemble)(cssFiles, absolutePath, type, options);
        expect(result).to.equal(expected);
    });
});