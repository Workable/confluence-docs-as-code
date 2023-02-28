import qs from 'node:querystring';
import fs from 'node:fs';
import axios from 'axios';
import FormData from 'form-data';
import { RequestError } from './confluence-sdk-errors.js';
import util from './util.js';
import logger from './logger.js';
import retryPolicy from './retry-policy.js';
import { Meta, RemotePage } from './models/index.js';

const CONTENT_PATH = '/wiki/rest/api/content';
const EXPAND_PROPERTIES = [
    'version',
    'metadata.properties.repo',
    'metadata.properties.path',
    'metadata.properties.sha',
    'metadata.properties.git_ref',
    'metadata.properties.git_sha',
    'metadata.properties.publisher_version'
].join(',');

/**
 * An SDK to access the Confluence API
 * 
 * @see {@link https://developer.atlassian.com/cloud/confluence/rest/v1/intro/}
 */
export default class ConfluenceSdk {
    constructor({ host, user, token, spaceKey, pageLimit }) {
        util.validateType('host', host, 'string');
        this.host = host;

        util.validateType('spaceKey', spaceKey, 'string');
        this.spaceKey = spaceKey;

        util.validateType('user', user, 'string');
        util.validateType('token', token, 'string');
        this.authHeader =
            'Basic ' + Buffer.from(`${user}:${token}`).toString('base64');
        this.pageLimit = pageLimit;
        this.api = axios.create({
            validateStatus: (status) => status < 500,
            baseURL: `${host}`,
            headers: {
                'Authorization': this.authHeader,
                'Accept': 'application/json'
            }
        });
        // Add retry policy
        retryPolicy(this.api);
    }

    /**
     * Return the children of a Confluence page
     * 
     * @param {number} parentPageId - The `id` of the Confluence page
     * @returns {Map<string,RemotePage>} A `Map` of `RemotePages` indexed by their `path`
     */
    async getChildPages(parentPageId) {
        util.validateType('parentPage', parentPageId, 'number');
        const query = qs.stringify({
            expand: EXPAND_PROPERTIES,
            start: 0,
            limit: this.pageLimit
        });
        const pages = new Map();
        let nextUri = `${CONTENT_PATH}/${parentPageId}/child/page?${query}`;

        while (nextUri) {
            const response = await this.api.get(nextUri);
            const data = this.validateResponse(response);
            if (data.size === 0) {
                break;
            }
            data.results.forEach((pageData) => {
                const page = this.remotePage(pageData, parentPageId);
                pages.set(page.meta.path, page);
            });
            nextUri = data._links?.next ? data._links.context + data._links.next : null;
        }

        return pages;
    }

    async _getCurrentUser() {
        if (!this.currentUser) {
            const response = await this.api.get(
                '/wiki/rest/api/user/current'
            );
            const { type, accountId, accountType } = this.validateResponse(response);
            this.currentUser = { type, accountId, accountType };
        }
        return this.currentUser;
    }
    /**
     * Find page by title
     * 
     * @param {string} title - The page title to find
     * @returns {RemotePage|undefined} The remote page or `undefined` if not found
     */
    async findPage(title) {
        util.validateType('title', title, 'string');
        const query = qs.stringify({
            title,
            type: 'page',
            spaceKey: this.spaceKey,
            expand: EXPAND_PROPERTIES
        });
        // find the page
        const response = await this.api.get(
            `${CONTENT_PATH}?${query}`
        );

        const data = this.validateResponse(response);

        if (data.size === 0) {
            return;
        }

        // return page info
        const page = data.results[0];
        return this.remotePage(page);
    }

    /**
     * 
     * @param {object} page - Confluence page data
     * @param {number} parentId - The `id` of the parent of `page`
     * @returns {RemotePage} A `RemotePage` instance created from the `page` data
     */
    remotePage(page, parentId) {
        return new RemotePage(
            Number.parseInt(page.id, 10),
            page.version.number,
            page.title,
            this.pageMeta(page),
            parentId
        );
    }

    /**
     * 
     * @param {object} page - Confluence page data
     * @returns {Meta} A `Meta` instance created from the `page.metadata`
     */
    pageMeta(page) {
        const meta = page.metadata?.properties;
        return new Meta(
            meta?.repo?.value,
            meta?.path?.value,
            meta?.sha?.value,
            meta?.git_ref?.value,
            meta?.git_sha?.value,
            meta?.publisher_version?.value
        );
    }

