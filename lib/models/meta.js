import config from '../config.js';

export default class Meta {
    constructor(repo, path = null, sha = null, gitRef = null, gitSha = null, publisherVersion = null) {
        this.repo = repo;
        this.path = path;
        this.sha = sha;
        this.git_ref = gitRef || config.github.refName;
        this.git_sha = gitSha || config.github.sha;
        this.publisher_version = publisherVersion || config.version;
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
