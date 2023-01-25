import { readFileSync } from 'node:fs';
import MarkdownIt from 'markdown-it';
import fence from './plugins/fence.js';
import image from './plugins/image.js';
import link from './plugins/link.js';
import config from './config.js';

function getParser() {
    return new MarkdownIt({ xhtmlOut: true, html: true });
}

function render(filename, env = {}) {
    const parser = getParser();
    const md = loadFile(filename);
    const images = [];
    const graphs = [];
    const html = parser.use(fence, { kroki: config.kroki })
        .use(image)
        .use(link)
        .render(md, parser.utils.assign({ source: filename, images, graphs }, env));
    return { html, images, graphs };
}

function loadFile(filename) {
    if (typeof filename !== 'string' || filename.trim().length === 0) {
        throw new Error('file parameter is required');
    }
    if (!filename.endsWith('.md')) {
        throw new Error(`${filename} is not a markdown (.md) file`);
    }
    return readFileSync(filename, 'utf8');
}

export default { render };
