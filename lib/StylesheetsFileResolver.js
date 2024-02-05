const fs = require('fs');
const path = require('path');

const cheerio = require('cheerio');
const recursiveReadDir = require('recursive-readdir');

const STYLESHEET_REGEXP = /{{\s*stylesheet\s*([\/a-zA-Z'"\.-]+)\s*}}/gi;

class StylesheetsFileResolver {
    constructor(themePath) {
        this.themePath = themePath;
    }

    async get() {
        const templatesPath = path.join(this.themePath, 'templates');
        const files = await recursiveReadDir(templatesPath);
        const cssFiles = [];
        for await (const file of files) {
            const content = await fs.promises.readFile(file, { encoding: 'utf-8' });
            const result = content.matchAll(STYLESHEET_REGEXP);
            if (result) {
                for (const item of result) {
                    // remove quotes
                    const filePath = item[1].slice(1, -1);
                    const fileName = this.tryToResolveCssFileLocation(filePath);
                    if (
                        fileName &&
                        !this.isStyleSheetAComment(content, filePath) &&
                        !cssFiles.includes(fileName)
                    ) {
                        cssFiles.push(fileName);
                    }
                }
            }
        }

        return cssFiles;
    }

    isStyleSheetAComment(content, cssFilePath) {
        const $ = cheerio.load(content);
        const comments = $('*')
            .contents()
            .filter(function () {
                // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType#node.comment_node
                return this.nodeType === 8;
            });
        for (const comment of comments) {
            const { data } = comment;
            if (data && data.includes('stylesheet') && data.includes(cssFilePath)) {
                return true;
            }
        }

        return false;
    }

    // returns relative path starting from root scss/css folder
    tryToResolveCssFileLocation(filePath) {
        const possibleLocations = [
            filePath,
            filePath.replace('/css/', '/scss/'),
            filePath.replace('/scss/', '/css/'),
            filePath.replace('/css/', '/scss/').replace('.css', '.scss'),
            filePath.replace('/scss/', '/css/').replace('.scss', '.css'),
        ];

        for (const location of possibleLocations) {
            const fullFilePath = path.join(this.themePath, location);
            if (fs.existsSync(fullFilePath)) {
                if (fullFilePath.endsWith('.css') || this.isVendorFile(location)) {
                    return null;
                }
                if (!this.isRootCssFile(location)) {
                    return this.getCssFileWithoutRootFolder(location);
                }
                const fileParts = path.parse(fullFilePath);
                return fileParts.name;
            }
        }

        console.log(`Couldn't validate scss compilation for this file path: ${filePath}`.yellow);
        return null;
    }

    // looks like some users decided to convert vendor files to scss and make changes there
    isVendorFile(filePath) {
        return filePath.includes('vendor');
    }

    // root folders are /assets/css /assets/scss
    // so after split, there can be 3 or 4 elements in the array (depending if the leading slash is present)
    isRootCssFile(location) {
        return location.split('/').length <= 4;
    }

    getCssFileWithoutRootFolder(location) {
        const locationParts = location.split('/');
        if (locationParts[0] === '') {
            locationParts.shift();
        }
        locationParts.shift();
        locationParts.shift();

        return locationParts.join('/');
    }
  
}

module.exports = StylesheetsFileResolver;