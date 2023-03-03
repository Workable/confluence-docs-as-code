/**
 * @module models/image
 */
import Attachment from './attachment.js';

/**
 * Represents an image found in a markdown file
 * 
 * @extends Attachment
 */
class Image extends Attachment {
    constructor(path, alt) {
        super(path);
        this.alt = alt;
    }

    /**
     * HTML markup for this image
     * 
     * @type {string} 
     */
    get markup() {
        return `<ac:image ac:alt="${this.alt}"><ri:attachment ri:filename="${this.filename}" /></ac:image>`;
    }
}

export default Image;
