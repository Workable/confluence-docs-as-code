import path from 'node:path';
import context from './context.js';
import config from './config.js';
import logger from './logger.js';
import ConfluenceSDK from './confluence-sdk.js';
import util from './util.js';
import md2html from './md2html.js';
import KrokiSDK from './kroki-sdk.js';

const confluence = new ConfluenceSDK(config.confluence);
const kroki = new KrokiSDK(config.kroki);

export async function sync() {
    try {
        const { siteName, repo, pages: localPages, readMe } = context.getContext();
        const pageRefs = { pages: util.keyBy(localPages.concat(readMe), 'path') };
        const home = await syncHome(repo, siteName, readMe, pageRefs);
        await syncPages(repo, home, localPages, pageRefs);
        const rootUrl = `${config.confluence.host}/wiki/spaces/${config.confluence.spaceKey}/pages/${home}`;
        logger.info(`"${siteName}" Documentation published at ${rootUrl}`);
    } catch (error) {
        errorHandler(error);
    }
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
    let attachments = { images: [], graphs: [] };
    if (readMe?.exists) {
        const { html, images, graphs } = md2html.render(path.resolve(readMe.path), pageRefs);
        homeHtml = html;
        attachments = { images, graphs };
    }
    const homeMeta = { repo, ...readMe };
    const homeTitle = siteName;
    const existingPage = await confluence.findPage(homeTitle);
    if (existingPage) {
        // check if repo matches
        if (existingPage.repo !== homeMeta.repo) {
            throw new Error(`Page "${homeTitle}" already exist for another repo "${existingPage.repo}"`);
        }
        if (existingPage.sha !== homeMeta.sha) {
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
        const { html, images, graphs } = md2html.render(path.resolve(page.path), pageRefs);
        const meta = { repo, path: page.path, sha: page.sha };
        const pageId = await confluence.createPage(page.title, html, root, meta);
        await createAttachments(pageId, { images, graphs });
        logger.debug(`Created Page: [${pageId}] ${page.title}`);
    }
}

async function update(localPages, repo, root, pageRefs) {
    for (let page of localPages) {
        const { html, images, graphs } = md2html.render(path.resolve(page.path), pageRefs);
        const meta = { repo, path: page.path, sha: page.sha };
        await createAttachments(page.id, { images, graphs });
        await confluence
            .updatePage(page.id, page.version, page.title, html, root, meta)
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

async function createAttachments(pageId, { images, graphs }) {
    await createImages(pageId, images);
    await createGraphs(pageId, graphs);
}

async function createImages(pageId, images) {
    for (const image of images) {
        await confluence.createAttachment(pageId, path.resolve(image));
        logger.debug(`Attached image "${image}" to page #${pageId}`);
    }
}

async function createGraphs(pageId, graphs) {
    for (const graph of graphs) {
        const png = await kroki.toPng(graph);
        if (!png) {
            logger.warn(`Graph "${graph}" for page #${pageId} could not be processed`);
            return;
        }

        await confluence.createAttachment(pageId, path.resolve(png));
        logger.debug(`Attached graph "${graph}" to page #${pageId}`);
    }
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
        } else if (localPage.sha !== remotePage.sha) {
            // exist wih different sha -> update
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
