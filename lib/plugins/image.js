/**
 * @module plugins/image
 */
import util from '../util.js';
import Image from '../models/image.js';

/**
 * MarkdownIt plugin to handle images
 * 
 * @param {MarkdownIt} md - A `MarkdownIt` instance
 */
function plugin(md) {
    const _default = md.renderer.rules.image;
    md.renderer.rules.image = (tokens, idx, options, env, self) => {
        const image = tokens[idx];
        const attrs = Object.fromEntries(image.attrs);
        const src = md.utils.escapeHtml(attrs.src);
        const { page } = env;

        if (isLocal(src)) {
            const relPath = util.safePath(src, page?.path);
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
/**
 * 
 * @param {string} src - The `src` attribute of an image token
 * @returns {string} `true` if the `src` does not start with `http`
 */
function isLocal(src) {
    return !src.startsWith('http');
}

export default plugin;
