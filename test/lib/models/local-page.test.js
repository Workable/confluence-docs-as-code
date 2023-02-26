import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { expect } from 'chai';
import LocalPage from '../../../lib/models/local-page.js';
describe('models/local-page', () => {
    describe('html', () => {
        it('should get and set html content of page', () => {
            const page = new LocalPage('title', 'meta');
            page.html.should.equal('');
            page.html = 'html';
            page.html.should.equal('html');

        });
    });
    describe('attachments', () => {
        it('should get and set html content of page', () => {
            const page = new LocalPage('title', 'meta');
            page.attachments.should.eql([]);
            page.attachments = ['attachment'];
            page.attachments.should.eql(['attachment']);

        });
    });
    describe('loadMarkdown', () => {
        describe('when meta.path is not a string', () => {
            it('should throw error', () => {
                const page = new LocalPage('title', 'meta');
                expect(() => page.loadMarkdown()).to.throw('path parameter is required');
            });
        });
        describe('when meta.path is not md', () => {
            it('should throw error', () => {
                const page = new LocalPage('title', { path: 'foo.txt' });
                expect(() => page.loadMarkdown()).to.throw('foo.txt is not a markdown (.md) file');
            });
        });
        describe('when meta.path is a valid md file', () => {
            it('should throw error', () => {
                const path = 'test/fixtures/markdown/other-page.md';
                const expected = readFileSync(resolve(path), 'utf8');
                const page = new LocalPage('title', { path });
                page.loadMarkdown().should.equal(expected);
            });
        });
    });
});