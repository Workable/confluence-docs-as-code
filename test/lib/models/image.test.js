import Image from '../../../lib/models/image.js';

describe('models/image', () => {
    const file = 'file.png';
    const path = `foo/bar/${file}`;
    const alt = 'Alt';
    let image;
    beforeEach(() => {
        image = new Image(path, alt);
    });
    describe('constructor', () => {
        it('should set path type and alt', () => {
            image.path.should.equal(path);
            image.alt.should.equal(alt);
        });
    });
    describe('markup', () => {
        it('should render appropriate markup', () => {
            const expected = `<ac:image ac:alt="${alt}"><ri:attachment ri:filename="${file}" /></ac:image>`;
            image.markup.should.equal(expected);
        });
    });
    describe('render', () => {
        it('should return the path', () => {
            image.render().should.equal(path);
        });
    });
});
