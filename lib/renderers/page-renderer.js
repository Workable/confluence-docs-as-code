/**
 * @module renderers/page-renderer
 */
import MarkdownIt from 'markdown-it';
import fence from '../plugins/fence.js';
import image from '../plugins/image.js';
import link from '../plugins/link.js';

/**
 * Default parser options
 * @constant
 */
const PARSER_OPTIONS = { xhtmlOut: true, html: true };

/**
 * Render pages to html
 */
class PageRenderer {
    /**
     * @param {object} param0 - config
     * @param {object} pageRefs - An object with keys the page path and value the page title 
     */
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
     * @param {LocalPage} page - The page to render as html
     * @returns The `page` with its `html` and `attachments` attributes populated 
     */
    render(page) {
        const markdown = page.loadMarkdown();
        if (markdown) {
            page.html = this.parser.render(markdown, { page, pageRefs: this.pageRefs })
                + this.footer(page);
        }
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

export default PageRenderer;
