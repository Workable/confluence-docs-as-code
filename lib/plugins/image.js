import path from 'node:path';
import util from '../util.js';

export default function plugin(md) {
    const _default = md.renderer.rules.image;
    md.renderer.rules.image = (tokens, idx, options, env, self) => {
        const image = tokens[idx];
        const attrs = Object.fromEntries(image.attrs);
        const src = md.utils.escapeHtml(attrs.src);

        if (isLocal(src)) {
            const file = path.basename(src);
            const relPath = util.safePath(src, env.source);
            if (relPath) {
                env.attachments.push({ path: relPath, type: 'image' });
                const alt = md.utils.escapeHtml(image.content);
                return toConfluenceImage(alt, file);
            }
        }

        return _default(tokens, idx, options, env, self);
    };
}

function isLocal(src) {
    return !src.startsWith('http');
}

export function toConfluenceImage(alt, filename) {
    return `<ac:image ac:alt="${alt}"><ri:attachment ri:filename="${filename}" /></ac:image>`;
}
