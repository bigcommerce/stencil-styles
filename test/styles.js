'use strict';

var _ = require('lodash'),
    Code = require('code'),
    Lab = require('lab'),
    sinon = require('sinon'),
    Sass = require('node-sass'),
    StencilStyles = require('../lib/styles'),
    lab = exports.lab = Lab.script(),
    afterEach = lab.afterEach,
    beforeEach = lab.beforeEach,
    describe = lab.experiment,
    expect = Code.expect,
    it = lab.it,
    files,
    options,
    settings,
    stencilStyles;

describe('Stencil-Styles Plugin', function () {
    beforeEach(function(done) {
        settings = require('./mocks/settings.json');
        files = {
            '/mock/path1.scss': 'color: #fff',
            '/mock/path2.scss': 'color: #000'
        };
        options = {
            autoprefixerOptions: {},
            themeSettings: settings
        };
        stencilStyles = new StencilStyles(options);
        stencilStyles.files = files;

        done();
    });

    describe('constructor', function() {
        it('should set the fullUrls object to empty', function(done) {
            expect(stencilStyles.fullUrls).to.be.empty();

            done();
        });
    });

    describe('compileCss()', function() {
        var callback;

        beforeEach(function(done) {
            callback = sinon.spy();
            sinon.spy(stencilStyles, 'scssCompiler');

            stencilStyles.compileCss('scss', options, callback);

            done();
        });

        it('should call the scss compiler based on the compiler parameter', function(done) {
            expect(stencilStyles.scssCompiler.calledOnce).to.equal(true);

            done();
        });

        it('should call the callback passed in once compilation is complete', function(done) {
            expect(callback.calledOnce).to.equal(true);

            done();
        });

        afterEach(function(done) {
            stencilStyles.scssCompiler.restore();

            done();
        });
    });

    describe('scssFunctions', function() {
        it('should return an array with all required functions', function(done) {
            var result = stencilStyles.scssFunctions(settings);

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

        describe('stencilNumber', function() {
            var stencilNumber;

            beforeEach(function(done) {
                stencilNumber = stencilStyles.scssFunctions(settings)['stencilNumber($name, $unit: px)'];

                done();
            });

            it('should return the expected number and unit value', function(done) {
                var settingName = new Sass.types.String('google-font-size'),
                    unit = new Sass.types.String('em');

                expect(stencilNumber(settingName, unit).getValue()).to.equal(14);
                expect(stencilNumber(settingName, unit).getUnit()).to.equal('em');

                done();
            });

            it('should return 0 if passed a wrong setting name', function(done) {
                var settingName = new Sass.types.String('wrong-setting'),
                    unit = new Sass.types.String('px');

                expect(stencilNumber(settingName, unit).getValue()).to.equal(0);

                done();
            });

            it('should return 0 if passed a wrong setting value', function(done) {
                var settingName = new Sass.types.String('google-font-wrong-size'),
                    unit = new Sass.types.String('px');

                expect(stencilNumber(settingName, unit).getValue()).to.equal(0);

                done();
            });

            it('should return a Sass.types.Number', function(done) {
                var settingName = new Sass.types.String('google-font-size'),
                    unit = new Sass.types.String('px');

                expect(stencilNumber(settingName, unit) instanceof Sass.types.Number).to.equal(true);

                done();
            });
        });

        describe('stencilImage', function() {
            var stencilImage;

            beforeEach(function(done) {
                stencilImage = stencilStyles.scssFunctions(settings)['stencilImage($image, $size)'];

                done();
            });

            it('should return the expected string value', function(done) {
                var image = new Sass.types.String('img-url'),
                    size = new Sass.types.String('img-size');

                expect(stencilImage(image, size).getValue()).to.equal('stencil/1000x400/example.jpg');

                done();
            });

            it('should return null if passed an empty image url value', function(done) {
                var image = new Sass.types.String('img-url-empty'),
                    size = new Sass.types.String('img-size');

                expect(stencilImage(image, size)).to.equal(Sass.NULL);

                done();
            });

            it('should return null if passed a wrong image url value', function(done) {
                var image = new Sass.types.String('img-url-wrong--format'),
                    size = new Sass.types.String('img-size');

                expect(stencilImage(image, size)).to.equal(Sass.NULL);

                done();
            });

            it('should return null if passed a wrong image dimension value', function(done) {
                var image = new Sass.types.String('img-url'),
                    size = new Sass.types.String('img-size-wrong--format');

                expect(stencilImage(image, size)).to.equal(Sass.NULL);

                done();
            });

            it('should return a Sass.types.String', function(done) {
                var image = new Sass.types.String('img-url'),
                    size = new Sass.types.String('img-size');

                expect(stencilImage(image, size) instanceof Sass.types.String).to.equal(true);

                done();
            });
        });
    });

    describe('scssImporter()', function() {
        it('should return an error if files do not exist', function (done) {
            var result = stencilStyles.scssImporter('/path2', 'other/path1.scss');

            expect(result.constructor).to.equal(Error);
            expect(result.message).to.equal("other/path2.scss doesn't exist!");

            done();
        });

        it('should return an object with a file name and content', function (done) {
            var result = stencilStyles.scssImporter('/path2', '/mock/path1.scss');

            expect(result).to.be.an.object();
            expect(result).to.include({ file: '/mock/path2.scss' });
            expect(result).to.include({ contents: files['/mock/path2.scss'] });

            done();
        });
    });

    describe('stencilFont()', function() {
        beforeEach(function(done) {
            sinon.spy(stencilStyles, 'googleFontParser');
            sinon.spy(stencilStyles, 'defaultFontParser');

            done();
        });

        it('should call the Google font parser for Google fonts', function(done) {
            stencilStyles.stencilFont(settings['google-font'], 'family');

            expect(stencilStyles.googleFontParser.calledOnce).to.equal(true);

            done();
        });

        it('should call the default parser if provider is not detected', function(done) {
            stencilStyles.stencilFont(settings['native-font'], 'family');

            expect(stencilStyles.defaultFontParser.calledOnce).to.equal(true);

            done();
        });

        afterEach(function(done) {
            stencilStyles.googleFontParser.restore();
            stencilStyles.defaultFontParser.restore();

            done();
        });
    });

    describe('googleFontParser()', function() {
        beforeEach(function(done) {
            sinon.spy(stencilStyles, 'defaultFontParser');

            done();
        });

        var googleFont = 'Google_Open+Sans_400';

        it('should remove the Google_ from the value and call defaultParser', function(done) {
            stencilStyles.googleFontParser(googleFont, 'family');

            expect(stencilStyles.defaultFontParser.calledWith('Open+Sans_400', 'family')).to.equal(true);

            done();
        });

        afterEach(function(done) {
            stencilStyles.defaultFontParser.restore();

            done();
        });
    });

    describe('defaultFontParser()', function() {
        var nativeFont = 'Times New Roman_400';

        it('should return the font family name', function(done) {
            var result = stencilStyles.defaultFontParser(nativeFont, 'family');

            expect(result.getValue()).to.equal('"Times New Roman"');

            done();
        });

        it('should return the font weight', function(done) {
            var result = stencilStyles.defaultFontParser(nativeFont, 'weight');

            expect(result.getValue()).to.equal('400');

            done();
        });

        it('should return the first font weight if multiple are defined', function(done) {
            var result = stencilStyles.defaultFontParser('Times New Roman_400,700,800', 'weight');

            expect(result.getValue()).to.equal('400');

            done();
        });

        it('should return a typeof Sass.NULL if family / weight is empty', function(done) {
            var result = stencilStyles.defaultFontParser(undefined, 'family');

            expect(result instanceof Sass.types.Null).to.equal(true);

            done();
        });
    });
});
