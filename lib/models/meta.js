import config from '../config.js';

export default class Meta {
    constructor(repo, path = null, sha = null) {
        this.repo = repo;
        this.path = path;
        this.sha = sha;
        this.git_ref = config.github.refName;
        this.git_sha = config.github.sha;
        this.publisher_version = config.version;
    }

    toConfluenceProperties() {
        const properties = {};
        Object.entries(this).forEach(([key, value]) => {
            if (value) {
                properties[key] = { key, value };
            }
        });
        return properties;
    }
}
