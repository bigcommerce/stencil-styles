const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const sinon = require('sinon');
const path = require('path');
const process = require('process');
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
        it('should return an empty string if input is not a string', () => {
            expect(stencilStyles.autoPrefix(null)).to.be.equal('');
            expect(stencilStyles.autoPrefix({})).to.be.equal('');
            expect(stencilStyles.autoPrefix(undefined)).to.be.equal('');
        });

        it('should return the input string if not valid css', () => {
            const notCss = 'this is not css';
            expect(stencilStyles.autoPrefix(notCss)).to.be.equal(notCss);
            expect(stencilStyles.autoPrefix(notCss, {})).to.be.equal(notCss);
            expect(stencilStyles.autoPrefix(Buffer.from(notCss))).to.be.equal(Buffer.from(notCss));
        });

        it('should return the autoprefixed css if valid css', () => {
            const css = 'a { color: red; transition: color 0.3s; }';
            const autoprefixerOptions = { overrideBrowserslist: ['last 2 versions'] };
            const expected = 'a { color: red; -webkit-transition: color 0.3s; transition: color 0.3s; }';

            expect(stencilStyles.autoPrefix(css, autoprefixerOptions)).to.be.equal(expected);
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

    describe('assemble', () => {
        it('should call assemble with the provided arguments', async () => {
            const cssFiles = 'theme.scss';
            const absolutePath = path.join(
                process.cwd(),
                'test/mocks/themes/valid/assets/scss',
            );
            const type = 'scss';
            const options = {};

            const result = await stencilStyles.assembleCssFiles(cssFiles, absolutePath, type, options);
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
            expect(result).to.equal(expected);
        });
    });
});
