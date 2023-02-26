import util from '../util.js';
import Image from '../models/image.js';

export default function plugin(md) {
    const _default = md.renderer.rules.image;
    md.renderer.rules.image = (tokens, idx, options, env, self) => {
        const image = tokens[idx];
        const attrs = Object.fromEntries(image.attrs);
        const src = md.utils.escapeHtml(attrs.src);
        const { page } = env;

        if (isLocal(src)) {
            const relPath = util.safePath(src, page?.meta?.path);
            if (relPath) {
                const alt = md.utils.escapeHtml(image.content);
                const attachment = new Image(relPath, alt);
                page?.attachments.push(attachment);
                return attachment.markup;
            }
        }

        return _default(tokens, idx, options, env, self);
    };
}

function isLocal(src) {
    return !src.startsWith('http');
}
