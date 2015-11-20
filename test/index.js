'use strict';

var _ = require('lodash'),
    Code = require('code'),
    Lab = require('lab'),
    sinon = require('sinon'),
    Sass = require('node-sass'),
    StencilStyles = require('../lib/index.module'),
    lab = exports.lab = Lab.script(),
    afterEach = lab.afterEach,
    beforeEach = lab.beforeEach,
    describe = lab.experiment,
    expect = Code.expect,
    it = lab.it,
    options,
    settings,
    stencilStyles;

describe('Stencil-Styles Plugin', function () {
    beforeEach(function(done) {
        settings = require('./mocks/settings.json');
        options = {
            autoprefixerOptions: {},
            files: {
                '/mock/path1.scss': 'color: #fff',
                '/mock/path2.scss': 'color: #000'
            },
            themeSettings: settings
        };
        stencilStyles = new StencilStyles(options);

        done();
    });

    describe('constructor', function() {
        it('should set the fullUrls object to empty', function(done) {
            expect(stencilStyles.fullUrls).to.be.empty();

            done();
        });

        it('should set the options object with defaults', function(done) {
            expect(stencilStyles.options).to.not.be.empty();

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
                'stencilFontFamily($name)',
                'stencilFontWeight($name)'
            ]);

            done();
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
            expect(result).to.include({ contents: options.files['/mock/path2.scss'] });

            done();
        });
    });

    describe('stencilFont()', function() {
        beforeEach(function(done) {
            sinon.spy(stencilStyles, 'googleFontParser');

            done();
        });

        it('should call the Google font parser for Google fonts', function(done) {
            stencilStyles.stencilFont(settings['google-font'], 'family');

            expect(stencilStyles.googleFontParser.calledOnce).to.equal(true);

            done();
        });

        it('should return Sass.NULL if the provider is not supported', function(done) {
            expect(stencilStyles.stencilFont(settings['bad-font'], 'family')).to.equal(Sass.NULL);

            done();
        });

        afterEach(function(done) {
            stencilStyles.googleFontParser.restore();

            done();
        });
    });
});