    /**
     * Create a `LocalPage` in Confluence
     * 
     * @typedef {import('../lib/models/local-page.js').default} LocalPage 
     * @param {LocalPage} page - The local page to create in Confluence 
     * @returns {RemotePage} The `RemotePage` created 
     */
    async createPage(page) {
        util.validateType('title', page.title, 'string');
        util.validateType('html', page.html, 'string');

        const payload = {
            title: page.title,
            type: 'page',
            space: { key: this.spaceKey },
            version: { number: 1 },
            ancestors: [],
            body: {
                storage: { value: page.html, representation: 'storage' }
            },
            metadata: {
                properties: {
                    editor: {
                        key: 'editor',
                        value: 'v2'
                    }
                }
            },
            restrictions: {
                update: {
                    operation: 'update',
                    restrictions: {
                        user: { results: [] },
                        group: { results: [] }
                    }
                }
            }
        };

        await this._getCurrentUser().then((user) => {
            payload.restrictions.update.restrictions.user.results.push(user);
        });

        if (page.meta) {
            if (page.meta instanceof Meta) {
                Object.assign(payload.metadata.properties, page.meta.toConfluenceProperties());
            } else {
                throw new Error('meta is not an instance of Meta class');
            }
        }

        if (page.parentPageId) {
            util.validateType('parentPage', page.parentPageId, 'number');
            payload.ancestors.push({ id: page.parentPageId });
        }

        const response = await this.api.post(
            CONTENT_PATH,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );

        const { id } = this.validateResponse(response);

        // return a `RemotePage` instance
        const remotePage = new RemotePage(Number.parseInt(id, 10), 1, page.title, page.meta, page.parentPageId);
        remotePage.localPage = page;
        return remotePage;
    }

    /**
     * Update the content of an existing page.
     *
     * @param {RemotePage} remotePage - The page to be updated
     * @returns {Promise<RemotePage>} The updated `RemotePage`
     */
    async updatePage(remotePage) {
        const { localPage } = remotePage;
        const title = localPage.title;
        const html = localPage.html;
        util.validateType('id', remotePage.id, 'number');
        util.validateType('version', remotePage.version, 'number');
        util.validateType('title', title, 'string');
        util.validateType('html', html, 'string');
        const payload = {
            title,
            type: 'page',
            version: { number: remotePage.version + 1 }, // bump version
            ancestors: [],
            body: {
                storage: { value: html, representation: 'storage' }
            },
            metadata: {
                properties: {
                    editor: {
                        key: 'editor',
                        value: 'v2'
                    }
                }
            },
            restrictions: {
                update: {
                    operation: 'update',
                    restrictions: {
                        user: { results: [] },
                        group: { results: [] }
                    }
                }
            }
        };

        await this._getCurrentUser().then((user) => {
            payload.restrictions.update.restrictions.user.results.push(user);
        });

        if (localPage.meta) {
            if (localPage.meta instanceof Meta) {
                Object.assign(payload.metadata.properties, localPage.meta.toConfluenceProperties());
            } else {
                throw new Error('meta is not an instance of Meta class');
            }
        }

        if (localPage.parentPageId) {
            util.validateType('parentPage', localPage.parentPageId, 'number');
            payload.ancestors.push({ id: localPage.parentPageId });
        }

        const response = await this.api.put(
            `${CONTENT_PATH}/${remotePage.id}`,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );

        this.validateResponse(response);
        remotePage.version++;
        remotePage.meta = localPage.meta;
        return remotePage;
    }

    /**
     * Delete a Confluence page
     * 
     * @param {number} id - The `id` of the Confluence page
     * @returns {Promise<void>}
     */
    async deletePage(id) {
        //TODO: check for children first
        const response = await this.api.delete(
            `${CONTENT_PATH}/${id}`
        );
        this.validateResponse(response, [204, 404]);
    }

    /**
     * Create an attachment to a Confluence page from a local file
     * 
     * @param {number} pageId - The `id` of the Confluence page
     * @param {string} path - The `path` of the file to be attached
     * @returns {Promise<void>}
     */
    async createAttachment(pageId, path) {
        util.validateType('pageId', pageId, 'number');
        util.validateType('path', path, 'string');
        if (!fs.existsSync(path)) {
            throw new Error(`Attachment '${path}' not exists`);
        }
        const formData = new FormData();
        formData.append('minorEdit', 'true');
        formData.append('file', fs.createReadStream(path));
        const headers = Object.assign({ 'X-Atlassian-Token': 'nocheck' }, formData.getHeaders());
        const response = await this.api.put(
            `${CONTENT_PATH}/${pageId}/child/attachment`, formData, { headers }
        );

        this.validateResponse(response);
    }

    /**
     * 
     * @param {AxiosResponse} response - An `AxiosResponse` object
     * @param {Array<number>} validStatuses - An array of http statuses to consider successful
     * @returns {object} The `response.data`
     * @throws `RequestError` if `status` is not successful
     */
    validateResponse({ status, statusText, data }, validStatuses = [200]) {
        if (!validStatuses.includes(status)) {
            logger.error(JSON.stringify({ status, statusText, data }, undefined, 2));
            throw new RequestError(status, statusText, data.message);
        }
        return data;
    }
}
