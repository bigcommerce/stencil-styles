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
        options = { themeSettings: settings };
        stencilStyles = new StencilStyles();

        done();
    });

    it('should pass a fake test', function(done) {
        expect(StencilStyles).to.equal(StencilStyles);

        done();
    });

    describe('compileCss()', function() {
        it('should call the scss compiler based on the compiler parameter', function(done) {
            // TODO: Add test logic

            done();
        });
    });

    describe('stencilFont()', function() {
        beforeEach(function(done) {
            sinon.spy(stencilStyles, 'googleFontParser');

            done();
        });

        it('should call the Google font parser for Google fonts', function(done) {
            stencilStyles.stencilFont(options, 'google-font', 'family');

            expect(stencilStyles.googleFontParser.calledOnce).to.equal(true);

            done();
        });

        it('should return Sass.NULL if the provider is not supported', function(done) {
            expect(stencilStyles.stencilFont(options, 'bad-font', 'family')).to.equal(Sass.NULL);

            done();
        });

        afterEach(function(done) {
            stencilStyles.googleFontParser.restore();

            done();
        });
    });
});
