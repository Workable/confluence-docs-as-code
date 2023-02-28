import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import logger from '../logger.js';
import Page from './page.js';

/**
 * A Local page 
 */
export default class LocalPage extends Page {
    /**
     * Html markup
     * @type {string} 
     */
    get html() {
        return this._html || '';
    }

    set html(html) {
        this._html = html;
    }

    /**
     * @typedef {import('./attachment.js').default} Attachment 
     * @type {Array<Attachment>}
     */
    get attachments() {
        if (!this._attachments) {
            this._attachments = [];
        }
        return this._attachments;
    }

    set attachments(attachments) {
        this._attachments = attachments;
    }

    /**
     * The id of the parent confluence page
     * @type {number} 
     */
    get parentPageId() {
        return this._parentPageId;
    }

    set parentPageId(id) {
        this._parentPageId = id;
    }

    /**
     * Array of rendered attachment files
     * 
     * @type {Array<string>} 
     */
    get attachmentFiles() {
        if (!this._attachmentFiles) {
            this._attachmentFiles = [];
        }
        return this._attachmentFiles;
    }

    set attachmentFiles(files) {
        this._attachmentFiles = files;
    }

    /**
     * Loads the markdown file from `this.meta.path`
     * 
     * @return {string} The contents of the markdown file
     */
    loadMarkdown() {
        const { path } = this.meta;
        if (!path) {
            return;
        }
        if (!path.endsWith('.md')) {
            throw new Error(`${path} is not a markdown (.md) file`);
        }
        return readFileSync(resolve(path), 'utf8');
    }

    /** 
    * Render the markdown of `this` page and `attachments`, using the provided `renderer`
    * 
    * @typedef {import('../renderers/asset-renderer.js').default} AssetRenderer 
    * @param {AssetRenderer} renderer - an `AssetRenderer` instance
    * @returns {LocalPage} `this` with `html` and `attachments` populated
    */
    async render(renderer) {
        await renderer.renderPage(this);
        await this.renderAttachments(renderer);
        return this;
    }

    /**
     * Render attachments of `this` page
     * 
     * @param {AssetRenderer} renderer - an `AssetRenderer` instance
     */
    async renderAttachments(renderer) {
        for (const attachment of this.attachments) {
            const rendered = await attachment.render(renderer);
            if (!rendered) {
                logger.warn(`${attachment.constructor.name} "${attachment.path}" could not be processed`);
            } else {
                this.attachmentFiles.push(rendered);
            }
        }
    }

    /**
     * Render and create `this` page to Confluence, including any attachments
     * 
     * @typedef {import('../confluence-sdk.js').default} ConfluenceSdk 
     * @typedef {import('./remote-page.js').default} RemotePage
     * 
     * @param {AssetRenderer} renderer - an `AssetRenderer` instance
     * @param {ConfluenceSdk} confluence - ConfluenceSdk instance to use for syncing
     * @returns {Promise<RemotePage>} The `RemotePage` created
     */
    async sync(renderer, confluence) {
        // Render page and attachments
        await this.render(renderer);
        // Publish page
        const created = await confluence.createPage(this);
        logger.debug(`Created Page: [${created.id}] ${created.title}`);
        // Publish attachments
        for (const attachment of this.attachmentFiles) {
            await confluence.createAttachment(created.id, attachment);
            logger.debug(`Attached file ${attachment}" to page [${created.id}] ${created.title}`);
        }
        return created;
    }
}
