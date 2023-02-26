import Attachment from './attachment.js';

/**
 * Represents an image found in a markdown file
 */
export default class Image extends Attachment {
    constructor(path, alt) {
        super(path);
        this.alt = alt;
    }

    /**
     * 
     * @returns {string} the HTML markup for this image
     */
    get markup() {
        return `<ac:image ac:alt="${this.alt}"><ri:attachment ri:filename="${this.filename}" /></ac:image>`;
    }
}
