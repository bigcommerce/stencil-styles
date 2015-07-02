# Stencil Styles - Compiles SCSS On-The-Fly for the Stencil Framework

### Usage
*This is assuming you are using Glue and have added `stencil-styles` to your manifest file*

```javascript
server.plugins.StencilStyles.compile(compiler, {
    data: '', //Initial SCSS content,
    files: {}, //An object of all files needed to compile using key as the path name and val as the content
    dest: '', // `dest` option for SCSS
    themeSettings: {}, // Flat object of arbitrary settings that can be used by the stencil sass functions
    autoprefixerOptions: { // Autoprefixer Options
        cascade: true,
        browsers: ["> 5% in US"]
    }
}, function (err, css) {
    // `css` will be the compiled SCSS
});
```
