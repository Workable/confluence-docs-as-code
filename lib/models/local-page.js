import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
     * Loads the markdown file from `this.meta.path`
     * 
     * @return {string} The contents of the markdown file
     */
    loadMarkdown() {
        const { path } = this.meta;
        if (typeof path !== 'string' || path.trim().length === 0) {
            throw new Error('path parameter is required');
        }
        if (!path.endsWith('.md')) {
            throw new Error(`${path} is not a markdown (.md) file`);
        }
        return readFileSync(resolve(path), 'utf8');
    }

    /** 
    * Render the markdown of `this` page as HTML, using the provided `renderer`
    * 
    * @typedef {import('../renderers/asset-renderer.js').default} AssetRenderer 
    * @param {AssetRenderer} renderer - an `AssetRenderer` instance
    * @returns {LocalPage} `this` with `html` and `attachments` populated
    */
    render(renderer) {
        return renderer.renderPage(this);
    }
}
