import path from 'node:path';
import context from './context.js';
import config from './config.js';
import logger from './logger.js';
import ConfluenceSDK from './confluence-sdk.js';
import md2html from './md2html.js';
import { Image, Graph, Meta } from '../lib/models/index.js';
import GraphRenderer from './graph-renderer.js';

const confluence = new ConfluenceSDK(config.confluence);
const graphRenderer = new GraphRenderer(config);
const [majorVer, minorVer] = config.version.split('.');

export async function sync() {
    try {
        const { siteName, repo, pages: localPages, readMe, pageRefs } = context.getContext();
        const home = await syncHome(repo, siteName, readMe, pageRefs);
        await syncPages(home, localPages, pageRefs);
        const rootUrl = `${config.confluence.host}/wiki/spaces/${config.confluence.spaceKey}/pages/${home}`;
        logger.info(`"${siteName}" Documentation published at ${rootUrl}`);
        syncSummary(siteName, rootUrl);
    } catch (error) {
        errorHandler(error);
    }
}

function syncSummary(siteName, url) {
    logger.summary.addHeading(':books: Documentation published', 1)
        .addRaw('View the documentation using the following link')
        .addBreak().addRaw(':link: ')
        .addLink(siteName, url).addEOL()
        .write();
}

function errorHandler(error) {
    if (logger.isDebug()) {
        const safeConfig = Object.assign({}, config);
        safeConfig.confluence.token = '***';
        logger.debug(`Config:\n${JSON.stringify(safeConfig, null, 2)}`);
        logger.debug(error.stack);
    }
    logger.fail(error);
}

async function syncHome(repo, siteName, readMe, pageRefs) {
    const parentPage = await findParentPage();
    const homeTitle = siteName;
    let homeHtml = `<h1>${siteName}</h1>`;
    let attachments = [];
    let homeMeta = new Meta(repo);
    if (readMe) {
        homeMeta = readMe.meta;
        const { html, attachments: _attachments } = md2html.render(readMe, pageRefs);
        homeHtml = html;
        attachments = _attachments;
    }
    const existingPage = await confluence.findPage(homeTitle);
    if (existingPage) {
        // check if repo matches
        if (existingPage.meta.repo !== homeMeta.repo) {
            throw new Error(`Page "${homeTitle}" already exist for another repo "${existingPage.meta.repo}"`);
        }
        if (config.confluence.forceUpdate || versionChange(existingPage) || existingPage.meta.sha !== homeMeta.sha) {
            await confluence.updatePage(existingPage.id, existingPage.version + 1, homeTitle, homeHtml, parentPage, homeMeta);
            await createAttachments(existingPage.id, attachments);
        }
        return existingPage.id;
    } else {
        const pageId = await confluence.createPage(homeTitle, homeHtml, parentPage, homeMeta);
        await createAttachments(pageId, attachments);
        return pageId;
    }
}

async function findParentPage() {
    const title = config.confluence.parentPage;
    let parentPage = null;
    if (title) {
        parentPage = await confluence.findPage(title);
        if (!parentPage) {
            throw new Error(`The page configured as parent (${title}) does not exist in confluence`);
        }
    }
    return parentPage?.id;
}

async function syncPages(home, localPages, pageRefs) {
    // get children of home
    const remotePages = await confluence.getChildPages(home);
    // compute diff between remote and local pages
    const differences = diff(localPages, remotePages);
    // delete removed pages
    await unpublish(differences.delete);
    // update changed pages
    await update(differences.update, home, pageRefs);
    // create added pages
    await create(differences.create, home, pageRefs);
}

async function create(localPages, root, pageRefs) {
    for (let page of localPages) {
        const { html, attachments } = md2html.render(page, pageRefs);
        const pageId = await confluence.createPage(page.title, html, root, page.meta);
        await createAttachments(pageId, attachments);
        logger.debug(`Created Page: [${pageId}] ${page.title}`);
    }
}

async function update(localPages, root, pageRefs) {
    for (let page of localPages) {
        const { html, attachments } = md2html.render(page, pageRefs);
        await createAttachments(page.id, attachments);
        await confluence
            .updatePage(page.id, page.version, page.title, html, root, page.meta)
            .then(() => {
                logger.debug(
                    `Updated Page: [${page.id}] ${page.title} v${page.version}`
                );
            });
    }
}

async function unpublish(remotePages) {
    for (let page of remotePages) {
        await confluence.deletePage(page.id).then(() => {
            logger.debug(`Deleted Page: [${page.id}] ${page.title}`);
        });
    }
}

async function createAttachments(pageId, attachments) {
    for (const attachment of attachments) {
        if (attachment instanceof Image) {
            await createImage(pageId, attachment);
        } else if (attachment instanceof Graph) {
            await createGraph(pageId, attachment);
        }
    }
}

async function createImage(pageId, image) {
    await confluence.createAttachment(pageId, path.resolve(image.path));
    logger.debug(`Attached image "${image.path}" to page #${pageId}`);
}

async function createGraph(pageId, graph) {
    const attachment = await graphRenderer.render(graph);
    if (!attachment) {
        logger.warn(`Graph "${graph.path}" for page #${pageId} could not be processed`);
        return;
    }
    await confluence.createAttachment(pageId, path.resolve(attachment));
    logger.debug(`Attached ${graph.type} graph "${graph.path}" to page #${pageId}`);
}

function diff(localPages, remotePages) {
    const results = {
        create: [],
        update: [],
        delete: []
    };

    for (let localPage of localPages) {
        const remotePage = remotePages.get(localPage.meta.path);
        if (!remotePage) {
            // not exist on remote -> create
            results.create.push(localPage);
        } else {
            remotePages.delete(localPage.meta.path);
            // if forceUpdate or exist with different sha, then update the page
            if (config.confluence.forceUpdate || versionChange(remotePage) || localPage.meta.sha !== remotePage.meta.sha) {
                localPage.id = remotePage.id;
                localPage.version = remotePage.version + 1;
                results.update.push(localPage);
            }
        }
    }

    // Any remaining remote page not matching a local page should be deleted
    for (let remotePage of remotePages.values()) {
        results.delete.push(remotePage);
    }

    return results;
}

function versionChange(remotePage) {
    if (typeof remotePage.meta.publisher_version !== 'string') {
        return true;
    }
    const [pubMajor, pubMinor] = remotePage.meta.publisher_version.split('.');
    return pubMajor !== majorVer || pubMinor !== minorVer;
}


export async function cleanup() {
    const { siteName } = await context.getContext();
    try {
        const home = await confluence.findPage(siteName);
        if (!home) {
            logger.warn(`No page with title "${siteName}" found in confluence, nothing to clean here`);
            return;
        }
        const remotePages = await confluence.getChildPages(home.id);
        // Delete all children
        await unpublish(remotePages);
        // Delete home
        await unpublish([home]);
        cleanupSummary(siteName);
    } catch (error) {
        errorHandler(error);
    }
}

function cleanupSummary(siteName) {
    logger.summary.addHeading(':broom: Cleanup', 1)
        .addRaw(`All confluence pages of "${siteName}" have been deleted`).addEOL()
        .write();
}
