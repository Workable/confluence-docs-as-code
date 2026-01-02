/**
 * @module confluence-syncer
 */
import context from './context.js';
import config from './config.js';
import logger from './logger.js';
import ConfluenceSDK from './confluence-sdk.js';
import { Meta, LocalPage } from '../lib/models/index.js';
import AssetRenderer from './renderers/asset-renderer.js';

const confluence = new ConfluenceSDK(config.confluence);

/**
 * Sync local markdown documentation with Confluence
 * 
 * @returns {Promise<void>}
 */
async function sync() {
    try {
        const { siteName, repo, pages: localPages, readMe, pageRefs, sectionHierarchy } = context.getContext();
        const assetRenderer = new AssetRenderer(config, pageRefs);
        const home = await syncHome(repo, siteName, readMe, assetRenderer);
        await syncPages(home, localPages, sectionHierarchy, assetRenderer);
        const rootUrl = `${config.confluence.host}/wiki/spaces/${config.confluence.spaceKey}/pages/${home}`;
        logger.info(`"${siteName}" Documentation published at ${rootUrl}`);
        syncSummary(siteName, rootUrl);
    } catch (error) {
        errorHandler(error);
    }
}

/**
 * Write action summary
 * 
 * @param {string} siteName - The name of the documentation site
 * @param {string} url - The Confluence url of the published documentation
 */
function syncSummary(siteName, url) {
    logger.summary.addHeading(':books: Documentation published', 1)
        .addRaw('View the documentation using the following link')
        .addBreak().addRaw(':link: ')
        .addLink(siteName, url).addEOL()
        .write();
}

/**
 * Handles errors and fails the action
 *  
 * @param {Error} error - The Error that occurred
 */
function errorHandler(error) {
    if (logger.isDebug()) {
        const safeConfig = Object.assign({}, config);
        safeConfig.confluence.token = '***';
        logger.debug(`Config:\n${JSON.stringify(safeConfig, null, 2)}`);
        logger.debug(error.stack);
    }
    logger.fail(error);
}

/**
 * Create or update home page from README.md
 * 
 * @param {string} repo 
 * @param {string} siteName 
 * @param {LocalPage} localPage 
 * @param {AssetRenderer} renderer 
 * @returns {Promise<number>} Home page id
 */
async function syncHome(repo, siteName, localPage, renderer) {
    if (!localPage) {
        localPage = new LocalPage(siteName, new Meta(repo));
        localPage.html = `<h1>${siteName}</h1>`;
    }
    localPage.parentPageId = await findParentPage();
    let homePage = localPage;
    const remotePage = await confluence.findPage(siteName);
    if (remotePage) {
        homePage = remotePage;
        homePage.localPage = localPage;
        // check for potential repo conflict
        if (homePage.repoConflict()) {
            throw new Error(`Page "${siteName}" already exist for another repo "${homePage.meta.repo}"`);
        }
    }
    return homePage.sync(renderer, confluence).then(page => page.id);
}

/**
 * Find the `id` of the Confluence page Configured to be the parent for our documents
 * 
 * @returns {number} The `id` of the configured parent page
 * @throws `Error` if the configured parent page does not exist
 */
async function findParentPage() {
    const title = config.confluence.parentPage;
    if (!title) {
        return;
    }
    const parentPage = await confluence.findPage(title);
    if (!parentPage) {
        throw new Error(`The page configured as parent (${title}) does not exist in confluence`);
    }
    return parentPage.id;
}

/**
 * Sync Local pages with Confluence
 * 
 * @param {number} home - The id of the home page 
 * @param {Array<LocalPage>} localPages - Array of pages
 * @param {object} sectionHierarchy - Maps section names to their parent section names
 * @param {AssetRenderer} renderer - `AssetRenderer` instance 
 */
