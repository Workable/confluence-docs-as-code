import MarkdownIt from 'markdown-it';
import fence from '../plugins/fence.js';
import image from '../plugins/image.js';
import link from '../plugins/link.js';

const PARSER_OPTIONS = { xhtmlOut: true, html: true };

/**
 * Render pages to html
 */
export default class PageRenderer {
    constructor({ graphs }, pageRefs) {
        this.pageRefs = pageRefs;
        this.parser = new MarkdownIt(PARSER_OPTIONS)
            .use(fence, { graphs })
            .use(image)
            .use(link);
    }

    /**
     * Renders the markdown file represented by `page` as html
     * 
     * @typedef {import('../models/local-page.js').default} LocalPage
     * @param {LocalPage} page - The page to render as html
     * @returns The `page` with its `html` and `attachments` attributes populated 
     */
    render(page) {
        page.html = this.parser.render(page.loadMarkdown(), { page, pageRefs: this.pageRefs })
            + this.footer(page);
        return page;
    }

    /**
     * @param {LocalPage} page - The page to create a footer for
     * @returns Html markup with a link to open the markdown source on GitHub
     */
    footer(page) {
        return `<hr /><p style="text-align: right;"><a href="${page.meta.githubUrl}">Edit on GitHub</a> ✍️</p>\n`;
    }
}
