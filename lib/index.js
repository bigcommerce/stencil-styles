var _ = require('lodash'),
    StencilStyles = require('./styles');

module.exports.register = function (server, options, next) {
    var stencilStyles = new StencilStyles(options);

    server.expose('compile', stencilStyles.compileCss);

    return next();
};

module.exports.register.attributes = {
    name: 'StencilStyles',
    version: '0.0.1'
};
