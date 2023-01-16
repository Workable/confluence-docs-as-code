import path from 'node:path';
import fileHash from '../../lib/file-hash.mjs';

describe('file-hash', () => {
    it('should compute the sha256 of the given file', () => {
        const file = path.join(process.cwd(), 'test/fixtures/markdown/full.md');
        const expected = '1ab5f4ff8cc9540908547ace65ac184afe7449d4bac774e1ccf0f75459536d61';
        fileHash(file).should.equal(expected);
    });
});
