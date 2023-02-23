import path from 'node:path';
import context from './context.js';
import config from './config.js';
import logger from './logger.js';
import ConfluenceSDK from './confluence-sdk.js';
import util from './util.js';
import md2html from './md2html.js';
import { Image, Graph } from '../lib/models/index.js';
import GraphRenderer from './graph-renderer.js';

const confluence = new ConfluenceSDK(config.confluence);
const graphRenderer = new GraphRenderer(config);
const commonMeta = {
    git_ref: config.github.refName,
    git_sha: config.github.sha,
    publisher_version: config.version
};
const [majorVer, minorVer] = config.version.split('.');

export async function sync() {
    try {
        const { siteName, repo, pages: localPages, readMe } = context.getContext();
        const pageRefs = { pages: util.keyBy(localPages.concat(readMe), 'path') };
        const home = await syncHome(repo, siteName, readMe, pageRefs);
        await syncPages(repo, home, localPages, pageRefs);
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
    let homeHtml = `<h1>${siteName}</h1>`;
    let attachments = [];
    if (readMe?.exists) {
        const { html, attachments: _attachments } = md2html.render(readMe, pageRefs);
        homeHtml = html;
        attachments = _attachments;
    }
    const homeMeta = meta(repo, readMe);
    const homeTitle = siteName;
    const existingPage = await confluence.findPage(homeTitle);
    if (existingPage) {
        // check if repo matches
        if (existingPage.repo !== homeMeta.repo) {
            throw new Error(`Page "${homeTitle}" already exist for another repo "${existingPage.repo}"`);
        }
        if (config.confluence.forceUpdate || versionChange(existingPage) || existingPage.sha !== homeMeta.sha) {
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

async function syncPages(repo, home, localPages, pageRefs) {
    const filteredLocalPages = localPages.filter(page => page?.exists);
    // get children of home
    const remotePages = await confluence.getChildPages(home);
    // compute diff between remote and local pages
    const differences = diff(filteredLocalPages, remotePages);
    // delete removed pages
    await unpublish(differences.delete);
    // update changed pages
    await update(differences.update, repo, home, pageRefs);
    // create added pages
    await create(differences.create, repo, home, pageRefs);
}

async function create(localPages, repo, root, pageRefs) {
    for (let page of localPages) {
        const { html, attachments } = md2html.render(page, pageRefs);
        const pageId = await confluence.createPage(page.title, html, root, meta(repo, page));
        await createAttachments(pageId, attachments);
        logger.debug(`Created Page: [${pageId}] ${page.title}`);
    }
}

async function update(localPages, repo, root, pageRefs) {
    for (let page of localPages) {
        const { html, attachments } = md2html.render(page, pageRefs);
        await createAttachments(page.id, attachments);
        await confluence
            .updatePage(page.id, page.version, page.title, html, root, meta(repo, page))
            .then(() => {
                logger.debug(
                    `Updated Page: [${page.id}] ${page.title} v${page.version}`
                );
            });
    }
}

function meta(repo, page) {
    const _meta = { repo, ...commonMeta };
    if (page) {
        _meta.path = page.path;
        _meta.sha = page.sha;
    }
    return _meta;
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

    const remoteIndex = util.keyBy(remotePages, 'path');
    for (let localPage of localPages) {
        const remotePage = remoteIndex[localPage.path];
        if (!remotePage) {
            // not exist on remote -> create
            results.create.push(localPage);
        } else if (config.confluence.forceUpdate || versionChange(remotePage) || localPage.sha !== remotePage.sha) {
            // if forceUpdate or exist with different sha, then update the page
            localPage.id = remotePage.id;
            localPage.version = remotePage.version + 1;
            results.update.push(localPage);
        }
    }

    const localIndex = util.keyBy(localPages, 'path');
    for (let remotePage of remotePages) {
        if (!localIndex[remotePage.path]) {
            // exist on remote not on local -> delete
            results.delete.push(remotePage);
        }
    }

    return results;
}

function versionChange(remotePage) {
    if (typeof remotePage.publisher_version !== 'string') {
        return true;
    }
    const [pubMajor, pubMinor] = remotePage.publisher_version.split('.');
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
