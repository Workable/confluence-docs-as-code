import Meta from '../../../lib/models/meta.js';
import RemotePage from '../../../lib/models/remote-page.js';
describe('models/page', () => {
    const meta = new Meta('repo', 'path', 'sha');
    const [id, version, title, parentId] = [101, 1, 'title', 100];
    describe('constructor', () => {
        it('should create an instance with title and meta', () => {
            const expected = { id, version, title, meta, parentId };
            new RemotePage(id, version, title, meta, parentId).should.eql(expected);
        });
    });
});
