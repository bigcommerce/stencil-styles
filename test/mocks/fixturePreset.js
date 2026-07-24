module.exports = {
    theme: {
        extend: {
            colors: {
                primary: '#123456',
                fixture: '#abcdef',
            },
        },
    },
    plugins: [require('./fixturePlugin')],
};
