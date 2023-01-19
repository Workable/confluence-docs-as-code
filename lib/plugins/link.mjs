import util from '../util.mjs';

export default function plugin(md) {
    md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const page = localPage(tokens, idx, env, md);
        if (page) {
            return confluenceLinkOpen(page);
        }
        return self.renderToken(tokens, idx, options);
    };

    md.renderer.rules.link_close = (tokens, idx, options, env, self) => {
        // Links are parsed as 3 tokens [link_open],[text],[link_close]
        // With idx in this context referring to [link_close] we backtrack (-2)
        // To pick the related [link_open]
        if (localPage(tokens, idx - 2, env, md)) {
            return '</ac:link-body></ac:link>';
        }
        return self.renderToken(tokens, idx, options);
    };
}


function localPage(tokens, idx, env, md) {
    const link = tokens[idx];
    const attrs = Object.fromEntries(link.attrs);
    const href = md.utils.escapeHtml(attrs.href);
    if (isLocal(href)) {
        const relPath = util.safePath(href, env.source,);
        if (relPath && env.pages && env.pages[relPath] && env.pages[relPath].exists) {
            return env.pages[relPath].title;
        }
    }
}

function isLocal(href) {
    return !href.toLowerCase().startsWith('http');
}

function confluenceLinkOpen(title) {
    return `<ac:link ac:card-appearance="inline"><ri:page ri:content-title="${title}" /><ac:link-body>`;
}

