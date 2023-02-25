import path from 'node:path';
import util from '../../lib/util.js';
import { expect } from 'chai';

describe('util', () => {
    describe('fileHash', () => {
        describe('for text files', () => {
            it('should compute the sha256 of the given file', () => {
                const file = path.resolve('test/fixtures/samples/simple/docs/getting-started.md');
                const expected = 'cce0ac41675f6c5dc82b5fa18971b1f0ed3a7cbd01594de3f7882d5bf6fbabfe';
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
        describe('when array is empty', () => {
            it('should return empty object', () => {
                util.keyBy([], 'key').should.eql({});
            });
        });
        describe('when some array elements have the desired key', () => {
            it('should return only conforming elements', () => {
                util.keyBy([{ key: 'k1', value: 'v1' }, { index: 1, value: 'v2' }], 'key')
                    .should.eql({ 'k1': { key: 'k1', value: 'v1' } });
            });
        });
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
        describe('when attribute is an object path', () => {
            it('should transform an array of objects to an object keyed by an attribute', () => {
                const input = [
                    { key1: { key2: 'k1', value: 'v1' } },
                    { key1: { key2: 'k2', value: 'v2' } },
                    { key1: { key2: 'k3', value: 'v3' } }
                ];
                const expected = {
                    k1: { key1: { key2: 'k1', value: 'v1' } },
                    k2: { key1: { key2: 'k2', value: 'v2' } },
                    k3: { key1: { key2: 'k3', value: 'v3' } }
                };
                util.keyBy(input, 'key1.key2').should.eql(expected);
            });
        });
    });
});
