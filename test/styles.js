'use strict';

const _ = require('lodash');
const Code = require('code');
const Lab = require('lab');
const sinon = require('sinon');
const Sass = require('node-sass');
const StencilStyles = require('../lib/styles');
const lab = exports.lab = Lab.script();
const afterEach = lab.afterEach;
const beforeEach = lab.beforeEach;
const describe = lab.experiment;
const expect = Code.expect;
const it = lab.it;

describe('Stencil-Styles Plugin', () => {
    var files;
    var options;
    var themeSettings;
    var stencilStyles;

    beforeEach(done => {
        themeSettings = require('./mocks/settings.json');
        files = {
            '/mock/path1.scss': 'color: #fff',
            '/mock/path2.scss': 'color: #000'
        };
        options = {
            files,
            autoprefixerOptions: {},
            themeSettings,
        };
        stencilStyles = new StencilStyles();

        done();
    });

    describe('constructor', () => {
        it('should set the fullUrls object to empty', done => {
            expect(stencilStyles.fullUrls).to.be.empty();

            done();
        });
    });

    describe('autoPrefix', () => {
        it('should add vendor prefixes to css rules', done => {
            const prefixedCss = stencilStyles.autoPrefix('a { transform: scale(0.5); }', {});
            expect(prefixedCss).to.contain(['-webkit-transform']);
            done();
        });

        it('should return an empty string if input is not a string', done => {
            expect(stencilStyles.autoPrefix(null)).to.be.equal('');
            expect(stencilStyles.autoPrefix({})).to.be.equal('');
            expect(stencilStyles.autoPrefix(undefined)).to.be.equal('');
            done();
        });

        it('should return the input string if not valid css', done => {
            const notCss = 'this is not css';
            expect(stencilStyles.autoPrefix(notCss)).to.be.equal(notCss);
            done();
        });
    });

    describe('compileCss()', () => {
        var callback;

        beforeEach(done => {
            callback = sinon.spy();
            sinon.spy(stencilStyles, 'scssCompiler');

            stencilStyles.compileCss('scss', options, callback);

            done();
        });

        it('should call the scss compiler based on the compiler parameter', done => {
            expect(stencilStyles.scssCompiler.calledOnce).to.equal(true);

            done();
        });

        it('should call the callback passed in once compilation is complete', done => {
            expect(callback.calledOnce).to.equal(true);

            done();
        });

        afterEach(done => {
            stencilStyles.scssCompiler.restore();

            done();
        });
    });

    describe('scssFunctions', () => {
        it('should return an array with all required functions', done => {
            var result = stencilStyles.scssFunctions(themeSettings);

            expect(result).to.be.an.object();
            expect(_.keys(result)).to.contain([
                'stencilNumber($name, $unit: px)',
                'stencilColor($name)',
                'stencilString($name)',
                'stencilImage($image, $size)',
                'stencilFontFamily($name)',
                'stencilFontWeight($name)'
            ]);

            done();
        });

        describe('stencilNumber', () => {
            var stencilNumber;

            beforeEach(done => {
                stencilNumber = stencilStyles.scssFunctions(themeSettings)['stencilNumber($name, $unit: px)'];

                done();
            });

            it('should return the expected number and unit value', done => {
                var settingName = new Sass.types.String('google-font-size'),
                    unit = new Sass.types.String('em');

                expect(stencilNumber(settingName, unit).getValue()).to.equal(14);
                expect(stencilNumber(settingName, unit).getUnit()).to.equal('em');

                done();
            });

            it('should return 0 if passed a wrong setting name', done => {
                var settingName = new Sass.types.String('wrong-setting'),
                    unit = new Sass.types.String('px');

                expect(stencilNumber(settingName, unit).getValue()).to.equal(0);

                done();
            });

            it('should return 0 if passed a wrong setting value', done => {
                var settingName = new Sass.types.String('google-font-wrong-size'),
                    unit = new Sass.types.String('px');

                expect(stencilNumber(settingName, unit).getValue()).to.equal(0);

                done();
            });

            it('should return a Sass.types.Number', done => {
                var settingName = new Sass.types.String('google-font-size'),
                    unit = new Sass.types.String('px');

                expect(stencilNumber(settingName, unit) instanceof Sass.types.Number).to.equal(true);

                done();
            });
        });

        describe('stencilImage', () => {
            var stencilImage;

            beforeEach(done => {
                stencilImage = stencilStyles.scssFunctions(themeSettings)['stencilImage($image, $size)'];

                done();
            });

            it('should return the expected string value', done => {
                var image = new Sass.types.String('img-url'),
                    size = new Sass.types.String('img-size');

                expect(stencilImage(image, size).getValue()).to.equal('stencil/1000x400/example.jpg');

                done();
            });

            it('should return null if passed an empty image url value', done => {
                var image = new Sass.types.String('img-url-empty'),
                    size = new Sass.types.String('img-size');

                expect(stencilImage(image, size)).to.equal(Sass.NULL);

                done();
            });

            it('should return null if passed a wrong image url value', done => {
                var image = new Sass.types.String('img-url-wrong--format'),
                    size = new Sass.types.String('img-size');

                expect(stencilImage(image, size)).to.equal(Sass.NULL);

                done();
            });

            it('should return null if passed a wrong image dimension value', done => {
                var image = new Sass.types.String('img-url'),
                    size = new Sass.types.String('img-size-wrong--format');

                expect(stencilImage(image, size)).to.equal(Sass.NULL);

                done();
            });

            it('should return a Sass.types.String', done => {
                var image = new Sass.types.String('img-url'),
                    size = new Sass.types.String('img-size');

                expect(stencilImage(image, size) instanceof Sass.types.String).to.equal(true);

                done();
            });
        });
    });

    describe('scssImporter()', () => {
        it('should return an error if files do not exist', done => {
            var result = stencilStyles.scssImporter('/path2', 'other/path1.scss');

            expect(result.constructor).to.equal(Error);
            expect(result.message).to.equal("other/path2.scss doesn't exist!");

            done();
        });

        it('should return an object with a file name and content', done => {
            stencilStyles.files = options.files;
            var result = stencilStyles.scssImporter('/path2', '/mock/path1.scss');

            expect(result).to.be.an.object();
            expect(result).to.include({ file: '/mock/path2.scss' });
            expect(result).to.include({ contents: files['/mock/path2.scss'] });

            done();
        });
    });

    describe('stencilFont()', () => {
        beforeEach(done => {
            sinon.spy(stencilStyles, 'googleFontParser');
            sinon.spy(stencilStyles, 'defaultFontParser');

            done();
        });

        it('should call the Google font parser for Google fonts', done => {
            stencilStyles.stencilFont(themeSettings['google-font'], 'family');

            expect(stencilStyles.googleFontParser.calledOnce).to.equal(true);

            done();
        });

        it('should call the default parser if provider is not detected', done => {
            stencilStyles.stencilFont(themeSettings['native-font'], 'family');

            expect(stencilStyles.defaultFontParser.calledOnce).to.equal(true);

            done();
        });

        afterEach(done => {
            stencilStyles.googleFontParser.restore();
            stencilStyles.defaultFontParser.restore();

            done();
        });
    });

    describe('googleFontParser()', () => {
        beforeEach(done => {
            sinon.spy(stencilStyles, 'defaultFontParser');

            done();
        });

        var googleFont = 'Google_Open+Sans_400';

        it('should remove the Google_ from the value and call defaultParser', done => {
            stencilStyles.googleFontParser(googleFont, 'family');

            expect(stencilStyles.defaultFontParser.calledWith('Open+Sans_400', 'family')).to.equal(true);

            done();
        });

        afterEach(done => {
            stencilStyles.defaultFontParser.restore();

            done();
        });
    });

    describe('defaultFontParser()', () => {
        var nativeFont = 'Times New Roman_400';

        it('should return the font family name', done => {
            var result = stencilStyles.defaultFontParser(nativeFont, 'family');

            expect(result.getValue()).to.equal('"Times New Roman"');

            done();
        });

        it('should return the font weight', done => {
            var result = stencilStyles.defaultFontParser(nativeFont, 'weight');

            expect(result.getValue()).to.equal('400');

            done();
        });

        it('should return the first font weight if multiple are defined', done => {
            var result = stencilStyles.defaultFontParser('Times New Roman_400,700,800', 'weight');

            expect(result.getValue()).to.equal('400');

            done();
        });

        it('should return a typeof Sass.NULL if family / weight is empty', done => {
            var result = stencilStyles.defaultFontParser(undefined, 'family');

            expect(result instanceof Sass.types.Null).to.equal(true);

            done();
        });
    });
});
