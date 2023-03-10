/**
 * @module context
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import util from './util.js';
import logger from './logger.js';
import config from './config.js';
import { Meta, LocalPage } from './models/index.js';

const MKDOCS_YML = 'mkdocs.yml';
const README_MD = 'README.md';
/**
 * Loads an parses the 'mkdocs.yml' file 
 * 
 * @param {string} basePath - the basepath to look for 'mkdocs.yml'
 * @returns {object} with nav, repo_url, site_name attributes
 */
function loadConfig(basePath) {
    const mkDocsFile = path.resolve(basePath, MKDOCS_YML);
    const yml = readFileSync(mkDocsFile, 'utf8');
    const json = YAML.parse(yml);
    const { nav, repo_url, site_name } = json;
    if (!Array.isArray(nav)) {
        throw new Error(`nav is missing from your ${MKDOCS_YML} file`);
    }
    if (typeof repo_url !== 'string' || repo_url.trim().length === 0) {
        throw new Error(`repo_url is missing from your ${MKDOCS_YML} file`);
    }

    return { nav, repo_url, site_name };
}

/**
 * Recursively traverses the `nav` object and adds `LocalPage`s to `pages` array
 *  
 * @param {string} repo_url - repo_url from 'mkdocs.yml'
 * @param {*} nav - nav object from 'mkdocs.yml'
 * @param {*} basePath - the basepath to resolve files
 * @param {Array<LocalPage>} pages 
 * @returns {Array<LocalPage>} The array with all pages from `nav`
 */
function traverse(repo_url, nav, basePath, pages = []) {
    nav.forEach((item) => {
        if (typeof item === 'string') {
            throw new Error(`No title for ${item}`);
        }
        const pageTitle = Object.keys(item)[0];
        const pagePath = Object.values(item)[0];
        if (Array.isArray(pagePath)) {
            traverse(repo_url, pagePath, basePath, pages);
        } else {
            const page = getPage(repo_url, pageTitle, path.resolve(basePath, 'docs', pagePath));
            if (page) {
                pages.push(page);
            }
        }
    });
    return pages;
}

/**
 * Creates `LocalPage` instances from the parameters
 * 
 * @param {string} repo_url - Repository url 
 * @param {string} title - Page title
 * @param {string} pagePath - Page path
 * @param {string} titlePrefix - Page title prefix
 * @returns {LocalPage} The page created from the parameters
 */
function getPage(repo_url, title, pagePath, titlePrefix = config.confluence.titlePrefix) {
    const safe = pagePath.startsWith(process.cwd());
    const exists = safe && existsSync(pagePath);
    const relPath = path.relative(process.cwd(), pagePath);
    if (!exists) {
        logger.warn(`Page "${title}" not found at "${relPath}"`);
        return;
    }
    const sha = util.fileHash(pagePath);
    const prefixedTitle = `${titlePrefix} ${title}`.trim();
    return new LocalPage(prefixedTitle, new Meta(repo_url, relPath, sha));
}

/**
 * Create a context object with all information needed for the sync 
 * 
 * @param {string} basePath - Base path to resolve files
 * @returns {object} The context object
 */
function getContext(basePath = '.') {
    const { nav, repo_url, site_name } = loadConfig(basePath);
    const pages = traverse(repo_url, nav, basePath);
    const readMe = getPage(repo_url, site_name, path.resolve(basePath, README_MD), '');
    const pageRefs = pages.reduce((obj, page) => {
        obj[page.meta.path] = page.title;
        return obj;
    }, readMe ? { [readMe.meta.path]: readMe.title } : {});
    const context = { siteName: site_name, repo: repo_url, pages, pageRefs };
    if (readMe) {
        context.readMe = readMe;
    }

    if (logger.isDebug()) {
        logger.debug(`Context:\n${JSON.stringify(context, null, 2)}`);
    }
    return context;
}

export default { getContext };
