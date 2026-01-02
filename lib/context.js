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
 * and builds a section hierarchy map
 *  
 * @param {string} repo_url - repo_url from 'mkdocs.yml'
 * @param {*} nav - nav object from 'mkdocs.yml'
 * @param {*} basePath - the basepath to resolve files
 * @param {Array<LocalPage>} pages 
 * @param {string|null} parentSection - the parent section name (null for root level)
 * @param {Map} sectionHierarchy - maps section names to their parent section names
 * @returns {Array<LocalPage>} The array with all pages from `nav`
 */
function traverse(repo_url, nav, basePath, pages = [], parentSection = null, sectionHierarchy = new Map()) {
    nav.forEach((item) => {
        if (typeof item === 'string') {
            throw new Error(`No title for ${item}`);
        }
        const pageTitle = Object.keys(item)[0];
        const pagePath = Object.values(item)[0];
        if (Array.isArray(pagePath)) {
            // This is a section with nested pages
            sectionHierarchy.set(pageTitle, parentSection);
            traverse(repo_url, pagePath, basePath, pages, pageTitle, sectionHierarchy);
        } else {
            const page = getPage(repo_url, pageTitle, path.resolve(basePath, 'docs', pagePath));
            if (page) {
                page.parentPath = parentSection;
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
    const sectionHierarchy = new Map();
    const pages = traverse(repo_url, nav, basePath, [], null, sectionHierarchy);
    const readMe = getPage(repo_url, site_name, path.resolve(basePath, README_MD), '');
    
    // Create README.md pages for sections
    const sectionPages = createSectionPages(repo_url, basePath, pages, sectionHierarchy);
    
    // Add section pages to the main pages array
    pages.push(...sectionPages);
    
    const pageRefs = pages.reduce((obj, page) => {
        obj[page.meta.path] = page.title;
        return obj;
    }, readMe ? { [readMe.meta.path]: readMe.title } : {});
    
    // Convert sectionHierarchy Map to plain object for JSON serialization
    const sectionHierarchyObj = Object.fromEntries(sectionHierarchy);
    
    const context = { siteName: site_name, repo: repo_url, pages, pageRefs, sectionHierarchy: sectionHierarchyObj };
    if (readMe) {
        context.readMe = readMe;
    }

    if (logger.isDebug()) {
        logger.debug(`Context:\n${JSON.stringify(context, null, 2)}`);
    }
    return context;
}

/**
 * Create pages for section README.md files
 * 
 * @param {string} repo_url - Repository URL
 * @param {string} basePath - Base path to resolve files
 * @param {Array<LocalPage>} pages - Array of pages
 * @param {Map} sectionHierarchy - Section hierarchy map
 * @returns {Array<LocalPage>} Array of section README pages
 */
function createSectionPages(repo_url, basePath, pages, sectionHierarchy) {
    const sectionPages = [];
    
    // For each section, try to find its README.md
    for (let [sectionName, parentSection] of sectionHierarchy.entries()) {
        // Find all pages that belong to this section
        const sectionChildren = pages.filter(p => p.parentPath === sectionName);
        
        if (sectionChildren.length === 0) continue;
        
        // Infer the section directory from children's paths
        const sectionDir = inferSectionDirectory(sectionChildren);
        
        if (sectionDir) {
            // Try to find README.md in this directory
            const readmePath = path.resolve(basePath, 'docs', sectionDir, 'README.md');
            const readmePage = getPage(repo_url, sectionName, readmePath, config.confluence.titlePrefix);
            
            if (readmePage) {
                readmePage.parentPath = parentSection;
                sectionPages.push(readmePage);
                logger.debug(`Created section page "${sectionName}" from ${sectionDir}/README.md`);
            }
        }
    }
    
    return sectionPages;
}

/**
 * Infer the common directory path from a section's children
 * 
 * @param {Array<LocalPage>} children - Array of child pages
 * @returns {string|null} Common directory path or null
 */
function inferSectionDirectory(children) {
    if (children.length === 0) return null;
    
    // Get relative paths of all children from their absolute paths
    const relativePaths = children.map(child => {
        const fullPath = child.meta.path;
        // Find 'docs/' in the path and get everything after it
        const docsIndex = fullPath.indexOf('/docs/');
        if (docsIndex === -1) return null;
        
        const afterDocs = fullPath.substring(docsIndex + 6); // +6 for '/docs/'
        // Get the directory part (remove filename)
        return path.dirname(afterDocs);
    }).filter(p => p !== null);
    
    if (relativePaths.length === 0) return null;
    
    // Find common prefix directory
    const firstPath = relativePaths[0];
    
    // If all paths are the same, return that path
    if (relativePaths.every(p => p === firstPath)) {
        return firstPath;
    }
    
    // Find longest common prefix
    const parts = firstPath.split(path.sep);
    
    for (let len = parts.length; len > 0; len--) {
        const prefix = parts.slice(0, len).join(path.sep);
        const allMatch = relativePaths.every(p => p.startsWith(prefix));
        
        if (allMatch) {
            return prefix;
        }
    }
    
    return null;
}

export default { getContext };
