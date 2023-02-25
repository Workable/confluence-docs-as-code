import MarkdownIt from 'markdown-it';
import fence from './plugins/fence.js';
import image from './plugins/image.js';
import link from './plugins/link.js';
import config from './config.js';

function getParser() {
    return new MarkdownIt({ xhtmlOut: true, html: true });
}

function render(page, pageRefs) {
    page.html = getParser()
        .use(fence, { graphs: config.graphs })
        .use(image)
        .use(link)
        .render(page.loadMarkdown(), { page, pageRefs }) + footer(page);
}

function footer(page) {
    if (!page?.meta?.githubUrl) {
        return '';
    }
    return `<hr /><p style="text-align: right;"><a href="${page.meta.githubUrl}">Edit on GitHub</a> ✍️</p>\n`;
}

export default { render };
