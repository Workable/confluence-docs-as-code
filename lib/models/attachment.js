import { basename } from 'node:path';

export default class Attachment {
    constructor(path) {
        this.path = path;
    }

    render() {
        throw new Error('Not implemented!');
    }

    get filename() {
        return basename(this.path);
    }
}
