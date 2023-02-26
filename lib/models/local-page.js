import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Page from './page.js';

export default class LocalPage extends Page {
    set html(html) {
        this._html = html;
    }
    get html() {
        return this._html || '';
    }
    set attachments(attachments) {
        this._attachments = attachments;
    }
    get attachments() {
        if (!this._attachments) {
            this._attachments = [];
        }
        return this._attachments;
    }

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
}
