import qs from 'node:querystring';
import fs from 'node:fs';
import axios from 'axios';
import FormData from 'form-data';
import { RequestError } from './confluence-sdk-errors.mjs';
import { validateType } from './validator.mjs';
import logger from './logger.mjs';

const CONTENT_PATH = '/wiki/rest/api/content';
const EXPAND_PROPERTIES = [
    'version',
    'metadata.properties.repo',
    'metadata.properties.path',
    'metadata.properties.sha'
].join(',');

export default class ConfluenceSdk {
    constructor({ host, user, token, spaceKey }) {
        validateType(host, 'string', 'host is required');
        this.host = host;

        validateType(spaceKey, 'string', 'spaceKey is required');
        this.spaceKey = spaceKey;

        validateType(user, 'string', 'user is required');
        validateType(token, 'string', 'token is required');
        this.authHeader =
            'Basic ' + Buffer.from(`${user}:${token}`).toString('base64');

        this.api = axios.create({
            validateStatus: (status) => status < 500,
            baseURL: `${host}`,
            headers: {
                Authorization: this.authHeader,
                Accept: 'application/json'
            }
        });
    }

    async getChildPages(parentPage) {
        validateType(parentPage, 'number', 'parentPage should be a number');
        const query = qs.stringify({
            expand: EXPAND_PROPERTIES
        });
        const uri = `${CONTENT_PATH}/${parentPage}/child/page?${query}`;
        const response = await this.api.get(uri);
        const data = this.validateResponse(response);

        if (data.size === 0) {
            return [];
        }

        return data.results.map((page) => {
            const meta = page.metadata?.properties;
            return {
                id: Number.parseInt(page.id, 10),
                version: page.version.number,
                title: page.title,
                repo: meta?.repo?.value,
                path: meta?.path?.value,
                sha: meta?.sha?.value,
                parentId: parentPage
            };
        });
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
        validateType(
            title,
            'string',
            'title is required and should be a string'
        );
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
        const meta = page.metadata?.properties;
        return {
            id: Number.parseInt(page.id, 10),
            version: page.version.number,
            title: page.title,
            repo: meta?.repo?.value,
            path: meta?.path?.value,
            sha: meta?.sha?.value
        };
    }

    async createPage(title, html, parentPage = null, meta = null) {
        validateType(
            title,
            'string',
            'title is required and should be a string'
        );
        validateType(html, 'string', 'html is required and should be a string');

        const payload = {
            title,
            type: 'page',
            space: { key: this.spaceKey },
            ancestors: [],
            body: {
                storage: { value: html, representation: 'storage' }
            },
            metadata: {
                properties: {}
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
            validateType(meta, 'object', 'meta should be an object');
            Object.entries(meta).forEach(([key, value]) => {
                payload.metadata.properties[key] = { key, value };
            });
        }

        if (parentPage) {
            validateType(parentPage, 'number', 'parentPage should be a number');
            payload.ancestors.push({ id: parentPage });
        }

        const response = await this.api.post(
            CONTENT_PATH,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );

        const { id } = this.validateResponse(response);

        // return the id
        return Number.parseInt(id, 10);
    }

    async updatePage(id, version, title, html, parentPage = null, meta = null) {
        validateType(id, 'number', 'id is required and should be a number');
        validateType(
            version,
            'number',
            'version is required and should be a number'
        );
        validateType(
            title,
            'string',
            'title is required and should be a string'
        );
        validateType(html, 'string', 'html is required and should be a string');

        const payload = {
            title,
            type: 'page',
            version: { number: version },
            ancestors: [],
            body: {
                storage: { value: html, representation: 'storage' }
            },
            metadata: {
                properties: {}
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
            validateType(meta, 'object', 'meta should be an object');
            Object.entries(meta).forEach(([key, value]) => {
                payload.metadata.properties[key] = { key, value };
            });
        }

        if (parentPage) {
            validateType(
                parentPage,
                'number',
                'parentPage should be an number'
            );
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
