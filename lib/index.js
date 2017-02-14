const StencilStyles = require('./styles');

module.exports = StencilStyles;

module.exports.register = function (server, options, next) {
    var stencilStyles = new StencilStyles();

    server.expose('compile', stencilStyles.compileCss);

    return next();
};

module.exports.register.attributes = {
    name: 'StencilStyles',
    version: '0.0.1',
};
