import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { expect } from 'chai';
import sinon from 'sinon';
import LocalPage from '../../../lib/models/local-page.js';
import AssetRenderer from '../../../lib/renderers/asset-renderer.js';
import Attachment from '../../../lib/models/attachment.js';
import ConfluenceSdk from '../../../lib/confluence-sdk.js';
import logger from '../../../lib/logger.js';
import { RemotePage } from '../../../lib/models/index.js';

const sandbox = sinon.createSandbox();

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
        it('should get and set attachments of page', () => {
            const page = new LocalPage('title', 'meta');
            page.attachments.should.eql([]);
            page.attachments = ['attachment'];
            page.attachments.should.eql(['attachment']);

        });
    });
    describe('attachmentFiles', () => {
        it('should get and set attachmentFiles of page', () => {
            const page = new LocalPage('title', 'meta');
            page.attachmentFiles.should.eql([]);
            page.attachmentFiles = ['attachment'];
            page.attachmentFiles.should.eql(['attachment']);

        });
    });
    describe('parentPageId', () => {
        const id = 10102;
        it('should get and set parentPageId of page', () => {
            const page = new LocalPage('title', 'meta');
            page.parentPageId = id;
            page.parentPageId.should.equal(id);

        });
    });
    describe('loadMarkdown', () => {
        describe('when meta.path is missing', () => {
            it('should return undefined', () => {
                const page = new LocalPage('title', 'meta');
                expect(page.loadMarkdown()).to.be.undefined;
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
    describe('renderAttachments', () => {
        const attachmentPath = 'attachment/path';
        let page, attachment, loggerMock, renderer;
        beforeEach(() => {
            attachment = new Attachment(attachmentPath);
            sandbox.stub(attachment, 'render').resolves();
            page = new LocalPage('title', 'meta');
            page.attachments = [attachment];
            renderer = sandbox.createStubInstance(AssetRenderer);
            loggerMock = sandbox.stub(logger, 'warn');
        });
        describe('when attachment fails to render', () => {
            it('should log warning and skip attachment', () => {
                return page.renderAttachments(renderer).then(() => {
                    page.attachmentFiles.should.eql([]);
                    sandbox.assert.calledWith(loggerMock, `Attachment "${attachmentPath}" could not be processed`);
                });
            });
        });
    });
    describe('sync', () => {
        const id = 101;
        const attachmentPath = 'attachment/path';
        let renderer, confluence;
        let page, attachment;
        beforeEach(() => {
            page = new LocalPage('title', 'meta');
            attachment = new Attachment(attachmentPath);
            renderer = sandbox.createStubInstance(AssetRenderer);
            renderer.renderPage.callsFake(() => {
                page.attachments = [attachment];
                return page;
            });
            confluence = sandbox.createStubInstance(ConfluenceSdk);
            const remote = new RemotePage(id, 1, 'title');
            confluence.createPage.resolves(remote);
            confluence.createAttachment.resolves();
        });
        it('should render the page and publish to confluence', () => {
            return page.sync(renderer, confluence).then(() => {
                sandbox.assert.calledWith(confluence.createPage, page);
                sandbox.assert.calledWith(confluence.createAttachment, id, attachmentPath);
            });
        });
    });
});
