import Page from './page.js';

export default class RemotePage extends Page {
    constructor(id, version, title, meta, parentId = null) {
        super(title, meta);
        this.id = id;
        this.version = version;
        this.parentId = parentId;
    }
}
