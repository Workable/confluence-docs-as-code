import { basename } from 'node:path';

export default class Attachment {
    constructor(path) {
        this.path = path;
    }

    get filename() {
        return basename(this.path);
    }

    /** 
    * Render the attachment using the `renderer` instance provided
    * 
    * @typedef {import('../renderers/asset-renderer.js').default} AssetRenderer 
    * @param {AssetRenderer} renderer - an `AssetRenderer` instance
    * @returns {Promise<string>} the path of the rendered attachment to be uploaded to Confluence
    */
    // eslint-disable-next-line no-unused-vars
    render(renderer) {
        return this.path;
    }
}
