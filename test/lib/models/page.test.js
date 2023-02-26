import Meta from '../../../lib/models/meta.js';
import Page from '../../../lib/models/page.js';
describe('models/page', () => {
    const meta = new Meta('repo', 'path');
    describe('constructor', () => {
        it('should create an instance with title and meta', () => {
            const expected = { title: 'title', meta };
            new Page('title', meta).should.eql(expected);
        });
    });
    describe('path', () => {
        it('should return meta.path', () => {
            new Page('title', meta).path.should.eql('path');
        });
    });
});
