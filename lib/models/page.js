/**
 * @module models/page
 */

/**
 * Base Page class
 */
class Page {
    /**
     * Constructor
     * 
     * @param {string} title - Page title
     * @param {Meta} meta - Page metadata
     */
    constructor(title, meta) {
        this.title = title;
        this.meta = meta;
    }

    /**
     * The path where the markdown of this page is located
     * 
     * @type {string}
     */
    get path() {
        return this.meta?.path;
    }
}

export default Page;
