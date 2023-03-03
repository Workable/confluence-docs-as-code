/**
 * @module models/meta
 */
import config from '../config.js';

/**
 * Represents metadata maintained for each page
 */
class Meta {
    /**
     * Constructor
     * 
     * @param {string} repo - The GitHub repo url the page belongs to
     * @param {string} path - The path of the page relative to the repo root
     * @param {string} sha - The `sha256` hash of the page's content
     * @param {string} gitRef - The git ref from where this page was published from
     * @param {string} gitSha - The git commit from where this page was published from
     * @param {string} publisherVersion - The version of the action that published the page
     */
    constructor(repo, path = null, sha = null, gitRef = null, gitSha = null, publisherVersion = null) {
        this.repo = repo;
        this.path = path;
        this.sha = sha;
        this.git_ref = gitRef || config.github.refName;
        this.git_sha = gitSha || config.github.sha;
        this.publisher_version = publisherVersion || config.version;
    }

    /**
     * Fully qualified GitHub url of this page
     * 
     * @type {string} 
     */
    get githubUrl() {
        return `${this.repo}/blob/${this.git_ref}/${this.path}`;
    }

    /**
     * 
     * @returns {object} With all metadata transformed as Confluence `properties`
     */
    toConfluenceProperties() {
        const properties = {};
        Object.entries(this).forEach(([key, value]) => {
            if (value) {
                properties[key] = { key, value };
            }
        });
        return properties;
    }

    /**
     * 
     * @returns {boolean} `True` if the major/minor version of the action 
     * published this page is different than the current version
     */
    publisherVersionConflict() {
        if (typeof this.publisher_version !== 'string') {
            return true;
        }
        const publishedVersion = this.publisher_version.split('.').slice(0, 2).join();
        const currentVersion = config.version.split('.').slice(0, 2).join();
        return currentVersion !== publishedVersion;
    }
}

export default Meta;
