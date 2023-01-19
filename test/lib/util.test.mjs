import path from 'node:path';
import util from '../../lib/util.mjs';
import { expect } from 'chai';

describe('util', () => {
    describe('fileHash', () => {
        describe('for text files', () => {
            it('should compute the sha256 of the given file', () => {
                const file = path.resolve('test/fixtures/markdown/full.md');
                const expected = '1ab5f4ff8cc9540908547ace65ac184afe7449d4bac774e1ccf0f75459536d61';
                util.fileHash(file).should.equal(expected);
                util.fileHash(file, 'utf8').should.equal(expected);
            });
        });
        describe('for binary files', () => {
            it('should compute the sha256 of the given file', () => {
                const file = path.resolve('test/fixtures/images/img-1.png');
                const expected = '14505743f8bcd27ceb3a3d0fb8260ea2de3c6b3bb48c029c0061bb05baa70332';
                util.fileHash(file, 'binary').should.equal(expected);
            });
        });
    });
    describe('validateType', () => {
        [
            { type: 'number', right: 1, wrong: 'A', error: 'variable should be a number' },
            { type: 'string', right: 'A', wrong: 1, error: 'variable should be a string' },
            { type: 'object', right: { foo: 'bar' }, wrong: 'A', error: 'variable should be an object' },
            { type: 'array', right: [1, 2, 3], wrong: 'A', error: 'variable should be an array' }
        ].forEach(({ type, right, wrong, error }) => {
            it(`should validate ${type}`, () => {
                expect(util.validateType('variable', right, type)).to.be.undefined;
                expect(() => util.validateType('variable', wrong, type)).to.throw(error);
            });
        });
    });
    describe('keyBy', () => {
        it('should transform an array of objects to an object keyed by an attribute', () => {
            const input = [
                { key: 'k1', value: 'v1' },
                { key: 'k2', value: 'v2' },
                { key: 'k3', value: 'v3' }
            ];
            const expected = {
                k1: { key: 'k1', value: 'v1' },
                k2: { key: 'k2', value: 'v2' },
                k3: { key: 'k3', value: 'v3' }
            };
            util.keyBy(input, 'key').should.eql(expected);
        });
    });
});
