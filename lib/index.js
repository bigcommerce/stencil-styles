var _ = require('lodash'),
    StencilStyles = require('index.module');

module.exports.register = function (server, options, next) {
    var stencilStyles = new StencilStyles();

    server.expose('compile', stencilStyles.compileCss);

    return next();
};

module.exports.register.attributes = {
    name: 'StencilStyles',
    version: '0.0.1'
};
