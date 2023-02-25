import MarkdownIt from 'markdown-it';
import fence from './plugins/fence.js';
import image from './plugins/image.js';
import link from './plugins/link.js';

const PARSER_OPTIONS = { xhtmlOut: true, html: true };

export default class PageRenderer {
    constructor({ graphs }, pageRefs) {
        this.pageRefs = pageRefs;
        this.parser = new MarkdownIt(PARSER_OPTIONS)
            .use(fence, { graphs })
            .use(image)
            .use(link);
    }

    render(page) {
        page.html = this.parser.render(page.loadMarkdown(), { page, pageRefs: this.pageRefs })
            + this.footer(page);
    }

    footer(page) {
        if (!page?.meta?.githubUrl) {
            return '';
        }
        return `<hr /><p style="text-align: right;"><a href="${page.meta.githubUrl}">Edit on GitHub</a> ✍️</p>\n`;
    }
}
