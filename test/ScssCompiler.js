const Code = require('@hapi/code');
const Os = require('os');
const Lab = require('@hapi/lab');
const sinon = require('sinon');
const nodeSassFork = require('@bigcommerce/node-sass');
const dartSass = require('sass');
const Fiber = require('fibers');
const ScssCompiler = require("../lib/ScssCompiler");
const themeSettingsMock = require('./mocks/settings.json');

const lab = exports.lab = Lab.script();
const beforeEach = lab.beforeEach;
const describe = lab.experiment;
const expect = Code.expect;
const it = lab.it;

const osPath = path => Os.platform() === 'win32' ? path.replace(/\//g, '\\') : path;

describe('ScssCompiler', () => {
    const getRenderResultMock = () => ({
        css: 'a { color: blue; }',
    });
    const getPrimaryEngineStub = (errorMock = null, resultMock = getRenderResultMock()) => ({
        render: sinon.stub().yields(errorMock, resultMock),
        types: dartSass.types,
    });
    const getFallbackEngineStub = (errorMock = null, resultMock = getRenderResultMock()) => ({
        render: sinon.stub().yields(errorMock, resultMock),
        types: nodeSassFork.types,
    });
    let getLoggerStub = () => ({
        error: sinon.stub(),
    });
    const getCompilerFilesMock = () => ({
        [osPath('/mock/path1.scss')]: 'color: #fff',
        [osPath('/mock/path2.scss')]: 'color: #000',
        [osPath('/mock/path3.scss')]: 'color: #aaa',
    });
    const createScssCompiler = ({
        logger: passedLogger,
        engines: passedEngines = {},
    } = {}) => {
        const passedArgs = {
            logger: passedLogger || getLoggerStub(),
            engines: {
                primary: getPrimaryEngineStub(),
                fallback: getFallbackEngineStub(),
                ...passedEngines,
            },
        };
        return {
            passedArgs,
            scssCompiler: new ScssCompiler(passedArgs.logger, passedArgs.engines),
        };
    };

    describe('constructor', () => {
        it('should use default engines if they weren\'t passed through constructor', () => {
            const scssCompiler = new ScssCompiler(getLoggerStub());

            expect([...Object.keys(scssCompiler.engines)]).to.be.equal(['primary', 'fallback', 'active']);
            expect(scssCompiler.engines.primary).to.be.equal(dartSass);
            expect(scssCompiler.engines.fallback).to.be.equal(nodeSassFork);
        });

        it('should activate primary engine', () => {
            const { scssCompiler } = createScssCompiler();

            expect(scssCompiler.engines.active).to.be.equal(scssCompiler.engines.primary);
        });
    });

    describe('compile', () => {
        const getOptionsMock = () => {
            return {
                files: getCompilerFilesMock(),
                autoprefixerOptions: {},
                themeSetting: { ...themeSettingsMock },
            };
        };

        it('should throw an error when we try to reuse the instance for different compilations', async () => {
            const { scssCompiler } = createScssCompiler()

            const options = getOptionsMock();
            await scssCompiler.compile(options);

            await expect(scssCompiler.compile(options)).to.reject(Error, /already used/);
        });

        it('should reset this.files value based on options.files', async () => {
            const { scssCompiler } = createScssCompiler()
            scssCompiler.files = {};

            const options = getOptionsMock();
            await scssCompiler.compile(options);

            expect(scssCompiler.files).to.be.equal(options.files);
        });

        it('should reset this.files value with an empty object when options.files is empty', async () => {
            const { scssCompiler } = createScssCompiler()
            scssCompiler.files = {
                'a.scss': 'a { color: blue; }',
            };
            const options = getOptionsMock();
            delete options.files;

            await scssCompiler.compile(options);

            expect(scssCompiler.files).to.be.equal({});
        });

        it('should activate the primary engine on the first try', async () => {
            const { scssCompiler } = createScssCompiler()

            await scssCompiler.compile(getOptionsMock());

            expect(scssCompiler.engines.active).to.be.equal(scssCompiler.engines.primary);
        });

        it('should call the primary engine render with proper options on the first try', async () => {
            const { scssCompiler } = createScssCompiler()
            const compilerOptions = getOptionsMock();
            const expectedEngineOptions = {
                data: compilerOptions.data,
                outFile: compilerOptions.dest,
                files: compilerOptions.files,
                sourceMap: compilerOptions.sourceMap,
                sourceMapEmbed: compilerOptions.sourceMap,
                fiber: Fiber,
                functions: scssCompiler.getScssFunctions(compilerOptions.themeSettings),
                importer: scssCompiler.scssImporter.bind(scssCompiler),
            };

            await scssCompiler.compile(compilerOptions);

            expect(scssCompiler.engines.primary.render.calledOnce).to.equal(true);
            expect(scssCompiler.engines.primary.render.lastCall.args.length).to.equal(2);
            expect(scssCompiler.engines.primary.render.lastCall.args[0]).to.equal(expectedEngineOptions);
            expect(scssCompiler.engines.primary.render.lastCall.args[1]).to.be.a.function();
        });

        it('should return the compiled css from the primary engine when it finishes successfully', async () => {
            const { scssCompiler } = createScssCompiler()

            const result = await scssCompiler.compile(getOptionsMock());

            expect(result).to.equal(getRenderResultMock().css);
        });

        describe('when the primary engine fails', () => {
            it('should log the fail', async () => {
                const error = new Error('oops');
                const loggerStub = getLoggerStub();
                const { scssCompiler } = createScssCompiler({
                    logger: loggerStub,
                    engines: {
                        primary: getPrimaryEngineStub(error),
                    },
                })

                await scssCompiler.compile(getOptionsMock());

                expect(loggerStub.error.calledOnce).to.equal(true);
                expect(loggerStub.error.lastCall.args.length).to.equal(1);
                expect(loggerStub.error.lastCall.args[0]).to.contain(error.message);
            });

            it('should activate the fallback engine', async () => {
                const { scssCompiler } = createScssCompiler({
                    engines: {
                        primary: getPrimaryEngineStub(new Error('oops')),
                    },
                })

                await scssCompiler.compile(getOptionsMock());

                expect(scssCompiler.engines.active).to.be.equal(scssCompiler.engines.fallback);
            });

            it('should return the compiled css from the fallback engine when it finishes successfully', async () => {
                const renderResultMock = getRenderResultMock();
                const { scssCompiler } = createScssCompiler({
                    engines: {
                        primary: getPrimaryEngineStub(new Error('oops')),
                        fallback: getFallbackEngineStub(null, renderResultMock),
                    },
                });

                const compilationResult = await scssCompiler.compile(getOptionsMock());

                expect(compilationResult).to.equal(renderResultMock.css);
            });

            it('should pass on the thrown error from the fallback engine', async () => {
                const fallBackEngineError = new Error('Fallback Engine Error');
                const { scssCompiler } = createScssCompiler({
                    engines: {
                        primary: getPrimaryEngineStub(new Error('Primary Engine Error')),
                        fallback: getFallbackEngineStub(fallBackEngineError),
                    },
                });

                await expect(scssCompiler.compile(getOptionsMock())).to.reject(Error, fallBackEngineError.message);
            });
        });
    });

    describe('getScssFunctions', () => {
        it('should return an array with all required functions', () => {
            const { scssCompiler } = createScssCompiler()

            const result = scssCompiler.getScssFunctions(themeSettingsMock);

            expect(result).to.be.an.object();
            expect(Object.keys(result)).to.contain([
                'stencilNumber($name, $unit: px)',
                'stencilColor($name)',
                'stencilString($name)',
                'stencilImage($image, $size)',
                'stencilFontFamily($name)',
                'stencilFontWeight($name)',
            ]);
        });

        describe('stencilNumber', () => {
            let stencilNumber;
            let saasTypes;

            beforeEach(() => {
                const { scssCompiler } = createScssCompiler()
                stencilNumber = scssCompiler.getScssFunctions(themeSettingsMock)['stencilNumber($name, $unit: px)'];
                saasTypes = scssCompiler.engines.primary.types;
            });

            it('should return the expected for flat key', () => {
                const settingName = new saasTypes.String('google-font-size');
                const unit = new saasTypes.String('em');

                expect(stencilNumber(settingName, unit).getValue()).to.equal(14);
                expect(stencilNumber(settingName, unit).getUnit()).to.equal('em');
            });

            it('should return the expected for nested key', () => {
                const settingName = new saasTypes.String('global.h1.font-size.value');
                const unit = new saasTypes.String('rem');

                expect(stencilNumber(settingName, unit).getValue()).to.equal(16);
                expect(stencilNumber(settingName, unit).getUnit()).to.equal('rem');
            });

            it('should return 0 if passed a wrong setting name', () => {
                const settingName = new saasTypes.String('wrong-setting');
                const unit = new saasTypes.String('px');

                expect(stencilNumber(settingName, unit).getValue()).to.equal(0);
            });

            it('should return 0 if passed a wrong setting value', () => {
                const settingName = new saasTypes.String('google-font-wrong-size');
                const unit = new saasTypes.String('px');

                expect(stencilNumber(settingName, unit).getValue()).to.equal(0);
            });

            it('should return a Sass.types.Number', () => {
                const settingName = new saasTypes.String('google-font-size');
                const unit = new saasTypes.String('px');

                expect(stencilNumber(settingName, unit) instanceof saasTypes.Number).to.equal(true);
            });
        });

        describe('stencilImage', () => {
            let stencilImage;
            let saasTypes;

            beforeEach(() => {
                const { scssCompiler } = createScssCompiler()
                stencilImage = scssCompiler.getScssFunctions(themeSettingsMock)['stencilImage($image, $size)'];
                saasTypes = scssCompiler.engines.active.types;
            });

            it('should return the expected string value', () => {
                const image = new saasTypes.String('img-url');
                const size = new saasTypes.String('img-size');

                expect(stencilImage(image, size).getValue()).to.equal('stencil/1000x400/example.jpg');
            });

            it('should return null if passed an empty image url value', () => {
                const image = new saasTypes.String('img-url-empty');
                const size = new saasTypes.String('img-size');

                expect(stencilImage(image, size)).to.equal(saasTypes.Null.NULL);
            });

            it('should return null if passed a wrong image url value', () => {
                const image = new saasTypes.String('img-url-wrong--format');
                const size = new saasTypes.String('img-size');

                expect(stencilImage(image, size)).to.equal(saasTypes.Null.NULL);
            });

            it('should return null if passed a wrong image dimension value', () => {
                const image = new saasTypes.String('img-url');
                const size = new saasTypes.String('img-size-wrong--format');

                expect(stencilImage(image, size)).to.equal(saasTypes.Null.NULL);
            });

            it('should return a Sass.types.String', () => {
                const image = new saasTypes.String('img-url');
                const size = new saasTypes.String('img-size');

                expect(stencilImage(image, size) instanceof saasTypes.String).to.equal(true);
            });
        });
    });

    describe('scssImporter()', () => {
        let scssCompiler;

        beforeEach(() => {
            ({ scssCompiler } = createScssCompiler());
        });

        it('should return an error if files do not exist', () => {
            const result = scssCompiler.scssImporter('/path2', 'other/path1.scss');

            expect(result.constructor).to.equal(Error);
            expect(result.message).to.include("doesn't exist!");
        });

        it('should return an object with a file name and content', () => {
            const filesMock = getCompilerFilesMock();
            scssCompiler.files = filesMock;
            const result = scssCompiler.scssImporter(osPath('/path2'), osPath('/mock/path1.scss'));

            expect(result).to.be.an.object();
            expect(result).to.include({ file: osPath('/mock/path2.scss') });
            expect(result).to.include({ contents: filesMock[osPath('/mock/path2.scss')] });
        });

        it('should succeed when the extension is passed', () => {
            const filesMock = getCompilerFilesMock();
            scssCompiler.files = filesMock;
            const result = scssCompiler.scssImporter(osPath('/path2'), osPath('/mock/path1.scss'));

            expect(result).to.be.an.object();
            expect(result).to.include({ file: osPath('/mock/path2.scss') });
            expect(result).to.include({ contents: filesMock[osPath('/mock/path2.scss')] });
        });

        it('should succeed when ran from the root path (prev=stdin)', () => {
            scssCompiler.files = { "file1.scss": 'foo' };
            const result = scssCompiler.scssImporter('file1', 'stdin');

            expect(result).to.be.an.object();
            expect(result).to.include({ file: 'file1.scss' });
            expect(result).to.include({ contents: 'foo' });
        });

        it('should resolve full url', () => {
            scssCompiler.files[osPath('/foo/bar/file.scss')] = 'foo';
            scssCompiler.fullUrls[osPath('/foo/file.scss')] = [osPath('/a/prev.scss')];

            const result = scssCompiler.scssImporter(osPath('/bar/file.scss'), osPath('/a/prev.scss'));
            expect(result.file).to.equal(osPath('/foo/bar/file.scss'));
        });
    });

    describe('stencilFont()', () => {
        let scssCompiler;

        beforeEach(() => {
            ({ scssCompiler } = createScssCompiler());
            sinon.spy(scssCompiler, 'googleFontParser');
            sinon.spy(scssCompiler, 'defaultFontParser');
        });

        it('should call the Google font parser for Google fonts', () => {
            scssCompiler.stencilFont(themeSettingsMock['google-font'], 'family');

            expect(scssCompiler.googleFontParser.calledOnce).to.equal(true);
        });

        it('should call the default parser if provider is not detected', () => {
            scssCompiler.stencilFont(themeSettingsMock['native-font'], 'family');

            expect(scssCompiler.defaultFontParser.calledOnce).to.equal(true);
        });
    });

    describe('googleFontParser()', () => {
        const googleFont = 'Google_Open+Sans_400';
        let scssCompiler;

        beforeEach(() => {
            ({ scssCompiler } = createScssCompiler());
            sinon.spy(scssCompiler, 'defaultFontParser');
        });

        it('should remove the Google_ from the value and call defaultParser', () => {
            scssCompiler.googleFontParser(googleFont, 'family');

            expect(scssCompiler.defaultFontParser.calledWith('Open+Sans_400', 'family')).to.equal(true);
        });
    });

    describe('defaultFontParser()', () => {
        const nativeFont = 'Times New Roman_400';
        let scssCompiler;

        beforeEach(() => {
            ({ scssCompiler } = createScssCompiler());
        });

        it('should return the font family name', () => {
            const result = scssCompiler.defaultFontParser(nativeFont, 'family');

            expect(result.getValue()).to.equal('"Times New Roman"');
        });

        it('should return the font weight', () => {
            const result = scssCompiler.defaultFontParser(nativeFont, 'weight');

            expect(result.getValue()).to.equal('400');
        });

        it('should return the first font weight if multiple are defined', () => {
            const result = scssCompiler.defaultFontParser('Times New Roman_400,700,800', 'weight');

            expect(result.getValue()).to.equal('400');
        });

        it('should return a typeof Sass.NULL if family / weight is empty', () => {
            const result = scssCompiler.defaultFontParser(undefined, 'family');

            const saasTypes = scssCompiler.engines.active.types;
            expect(result).to.equal(saasTypes.Null.NULL);
        });
    });
});
