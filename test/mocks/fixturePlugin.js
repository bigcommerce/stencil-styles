const plugin = require('tailwindcss/plugin');

module.exports = plugin(({ addUtilities }) => {
    addUtilities({
        '.scrollbar-none': { 'scrollbar-width': 'none' },
    });
});
