import { readFileSync } from 'node:fs';
import MarkdownIt from 'markdown-it';
import { resolve } from 'node:path';
import fence from './plugins/fence.js';
import image from './plugins/image.js';
import link from './plugins/link.js';
import config from './config.js';

function getParser() {
    return new MarkdownIt({ xhtmlOut: true, html: true });
}

function render({ path, githubUrl } = {}, env = {}) {
    const parser = getParser();
    const md = loadFile(path);
    const images = [];
    const graphs = [];
    const context = parser.utils.assign({ source: resolve(path), images, graphs }, env);
    const html = parser.use(fence, { kroki: config.kroki })
        .use(image).use(link).render(md, context) + footer(githubUrl);
    return { html, images, graphs };
}

function footer(githubUrl) {
    if (!githubUrl) {
        return '';
    }
    return `<hr /><p style="text-align: right;"><a href="${githubUrl}">Edit on GitHub</a> ✍️</p>\n`;
}

function loadFile(path) {
    if (typeof path !== 'string' || path.trim().length === 0) {
        throw new Error('path parameter is required');
    }
    if (!path.endsWith('.md')) {
        throw new Error(`${path} is not a markdown (.md) file`);
    }
    return readFileSync(resolve(path), 'utf8');
}

export default { render };
