/**
 * @module models/local-page
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import logger from '../logger.js';
import Page from './page.js';

/**
 * Models a (markdown) page found in the local repo
 * 
 */
class LocalPage extends Page {
    /**
     * Constructor
     * 
     * @param {string} title - Page title
     * @param {Meta} meta - Page metadata
     */
    constructor(title, meta) {
        super(title, meta);
        this.parentPath = null;
    }

    /**
     * Html markup
     * 
     * @type {string} 
     */
    get html() {
        return this._html || '';
    }

    set html(html) {
        this._html = html;
    }

    /**
     * Attachments on this page
     * 
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
     * 
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
        if (!this.path) {
            return;
        }
        if (!this.path.endsWith('.md')) {
            throw new Error(`${this.path} is not a markdown (.md) file`);
        }
        return readFileSync(resolve(this.path), 'utf8');
    }

    /** 
    * Render the markdown of `this` page and `attachments`, using the provided `renderer`
    * 
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

export default LocalPage;
