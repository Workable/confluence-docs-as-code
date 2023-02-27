import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import logger from '../logger.js';
import Page from './page.js';

/**
 * A Local page 
 */
export default class LocalPage extends Page {
    /**
     * @param {string} html - Html markup
     */
    set html(html) {
        this._html = html;
    }
    /**
     * @returns {string} Html markup
     */
    get html() {
        return this._html || '';
    }

    /**
    * @typedef {import('./attachment.js').default} Attachment 
    * @returns {Array<Attachment>}
    */
    get attachments() {
        if (!this._attachments) {
            this._attachments = [];
        }
        return this._attachments;
    }

    /**
    * @param {Array<Attachment>} attachments
    */
    set attachments(attachments) {
        this._attachments = attachments;
    }

    /**
     * @returns {number} The id of the confluence page
     */
    get confluencePageId() {
        return this._confluencePageId;
    }

    /**
     * @param {number} id - The id of the confluence page
     */
    set confluencePageId(id) {
        this._confluencePageId = id;
    }

    /**
    * @returns {number} The id of the parent confluence page
    */
    get parentPageId() {
        return this._parentPageId;
    }

    /**
     * @param {number} id - The id of the parent confluence page
     */
    set parentPageId(id) {
        this._parentPageId = id;
    }

    /**
     * @returns {Array<string>} Array of rendered attachment files
     */
    get attachmentFiles() {
        if (!this._attachmentFiles) {
            this._attachmentFiles = [];
        }
        return this._attachmentFiles;
    }

    /**
     * @param {Array<string>} files
     */
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
     * @param {AssetRenderer} renderer - an `AssetRenderer` instance
     * @param {ConfluenceSdk} confluence - ConfluenceSdk instance to use for syncing
     * @param {number} parentPageId
     */
    async sync(renderer, confluence) {
        // Render page and attachments
        await this.render(renderer);
        // Publish page
        await confluence.createPage(this);
        logger.debug(`Created Page: [${this.confluencePageId}] ${this.title}`);
        // Publish attachments
        for (const attachment of this.attachmentFiles) {
            await confluence.createAttachment(this.confluencePageId, attachment);
            logger.debug(`Attached file ${attachment}" to page #${this.confluencePageId}`);
        }
    }
}
