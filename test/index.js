'use strict';

var _ = require('lodash'),
    Code = require('code'),
    Lab = require('lab'),
    sinon = require('sinon'),
    StencilStyles = require('../lib/index.module'),
    lab = exports.lab = Lab.script(),
    describe = lab.experiment,
    expect = Code.expect,
    it = lab.it;

describe('Stencil-Styles Plugin', function () {
    it('should pass a fake test', function(done) {
        expect(StencilStyles).to.equal(StencilStyles);

        done();
    });

    describe('compileCss()', function() {
        it('should call the scss compiler based on the compiler parameter', function(done) {
            console.log(StencilStyles);
        });
    });
});
