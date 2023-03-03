/**
 * @module models/remote-page
 */
import config from '../config.js';
import logger from '../logger.js';
import Page from './page.js';

/**
 * Models a page on Confluence
 * 
 * @extends Page
 */
class RemotePage extends Page {
    /**
     * Constructor
     * 
     * @param {number} id 
     * @param {number} version 
     * @param {string} title 
     * @param {Meta} meta 
     * @param {number} parentId 
     */
    constructor(id, version, title, meta, parentId = null) {
        super(title, meta);
        this.id = id;
        this.version = version;
        this.parentId = parentId;
    }

    /**
     * The related `LocalPage`
     * @type {LocalPage} 
     */
    get localPage() {
        return this._local;
    }

    set localPage(page) {
        this._local = page;
    }

    /**
     * 
     * @returns {boolean} `True` if related to a local page and should be updated
     */
    shouldUpdate() {
        if (!this.localPage) {
            return false;
        }
        if (config.confluence.forceUpdate || this.meta.publisherVersionConflict()) {
            return true;
        }
        return this.localPage.meta.sha !== this.meta.sha;
    }

    /**
     * 
     * @returns {boolean} `True` if the `meta.repo` of this page is other than 
     * the `meta.repo` of the related `localPage`
     */
    repoConflict() {
        if (!this.localPage) {
            return false;
        }

        return this.meta.repo !== this.localPage.meta.repo;
    }

    /**
    * Re-sync this page with Confluence.
    * 
    * - If the page in not related to a `localPage`, it should be **deleted**.
    * - If the page is related to a `localPage` and `shouldUpdate` 
    *   then **update** the page using the content from the `localPage`
    * 
    * @param {AssetRenderer} renderer - an `AssetRenderer` instance
    * @param {ConfluenceSdk} confluence - ConfluenceSdk instance to use for syncing
    * @returns {Promise<RemotePage>} The updated `RemotePage`
    */
    async sync(renderer, confluence) {
        const { localPage } = this;
        if (!localPage) { // delete orphan
            logger.debug(`Deleting page "${this.title}" #${this.id}`);
            return confluence.deletePage(this.id);
        }
        if (!this.shouldUpdate()) { // skip update
            logger.debug(`Skipping update of page "${this.title}" #${this.id}`);
            return;
        }
        localPage.parentPageId = this.parentId;
        // Render the related local page
        await localPage.render(renderer);
        // Publish attachments
        for (const attachment of localPage.attachmentFiles) {
            await confluence.createAttachment(this.id, attachment);
            logger.debug(`Attached file ${attachment}" to page "${this.title}" #${this.id}`);
        }
        // Update the remote page with the localPage content
        const updated = await confluence.updatePage(this);
        return updated;
    }
}

export default RemotePage;
