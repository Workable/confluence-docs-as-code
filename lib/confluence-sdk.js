import qs from 'node:querystring';
import fs from 'node:fs';
import axios from 'axios';
import FormData from 'form-data';
import { RequestError } from './confluence-sdk-errors.js';
import util from './util.js';
import logger from './logger.js';
import retryPolicy from './retry-policy.js';
import Meta from './models/meta.js';

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

    async getChildPages(parentPage) {
        util.validateType('parentPage', parentPage, 'number');
        const query = qs.stringify({
            expand: EXPAND_PROPERTIES,
            start: 0,
            limit: this.pageLimit
        });
        const pages = new Map();
        let nextUri = `${CONTENT_PATH}/${parentPage}/child/page?${query}`;

        while (nextUri) {
            const response = await this.api.get(nextUri);
            const data = this.validateResponse(response);
            if (data.size === 0) {
                break;
            }
            data.results.forEach((pageData) => {
                const page = this.pageInfo(pageData, parentPage);
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
        return this.pageInfo(page);
    }

    pageInfo(page, parentId) {
        const meta = this.pageMeta(page);
        const info = {
            id: Number.parseInt(page.id, 10),
            version: page.version.number,
            title: page.title,
            meta
        };
        if (parentId) {
            info.parentId = parentId;
        }
        return info;
    }

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
     * @returns {LocalPage} The `page` with the `confluencePageId` set to the Confluence page id
     */
    async createPage(page) {
        util.validateType('title', page.title, 'string');
        util.validateType('html', page.html, 'string');

        const payload = {
            title: page.title,
            type: 'page',
            space: { key: this.spaceKey },
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

        // set the confluencePageId to page
        page.confluencePageId = Number.parseInt(id, 10);
        return page;
    }

    async updatePage(id, version, title, html, parentPage = null, meta = null) {
        util.validateType('id', id, 'number');
        util.validateType('version', version, 'number');
        util.validateType('title', title, 'string');
        util.validateType('html', html, 'string');

        const payload = {
            title,
            type: 'page',
            version: { number: version },
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

        if (meta) {
            if (meta instanceof Meta) {
                Object.assign(payload.metadata.properties, meta.toConfluenceProperties());
            } else {
                throw new Error('meta is not an instance of Meta class');
            }
        }

        if (parentPage) {
            util.validateType('parentPage', parentPage, 'number');
            payload.ancestors.push({ id: parentPage });
        }

        const response = await this.api.put(
            `${CONTENT_PATH}/${id}`,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );

        this.validateResponse(response);
    }

    async deletePage(id) {
        //TODO: check for children first
        const response = await this.api.delete(
            `${CONTENT_PATH}/${id}`
        );
        this.validateResponse(response, [204, 404]);
    }

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

    validateResponse({ status, statusText, data }, validStatuses = [200]) {
        if (!validStatuses.includes(status)) {
            logger.error(JSON.stringify({ status, statusText, data }, undefined, 2));
            throw new RequestError(status, statusText, data.message);
        }
        return data;
    }
}
