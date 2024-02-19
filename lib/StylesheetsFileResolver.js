const fs = require('fs');
const path = require('path');

const cheerio = require('cheerio');
const recursiveReadDir = require('recursive-readdir');

const STYLESHEET_REGEXP = /{{\s*stylesheet\s*([\/a-zA-Z'"\.-]+)\s*/gi;

class StylesheetsFileResolver {
    constructor(themePath) {
        this.themePath = themePath;
        this.alreadyExlcudedComments = [];
    }

    async get() {
        const templatesPath = path.join(this.themePath, 'templates');
        const files = await recursiveReadDir(templatesPath);
        const cssFiles = [];
        for await (const file of files) {
            const content = await fs.promises.readFile(file, { encoding: 'utf-8' });
            const currentCssFiles = this.getStylesheets(content);
            cssFiles.push(...currentCssFiles);
        }

        return this.filter(cssFiles);
    }

    filter(cssFiles) {
        return cssFiles.filter((item, index) => {
            return cssFiles.indexOf(item) === index && item !== null;
        });
    }

    extractFileNameFromMatchedResult(item) {
        // remove quotes
        const filePath = item[1].slice(1, -1);
        const fileName = this.tryToResolveCssFileLocation(filePath);
        return  fileName;
    }

    getStylesheets(content) {
        const self = this;
        const stylesheets = [];
        const $ = cheerio.load(content);
        // ignore non-text nodes (like comments, etc.)
        const stylesheetTexts = $('*')
            .contents()
            .filter(function () {
                return this.type === "text" && this.data && this.data.includes('stylesheet');
            })
            .map(function() {
                return $(this).text();
            });
        // extract stylesheet paths from the text nodes and add them to the array
        for (const node of stylesheetTexts) {
            const result = node.matchAll(STYLESHEET_REGEXP);
            if (result) {
                for (const item of result) {
                    const extracted = self.extractFileNameFromMatchedResult(item);
                    stylesheets.push(extracted);
                }
            }
        }
        return stylesheets;
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
                if (fullFilePath.endsWith('.css')) {
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