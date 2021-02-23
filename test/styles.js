const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const sinon = require('sinon');
const StencilStyles = require('../lib/styles');
const ScssCompiler = require('../lib/ScssCompiler');

const lab = exports.lab = Lab.script();
const afterEach = lab.afterEach;
const beforeEach = lab.beforeEach;
const describe = lab.experiment;
const expect = Code.expect;
const it = lab.it;

describe('StencilStyles Plugin', () => {
    let stencilStyles;
    let loggerMock;
    let compilersMock;
    const scssCompilerResultMock = 'a { color: red; }';

    const getCompilersMock = () => ({
        scss: {
            compile: sinon.stub().returns(scssCompilerResultMock),
        },
    });
    const getOptionsMock = () => ({
        files: {},
        autoprefixerOptions: {},
        themeSettings: {},
    });

    beforeEach(() => {
        loggerMock = {};
        compilersMock = getCompilersMock();
        stencilStyles = new StencilStyles(loggerMock, compilersMock);
    });

    describe('constructor', () => {
        it('should use a default logger if none was passed through constructor', () => {
            const stencilStyles = new StencilStyles();

            expect(stencilStyles.logger).to.be.equal(console);
        });

        it('should use default compilers if they weren\'t passed through constructor', () => {
            const stencilStyles = new StencilStyles(loggerMock);

            expect([...Object.keys(stencilStyles.compilers)]).to.be.equal(['scss']);
            expect(stencilStyles.compilers.scss).to.be.instanceOf(ScssCompiler);
            expect(stencilStyles.compilers.scss.logger).to.be.equal(loggerMock);
        });
    });

    describe('autoPrefix', () => {
        it('should add vendor prefixes to css rules', () => {
            const prefixedCss = stencilStyles.autoPrefix('a { transform: scale(0.5); display: flex; }');
            expect(prefixedCss).to.contain(['-ms-flexbox']);
        });

        it('should return an empty string if input is not a string', () => {
            expect(stencilStyles.autoPrefix(null)).to.be.equal('');
            expect(stencilStyles.autoPrefix({})).to.be.equal('');
            expect(stencilStyles.autoPrefix(undefined)).to.be.equal('');
        });

        it('should return the input string if not valid css', () => {
            const notCss = 'this is not css';
            expect(stencilStyles.autoPrefix(notCss)).to.be.equal(notCss);
        });
    });

    describe('compileCss()', () => {
        describe('when compilations succeed', () => {
            let autoPrefixResultMock = 'a { color: blue; }';

            beforeEach(() => {
                sinon.stub(stencilStyles, 'autoPrefix').returns(autoPrefixResultMock);
            });
            afterEach(() => {
                stencilStyles.autoPrefix.restore();
            });

            it('should call compiler with the compiler options from arguments', async () => {
                const options = getOptionsMock();
                // eslint-disable-next-line no-unused-vars
                const { autoprefixerOptions, ...compilerOptions } = options;

                await stencilStyles.compileCss('scss', options);

                expect(compilersMock.scss.compile.calledOnce).to.equal(true);
                expect(compilersMock.scss.compile.calledWith(compilerOptions)).to.equal(true);
            });

            it('should call this.autoPrefix with the result from compiler', async () => {
                const options = getOptionsMock();
                const { autoprefixerOptions } = options;

                await stencilStyles.compileCss('scss', options);

                expect(stencilStyles.autoPrefix.calledOnce).to.equal(true);
                expect(stencilStyles.autoPrefix.calledWith(scssCompilerResultMock, autoprefixerOptions)).to.equal(true);
            });

            it('should return the final output from autoprefixer', async () => {
                const result = await stencilStyles.compileCss('scss', getOptionsMock());

                expect(result).to.equal(autoPrefixResultMock);
            });
        });

        it('should return undefined if no compiler found for the specified syntax', async () => {
            const result = await stencilStyles.compileCss('english', getOptionsMock());

            await expect(result).to.be.undefined();
        });

        describe('when compilations fails', () => {
            it('should pass on the thrown error from compiler', async () => {
                const errorMessage = 'Some Error';
                compilersMock.scss.compile.throws(new Error(errorMessage));

                await expect(stencilStyles.compileCss('scss', getOptionsMock()))
                    .to.reject(Error, errorMessage);
            });
        });
    });
});
