import Attachment from './attachment.js';

export default class Image extends Attachment {
    constructor(path, alt) {
        super(path);
        this.alt = alt;
    }

    render() {
        return `<ac:image ac:alt="${this.alt}"><ri:attachment ri:filename="${this.filename}" /></ac:image>`;
    }
}
