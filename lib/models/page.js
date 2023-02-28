export default class Page {
    /**
     * Constructor
     * 
     * @typedef {import('./meta.js').default} Meta 
     * @param {string} title - Page title
     * @param {Meta} meta - Page metadata
     */
    constructor(title, meta) {
        this.title = title;
        this.meta = meta;
    }
    get path() {
        return this.meta?.path;
    }
}
