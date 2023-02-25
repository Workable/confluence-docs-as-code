import util from '../util.js';

export default function plugin(md) {
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
            return '</ac:link-body></ac:link>';
        }
        return self.renderToken(tokens, idx, options);
    };
}


function localPage(tokens, idx, { page, pageRefs }, md) {
    const link = tokens[idx];
    const attrs = Object.fromEntries(link.attrs);
    const href = md.utils.escapeHtml(attrs.href);
    if (isLocal(href)) {
        const relPath = util.safePath(href, page?.meta?.path);
        if (relPath && pageRefs && pageRefs[relPath]) {
            return pageRefs[relPath];
        }
    }
}

function isLocal(href) {
    return !href.toLowerCase().startsWith('http');
}

function confluenceLinkOpen(title) {
    return `<ac:link ac:card-appearance="inline"><ri:page ri:content-title="${title}" /><ac:link-body>`;
}

