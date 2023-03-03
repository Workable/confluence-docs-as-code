/**
 * @module plugins/link
 */
import util from '../util.js';

/**
 * MarkdownIt plugin to handle links
 * 
 * @param {MarkdownIt} md - A `MarkdownIt` instance
 */
function plugin(md) {
    md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const page = localPage(tokens, idx, env, md);
        if (page) {
            return confluenceLinkOpen(page);
        }
        return self.renderToken(tokens, idx, options);
    };

    md.renderer.rules.link_close = (tokens, idx, options, env, self) => {
        // Links are parsed as 3 (or more) tokens [link_open],[text],[link_close]
        // With idx in this context referring to [link_close] we backtrack
        // To pick the related [link_open]
        let linkOpenIdx = idx - 1;
        while (tokens[linkOpenIdx].type !== 'link_open' && linkOpenIdx > -1) {
            linkOpenIdx--;
        }

        if (tokens[linkOpenIdx].type === 'link_open' && localPage(tokens, linkOpenIdx, env, md)) {
            return confluenceLinkClose();
        }
        return self.renderToken(tokens, idx, options);
    };
}

/**
 * Lookup the title of the page the link token refers by path
 * 
 * @param {Array<Token>} tokens - Array of parsed tokens
 * @param {number} idx - Current token index
 * @param {object} param2 - Parser env object
 * @param {MarkdownIt} md - A `MarkdownIt` instance
 * @returns {string|undefined} The title of the page if exists in `pageRefs`
 */
function localPage(tokens, idx, { page, pageRefs }, md) {
    const link = tokens[idx];
    const attrs = Object.fromEntries(link.attrs);
    const href = md.utils.escapeHtml(attrs.href);
    if (isLocal(href)) {
        const relPath = util.safePath(href, page?.path);
        if (relPath && pageRefs && pageRefs[relPath]) {
            return pageRefs[relPath];
        }
    }
}
/**
 * 
 * @param {string} href - The `href` attribute of an image token
 * @returns {string} `true` if the `href` does not start with `http`
 */
function isLocal(href) {
    return !href.toLowerCase().startsWith('http');
}

/**
 * Opening markup for confluence link
 * 
 * @param {string} title - Page title
 * @returns {string} Html markup
 */
function confluenceLinkOpen(title) {
    return `<ac:link ac:card-appearance="inline"><ri:page ri:content-title="${title}" /><ac:link-body>`;
}

/**
 * Closing markup for confluence link
 * 
 * @returns {string} Html markup
 */
function confluenceLinkClose() {
    return '</ac:link-body></ac:link>';
}

export default plugin;
