// Decoy: if the pipeline ever honors a theme's own Tailwind config, the
// boobytrap color below starts compiling and the spec fails.
module.exports = {
    theme: {
        extend: {
            colors: {
                boobytrap: '#bad bad',
            },
        },
    },
};
