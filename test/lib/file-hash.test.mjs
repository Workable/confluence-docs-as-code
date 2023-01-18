import path from 'node:path';
import fileHash from '../../lib/file-hash.mjs';

describe('file-hash', () => {
    describe('for text files', () => {
        it('should compute the sha256 of the given file', () => {
            const file = path.resolve('test/fixtures/markdown/full.md');
            const expected = '1ab5f4ff8cc9540908547ace65ac184afe7449d4bac774e1ccf0f75459536d61';
            fileHash(file).should.equal(expected);
            fileHash(file, 'utf8').should.equal(expected);
        });
    });
    describe('for binary files', () => {
        it('should compute the sha256 of the given file', () => {
            const file = path.resolve('test/fixtures/images/img-1.png');
            const expected = '14505743f8bcd27ceb3a3d0fb8260ea2de3c6b3bb48c029c0061bb05baa70332';
            fileHash(file, 'binary').should.equal(expected);
        });
    });
});
