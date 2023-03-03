/**
 * @module models/attachment
 */
import { basename } from 'node:path';

/**
 * Represents an attachment on a page
 */
class Attachment {
    /**
     * @param {*} path 
     */
    constructor(path) {
        this.path = path;
    }

    /**
     * The filename of the attachment
     * 
     * @type {string} 
     */
    get filename() {
        return basename(this.path);
    }

    /** 
    * Render the attachment using the `renderer` instance provided
    * 
    * @param {AssetRenderer} renderer - an `AssetRenderer` instance
    * @returns {Promise<string>} Path of the rendered attachment to be uploaded to Confluence
    */
    // eslint-disable-next-line no-unused-vars
    render(renderer) {
        return this.path;
    }
}

export default Attachment;
