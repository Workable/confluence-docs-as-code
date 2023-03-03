import sinon from 'sinon';
import Meta from '../../../lib/models/meta.js';
import RemotePage from '../../../lib/models/remote-page.js';
import config from '../../../lib/config.js';
import ConfluenceSdk from '../../../lib/confluence-sdk.js';
import AssetRenderer from '../../../lib/renderers/asset-renderer.js';
import Attachment from '../../../lib/models/attachment.js';
import { LocalPage } from '../../../lib/models/index.js';

const sandbox = sinon.createSandbox();

describe('models/remote-page', () => {
    afterEach(() => {
        sandbox.restore();
    });
    const meta = new Meta('repo', 'path', 'sha');
    const [id, version, title, parentId] = [101, 1, 'title', 100];
    describe('constructor', () => {
        it('should create an instance with title and meta', () => {
            const expected = { id, version, title, meta, parentId };
            new RemotePage(id, version, title, meta, parentId).should.eql(expected);
        });
    });
    describe('localPage', () => {
        it('should get and set localPage', () => {
            const localPage = { title: 'local page' };
            const page = new RemotePage(id, version, title, meta, parentId);
            page.localPage = localPage;
            page.localPage.should.equal(localPage);

        });
    });
    describe('repoConflict', () => {
        describe('when this page has no related localPage', () => {
            it('should return false', () => {
                new RemotePage(id, version, title, meta, parentId).repoConflict().should.be.false;
            });
        });
        describe('when this page and related localPage refer to a different repo', () => {
            it('should return true', () => {
                const localPage = { title: 'local page', meta };
                const page = new RemotePage(id, version, title, meta, parentId);
                page.localPage = localPage;
                page.repoConflict().should.be.false;
            });
        });
        describe('when this page and related localPage refer to the same repo', () => {
            it('should return false', () => {
                const localPage = { title: 'local page', meta: new Meta('other-repo') };
                const page = new RemotePage(id, version, title, meta, parentId);
                page.localPage = localPage;
                page.repoConflict().should.be.true;
            });
        });
    });
    describe('shouldUpdate', () => {
        describe('when this page has no related localPage', () => {
            it('should return false', () => {
                new RemotePage(id, version, title, meta, parentId).shouldUpdate().should.be.false;
            });
        });
        describe('when confluence.forceUpdate is enabled from config', () => {
            beforeEach(() => {
                sandbox.replace(config.confluence, 'forceUpdate', true);
            });

            it('should return true', () => {
                const page = new RemotePage(id, version, title, meta, parentId);
                page.localPage = { title: 'local page', meta: new Meta('other-repo') };
                page.shouldUpdate().should.be.true;
            });

        });
        describe('when page was published with different action version', () => {
            beforeEach(() => {
                sandbox.replace(config.confluence, 'forceUpdate', false);
                sandbox.replace(config, 'version', '2.0.0');
            });
            it('should return true', () => {
                const page = new RemotePage(id, version, title, meta, parentId);
                page.localPage = { title: 'local page', meta: new Meta('repo', 'path', 'sha', null, null, '1.0.0') };
                page.shouldUpdate().should.be.true;
            });
        });
        describe('when this sha is different that local page sha', () => {
            beforeEach(() => {
                sandbox.replace(config.confluence, 'forceUpdate', false);
            });
            it('should return true', () => {
                const page = new RemotePage(id, version, title, meta, parentId);
                page.localPage = { title: 'local page', meta: new Meta('repo', 'path', 'other-sha') };
                page.shouldUpdate().should.be.true;
            });
        });
        describe('when this sha is the same with local page sha', () => {
            beforeEach(() => {
                sandbox.replace(config.confluence, 'forceUpdate', false);
            });
            it('should return false', () => {
                const page = new RemotePage(id, version, title, meta, parentId);
                page.localPage = { title: 'local page', meta: new Meta('repo', 'path', 'sha') };
                page.shouldUpdate().should.be.false;
            });
        });
    });
    describe('sync', () => {
        let page, confluence, renderer;
        beforeEach(() => {
            page = new RemotePage(id, version, title, meta, parentId);
            renderer = sandbox.createStubInstance(AssetRenderer);
            confluence = sandbox.createStubInstance(ConfluenceSdk);
            confluence.deletePage.resolves();
            confluence.createAttachment.resolves();
        });
        describe('when this page has no related localPage', () => {
            it('should delete the remote page', () => {
                return page.sync(renderer, confluence).then(() => {
                    sandbox.assert.calledWith(confluence.deletePage, id);
                });
            });
        });
        describe('when the related local page has not changed', () => {
            beforeEach(() => {
                sandbox.replace(config.confluence, 'forceUpdate', false);
            });
            it('should skip update', () => {
                const page = new RemotePage(id, version, title, meta, parentId);
                page.localPage = new LocalPage('local page', new Meta('repo', 'path', 'sha'));
                return page.sync(renderer, confluence).then((skipped) => {
                    skipped.should.equal(page);
                    sandbox.assert.notCalled(confluence.deletePage);
                    sandbox.assert.notCalled(confluence.updatePage);
                    sandbox.assert.notCalled(confluence.createAttachment);
                });
            });
        });
        describe('when the related local page has changed', () => {
            const attachmentPath = 'attachment/path';
            let attachment;
            beforeEach(() => {
                sandbox.replace(config.confluence, 'forceUpdate', false);
                page.localPage = new LocalPage('local page', new Meta('repo', 'path', 'other-sha'));
                confluence.updatePage.resolves(page);
                attachment = new Attachment(attachmentPath);
                renderer = sandbox.createStubInstance(AssetRenderer);
                renderer.renderPage.callsFake(() => {
                    page.localPage.attachments = [attachment];
                    return page.localPage;
                });
            });
            it('should update the remote page', () => {
                return page.sync(renderer, confluence).then((updated) => {
                    updated.should.equal(page);
                    sandbox.assert.notCalled(confluence.deletePage);
                    sandbox.assert.calledWith(confluence.updatePage, page);
                    sandbox.assert.calledWith(confluence.createAttachment, page.id, attachmentPath);
                });
            });
        });
    });
});
