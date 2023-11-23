const path = require('path');

const StylesheetsFileResolver = require('../lib/StylesheetsFileResolver');

const { expect } =  require('@hapi/code');
const { describe, it } = exports.lab = require('@hapi/lab').script();
describe('StylesheetsFileResolver', () => {
    it('should return all stylesheet files', async () => {
        const themePath = path.join(
            process.cwd(),
            'test/mocks/themes/invalid',
        );
        const resolver = new StylesheetsFileResolver(themePath);
        const files = await resolver.get();
        expect(files.sort()).to.equal(['theme', 'test'].sort());
    });
});