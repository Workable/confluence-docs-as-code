import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { expect } from 'chai';
import Page from '../../../lib/models/page.js';
describe('models/page', () => {
    describe('constructor', () => {
        it('should create an instance with title and meta', () => {
            const expected = { title: 'title', meta: 'meta' };
            new Page('title', 'meta').should.eql(expected);
        });
    });
    describe('html', () => {
        it('should get and set html content of page', () => {
            const page = new Page('title', 'meta');
            page.html.should.equal('');
            page.html = 'html';
            page.html.should.equal('html');

        });
    });
    describe('attachments', () => {
        it('should get and set html content of page', () => {
            const page = new Page('title', 'meta');
            page.attachments.should.eql([]);
            page.attachments = ['attachment'];
            page.attachments.should.eql(['attachment']);

        });
    });
    describe('loadMarkdown', () => {
        describe('when meta.path is not a string', () => {
            it('should throw error', () => {
                const page = new Page('title', 'meta');
                expect(() => page.loadMarkdown()).to.throw('path parameter is required');
            });
        });
        describe('when meta.path is not md', () => {
            it('should throw error', () => {
                const page = new Page('title', { path: 'foo.txt' });
                expect(() => page.loadMarkdown()).to.throw('foo.txt is not a markdown (.md) file');
            });
        });
        describe('when meta.path is a valid md file', () => {
            it('should throw error', () => {
                const path = 'test/fixtures/markdown/other-page.md';
                const expected = readFileSync(resolve(path), 'utf8');
                const page = new Page('title', { path });
                page.loadMarkdown().should.equal(expected);
            });
        });
    });
});