async function syncPages(home, localPages, sectionHierarchy, renderer) {
    // Map to track synced page IDs
    // For sections, we store the ID of the section's README or first page
    const syncedPages = new Map();
    syncedPages.set(null, home); // root level pages use home as parent
    
    // Group pages by their parent section name
    const pagesByParent = new Map();
    
    for (const page of localPages) {
        const parentKey = page.parentPath || null;
        if (!pagesByParent.has(parentKey)) {
            pagesByParent.set(parentKey, []);
        }
        pagesByParent.get(parentKey).push(page);
    }
    
    // Recursively sync pages level by level
    const processLevel = async (sectionName) => {
        const pages = pagesByParent.get(sectionName) || [];
        
        // Find the parent page ID for this section
        // If the section has a parent section, use the ID of that parent section's page
        // Otherwise, use the home page
        const parentSectionName = sectionHierarchy[sectionName] || null;
        const parentPageId = syncedPages.get(parentSectionName);
        
        // Get remote pages for this level
        const remotePages = await confluence.getChildPages(parentPageId);
        
        // If no local pages and no remote pages, nothing to do
        if (pages.length === 0 && remotePages.size === 0) return;
        
        const union = [];
        
        for (let localPage of pages) {
            localPage.parentPageId = parentPageId;
            const remotePage = remotePages.get(localPage.meta.path);
            if (!remotePage) {
                union.push(localPage);
                continue;
            }
            remotePages.delete(localPage.meta.path);
            remotePage.localPage = localPage;
            union.push(remotePage);
        }
        
        // Any remaining remote page not matching a local page should be deleted
        for (let remotePage of remotePages.values()) {
            union.push(remotePage);
        }
        
        // Sort pages to prioritize README.md (section placeholder) first
        union.sort((a, b) => {
            const aIsReadme = a.meta?.path?.endsWith('README.md') || false;
            const bIsReadme = b.meta?.path?.endsWith('README.md') || false;
            if (aIsReadme && !bIsReadme) return -1;
            if (!aIsReadme && bIsReadme) return 1;
            return 0;
        });
        
        // Sync all pages at this level
        for (let i = 0; i < union.length; i++) {
            const page = union[i];
            const syncedPage = await page.sync(renderer, confluence);
            
            // The first page (preferably README) represents the section
            // Store its ID so child sections can reference it
            // Don't overwrite the root level (null) which is set to home page ID
            if (i === 0 && sectionName !== null && syncedPage && syncedPage.id) {
                syncedPages.set(sectionName, syncedPage.id);
            }
        }
        
        // After syncing this section, find and process all child sections
        const childSections = [];
        for (let [childSection, parentOfChild] of Object.entries(sectionHierarchy)) {
            if (parentOfChild === sectionName) {
                childSections.push(childSection);
            }
        }
        
        for (let childSection of childSections) {
            await processLevel(childSection);
        }
    };
    
    // Start processing from root level (null = no parent section)
    await processLevel(null);
}

/**
 * 
 * @param {Iterable<RemotePage>} remotePages 
 */
async function unpublish(remotePages) {
    for (let page of remotePages) {
        await confluence.deletePage(page.id).then(() => {
            logger.debug(`Deleted Page: [${page.id}] ${page.title}`);
        });
    }
}

/**
 * Cleanup all pages from confluence
 * 
 * @returns {Promise<void>}
 */
async function cleanup() {
    const { siteName } = await context.getContext();
    try {
        const home = await confluence.findPage(siteName);
        if (!home) {
            logger.warn(`No page with title "${siteName}" found in confluence, nothing to clean here`);
            return;
        }
        const remotePages = await confluence.getChildPages(home.id);
        // Delete all children
        await unpublish(remotePages.values());
        // Delete home
        await unpublish([home]);
        cleanupSummary(siteName);
    } catch (error) {
        errorHandler(error);
    }
}

/**
 * Write action summary after cleanup
 * 
 * @param {string} siteName - The site name 
 */
function cleanupSummary(siteName) {
    logger.summary.addHeading(':broom: Cleanup', 1)
        .addRaw(`All confluence pages of "${siteName}" have been deleted`).addEOL()
        .write();
}

export { sync, cleanup };
