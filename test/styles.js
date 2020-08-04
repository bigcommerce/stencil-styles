'use strict';

const _ = require('lodash');
const Code = require('@hapi/code');
const Os = require('os');
const Lab = require('@hapi/lab');
const sinon = require('sinon');
const Sass = require('@bigcommerce/node-sass');
const StencilStyles = require('../lib/styles');
const lab = exports.lab = Lab.script();
const afterEach = lab.afterEach;
const beforeEach = lab.beforeEach;
const describe = lab.experiment;
const expect = Code.expect;
const it = lab.it;

describe('Stencil-Styles Plugin', () => {
    let files;
    let options;
    let themeSettings;
    let stencilStyles;

    function osPath(path) {
        return Os.platform() === 'win32' ? path.replace(/\//g, "\\") : path;
    }

    beforeEach(() => {
        themeSettings = require('./mocks/settings.json');
        files = {};

        files[osPath('/mock/path1.scss')] = 'color: #fff';
        files[osPath('/mock/path2.scss')] = 'color: #000';
        files[osPath('/mock/path3.scss')] = 'color: #aaa';

        options = {
            files,
            autoprefixerOptions: {},
            themeSettings,
        };
        stencilStyles = new StencilStyles();
    });

    describe('constructor', () => {
        it('should set the fullUrls object to empty', () => {
            expect(stencilStyles.fullUrls).to.be.empty();
        });
    });

    describe('autoPrefix', () => {
        // TODO: Uncomment when no longer supporting Node 6,7 or update
        // it('should add vendor prefixes to css rules', () => {
        //     const prefixedCss = stencilStyles.autoPrefix('a { transform: scale(0.5); }', {});
        //     expect(prefixedCss).to.contain(['-webkit-transform']);
        //     done()
        // });

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
            let callback;
            beforeEach(() => {
                callback = sinon.spy();
                sinon.spy(stencilStyles, 'scssCompiler');

                stencilStyles.compileCss('scss', options, callback);

            });

            it('should call the scss compiler based on the compiler parameter', () => {
                expect(stencilStyles.scssCompiler.calledOnce).to.equal(true);
            });

            it('should call the callback passed in once compilation is complete', () => {
                expect(callback.calledOnce).to.equal(true);
            });

            it('should return error if compilation fails', () => {
                expect(callback.calledOnce).to.equal(true);
            });

            afterEach(() => {
                stencilStyles.scssCompiler.restore();
            });
        });


        describe('when compilations fails', () => {
            beforeEach(() => {
                sinon.stub(Sass, 'render').throws("Error");
            });

            afterEach(() => {
                Sass.render.restore();
            });

            it('should call the scss compiler based on the compiler parameter', () => {
                stencilStyles.compileCss('scss', options, (err) => {
                    expect(err).to.be.an.instanceof(Error);
                });
            });
        });
    });

    describe('scssFunctions', () => {
        it('should return an array with all required functions', () => {
            const result = stencilStyles.scssFunctions(themeSettings);

            expect(result).to.be.an.object();
            expect(_.keys(result)).to.contain([
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

            beforeEach(() => {
                stencilNumber = stencilStyles.scssFunctions(themeSettings)['stencilNumber($name, $unit: px)'];
            });

            it('should return the expected for flat key', () => {
                const settingName = new Sass.types.String('google-font-size');
                const unit = new Sass.types.String('em');

                expect(stencilNumber(settingName, unit).getValue()).to.equal(14);
                expect(stencilNumber(settingName, unit).getUnit()).to.equal('em');
            });

            it('should return the expected for nested key', () => {
                const settingName = new Sass.types.String('global.h1.font-size.value');
                const unit = new Sass.types.String('rem');

                expect(stencilNumber(settingName, unit).getValue()).to.equal(16);
                expect(stencilNumber(settingName, unit).getUnit()).to.equal('rem');
            });

            it('should return 0 if passed a wrong setting name', () => {
                const settingName = new Sass.types.String('wrong-setting');
                const unit = new Sass.types.String('px');

                expect(stencilNumber(settingName, unit).getValue()).to.equal(0);
            });

            it('should return 0 if passed a wrong setting value', () => {
                const settingName = new Sass.types.String('google-font-wrong-size');
                const unit = new Sass.types.String('px');

                expect(stencilNumber(settingName, unit).getValue()).to.equal(0);
            });

            it('should return a Sass.types.Number', () => {
                const settingName = new Sass.types.String('google-font-size');
                const unit = new Sass.types.String('px');

                expect(stencilNumber(settingName, unit) instanceof Sass.types.Number).to.equal(true);
            });
        });

        describe('stencilImage', () => {
            let stencilImage;

            beforeEach(() => {
                stencilImage = stencilStyles.scssFunctions(themeSettings)['stencilImage($image, $size)'];
            });

            it('should return the expected string value', () => {
                const image = new Sass.types.String('img-url');
                const size = new Sass.types.String('img-size');

                expect(stencilImage(image, size).getValue()).to.equal('stencil/1000x400/example.jpg');
            });

            it('should return null if passed an empty image url value', () => {
                const image = new Sass.types.String('img-url-empty');
                const size = new Sass.types.String('img-size');

                expect(stencilImage(image, size)).to.equal(Sass.NULL);
            });

            it('should return null if passed a wrong image url value', () => {
                const image = new Sass.types.String('img-url-wrong--format');
                const size = new Sass.types.String('img-size');

                expect(stencilImage(image, size)).to.equal(Sass.NULL);
            });

            it('should return null if passed a wrong image dimension value', () => {
                const image = new Sass.types.String('img-url');
                const size = new Sass.types.String('img-size-wrong--format');

                expect(stencilImage(image, size)).to.equal(Sass.NULL);
            });

            it('should return a Sass.types.String', () => {
                const image = new Sass.types.String('img-url');
                const size = new Sass.types.String('img-size');

                expect(stencilImage(image, size) instanceof Sass.types.String).to.equal(true);
            });
        });
    });

    describe('scssImporter()', () => {
        it('should return an error if files do not exist', () => {
            const result = stencilStyles.scssImporter('/path2', 'other/path1.scss');

            expect(result.constructor).to.equal(Error);
            expect(result.message).to.include("doesn't exist!");
        });

        it('should return an object with a file name and content', () => {
            stencilStyles.files = options.files;
            const result = stencilStyles.scssImporter(osPath('/path2'), osPath('/mock/path1.scss'));

            expect(result).to.be.an.object();
            expect(result).to.include({ file: osPath('/mock/path2.scss') });
            expect(result).to.include({ contents: files[osPath('/mock/path2.scss')] });
        });

        it('should succeed when the extension is passed', () => {
            stencilStyles.files = options.files;
            const result = stencilStyles.scssImporter(osPath('/path2'), osPath('/mock/path1.scss'));

            expect(result).to.be.an.object();
            expect(result).to.include({ file: osPath('/mock/path2.scss') });
            expect(result).to.include({ contents: files[osPath('/mock/path2.scss')] });
        });

        it('should succeed when ran from the root path (prev=stdin)', () => {
            stencilStyles.files = { "file1.scss": 'foo' };
            const result = stencilStyles.scssImporter('file1', 'stdin');

            expect(result).to.be.an.object();
            expect(result).to.include({ file: 'file1.scss' });
            expect(result).to.include({ contents: 'foo' });
        });

        it('should resolve full url', () => {
            stencilStyles.files[osPath('/foo/bar/file.scss')] = 'foo';
            stencilStyles.fullUrls[osPath('/foo/file.scss')] = [osPath('/a/prev.scss')];

            const result = stencilStyles.scssImporter(osPath('/bar/file.scss'), osPath('/a/prev.scss'));
            expect(result.file).to.equal(osPath('/foo/bar/file.scss'));
        });
    });

    describe('stencilFont()', () => {
        beforeEach(() => {
            sinon.spy(stencilStyles, 'googleFontParser');
            sinon.spy(stencilStyles, 'defaultFontParser');
        });

        it('should call the Google font parser for Google fonts', () => {
            stencilStyles.stencilFont(themeSettings['google-font'], 'family');

            expect(stencilStyles.googleFontParser.calledOnce).to.equal(true);
        });

        it('should call the default parser if provider is not detected', () => {
            stencilStyles.stencilFont(themeSettings['native-font'], 'family');

            expect(stencilStyles.defaultFontParser.calledOnce).to.equal(true);
        });

        afterEach(() => {
            stencilStyles.googleFontParser.restore();
            stencilStyles.defaultFontParser.restore();
        });
    });

    describe('googleFontParser()', () => {
        beforeEach(() => {
            sinon.spy(stencilStyles, 'defaultFontParser');
        });

        const googleFont = 'Google_Open+Sans_400';

        it('should remove the Google_ from the value and call defaultParser', () => {
            stencilStyles.googleFontParser(googleFont, 'family');

            expect(stencilStyles.defaultFontParser.calledWith('Open+Sans_400', 'family')).to.equal(true);
        });

        afterEach(() => {
            stencilStyles.defaultFontParser.restore();
        });
    });

    describe('defaultFontParser()', () => {
        const nativeFont = 'Times New Roman_400';

        it('should return the font family name', () => {
            const result = stencilStyles.defaultFontParser(nativeFont, 'family');

            expect(result.getValue()).to.equal('"Times New Roman"');
        });

        it('should return the font weight', () => {
            const result = stencilStyles.defaultFontParser(nativeFont, 'weight');

            expect(result.getValue()).to.equal('400');
        });

        it('should return the first font weight if multiple are defined', () => {
            const result = stencilStyles.defaultFontParser('Times New Roman_400,700,800', 'weight');

            expect(result.getValue()).to.equal('400');
        });

        it('should return a typeof Sass.NULL if family / weight is empty', () => {
            const result = stencilStyles.defaultFontParser(undefined, 'family');

            expect(result instanceof Sass.types.Null).to.equal(true);
        });
    });
});
