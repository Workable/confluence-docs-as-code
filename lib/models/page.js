export default class Page {
    constructor(title, meta) {
        this.title = title;
        this.meta = meta;
    }
    get path() {
        return this.meta?.path;
    }
}
