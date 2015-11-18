'use strict';

var _ = require('lodash'),
    Code = require('code'),
    Lab = require('lab'),
    sinon = require('sinon'),
    StencilStyles = require('../lib/index'),
    lab = exports.lab = Lab.script(),
    describe = lab.experiment,
    expect = Code.expect,
    it = lab.it;

describe('Stencil-Styles Plugin', function () {
    it('should pass a fake test', function(done) {
        expect(StencilStyles).to.equal(StencilStyles);

        done();
    });
});
