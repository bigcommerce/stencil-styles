# Stencil Styles
## Compiles SCSS On-The-Fly for the Stencil Framework

### Usage
*This is assuming you are using Glue and have added `stencil-styles` to your manifest file*

```javascript
const StencilStyles = require('@bigcommerce/stencil-styles');

const stencilStyles = new StencilStyles;

stencilStyles.compile(compiler, {
    data: '', //Initial SCSS content,
    files: {}, //An object of all files needed to compile using key as the path name and val as the content
    dest: '', // `dest` option for SCSS
    themeSettings: {}, // Flat object of arbitrary settings that can be used by the stencil sass functions
    autoprefixerOptions: { // Autoprefixer Options
        cascade: true,
        browsers: ["> 5% in US"]
    }
}, (err, css) => {
    // `css` will be the compiled SCSS
});
```

#### License

Copyright (c) 2015-present, Bigcommerce Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the distribution.
3. All advertising materials mentioning features or use of this software
   must display the following acknowledgement:
   This product includes software developed by Bigcommerce Inc.
4. Neither the name of Bigcommerce Inc. nor the
   names of its contributors may be used to endorse or promote products
   derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY BIGCOMMERCE INC ''AS IS'' AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL BIGCOMMERCE INC BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
