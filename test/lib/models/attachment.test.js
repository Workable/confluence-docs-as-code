import Attachment from '../../../lib/models/attachment.js';

describe('models/attachment', () => {
    const file = 'file.ext';
    const path = `foo/bar/${file}`;
    let attachment;
    beforeEach(() => {
        attachment = new Attachment(path);
    });
    describe('constructor', () => {
        it('should set path', () => {
            attachment.path.should.be.equal(path);
        });
    });
    describe('filename', () => {
        it('should return the basename from the path', () => {
            attachment.filename.should.be.equal(file);
        });
    });
    describe('render', () => {
        it('should return the path', () => {
            attachment.render().should.equal(path);
        });
    });
});
