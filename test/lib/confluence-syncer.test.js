import sinon from 'sinon';
import { sync, cleanup } from '../../lib/confluence-syncer.js';
import ConfluenceSDK from '../../lib/confluence-sdk.js';
import logger from '../../lib/logger.js';
import context from '../../lib/context.js';
import config from '../../lib/config.js';
import { Meta, LocalPage, RemotePage } from '../../lib/models/index.js';
import PageRenderer from '../../lib/renderers/page-renderer.js';
import AssetRenderer from '../../lib/renderers/asset-renderer.js';

const sandbox = sinon.createSandbox();

describe('confluence-syncer', () => {
    const [repo, siteName] = ['repo', 'Site Name'];
    let getContextMock;
    let sdkMock = {};
    let loggerMock = {};

    beforeEach(() => {
        [
            'findPage',
            'getChildPages',
            'updatePage',
            'createPage',
            'deletePage',
            'createAttachment'
        ].forEach((method) => {
            sdkMock[method] = sandbox.stub(
                ConfluenceSDK.prototype,
                method
            );
        });

        ['fail', 'info', 'debug', 'warn'].forEach((method) => {
            loggerMock[method] = sandbox.stub(logger, method);
        });
        getContextMock = sandbox.stub(context, 'getContext');
        sandbox.stub(PageRenderer.prototype, 'render');
    });
    afterEach(() => {
        sandbox.restore();
    });
    describe('sync', () => {
        describe('when an error occurs', () => {
            describe('when debug is not enabled', () => {
                it('should catch error and set action as failed', () => {
                    const error = new Error('Something went wrong');
                    sdkMock.findPage.rejects(error);
                    getContextMock.returns({ pages: [], sectionHierarchy: {} });
                    return sync().then(() => {
                        sandbox.assert.calledWith(loggerMock.fail, error);
                    });
                });
            });
            describe('when debug is enabled', () => {
                beforeEach(() => {
                    sandbox.stub(logger, 'isDebug').returns(true);
                    sandbox.replace(config.confluence, 'token', '***');
                });
                it('should set action as failed and debug log the config', () => {
                    const error = 'Something went wrong';
                    sdkMock.findPage.rejects(new Error(error));
                    getContextMock.returns({ pages: [], sectionHierarchy: {} });
                    return sync().then(() => {
                        const expected = `Config:\n${JSON.stringify(config, null, 2)}`;
                        sandbox.assert.calledWith(loggerMock.fail, sinon.match.has('message', error));
                        sandbox.assert.calledWith(loggerMock.debug, expected);
                    });
                });
            });
        });
        describe('sync home page', () => {
            describe('when parent page is not configured', () => {
                beforeEach(() => {
                    sandbox.replace(config, 'confluence', { parentPage: null });
                });
                describe('when README.md not exists', () => {
                    let readMe;
                    beforeEach(() => {
                        readMe = new LocalPage(siteName, new Meta(repo));
                        readMe.html = `<h1>${siteName}</h1>`;
                        readMe.attachments = [];
                        readMe.attachmentFiles = [];
                        readMe.parentPageId = undefined;
                        sdkMock.findPage.withArgs(siteName).resolves();
                        sdkMock.getChildPages.resolves(new Map());
                        getContextMock.returns({ siteName, repo, pages: [], sectionHierarchy: {}, readMe: null });
                        sdkMock.createPage.resolves(new RemotePage(100, 1, siteName, new Meta(repo), 1));
                    });
                    it('should create home page without parent', () => {
                        return sync().then(() => {
                            sandbox.assert.notCalled(loggerMock.fail);
                            sandbox.assert.calledWith(sdkMock.createPage, readMe);
                        });
                    });
                });
            });
            describe('when parent page is configured', () => {
                describe('when parent page not found', () => {
                    it('should fail with error', () => {
                        const error = `The page configured as parent (${config.confluence.parentPage}) does not exist in confluence`;
                        getContextMock.returns({ pages: [], sectionHierarchy: {} });
                        sdkMock.findPage.resolves(undefined);
                        return sync().then(() => {
                            sandbox.assert.calledWith(loggerMock.fail, sinon.match.has('message', error));
                        });
                    });
                });
                describe('when parent page exists', () => {
                    let parentPage;
                    beforeEach(() => {
                        parentPage = new RemotePage(1, 1, 'Parent Page', new Meta('git-repo'));
                        sdkMock.findPage.withArgs(config.confluence.parentPage).resolves(parentPage);
                    });
                    describe('when home page does not exist', () => {
                        let readMe;
                        beforeEach(() => {
                            readMe = new LocalPage(siteName, new Meta(repo));
                            readMe.html = `<h1>${siteName}</h1>`;
                            readMe.parentPageId = parentPage.id;
                            readMe.attachments = [];
                            readMe.attachmentFiles = [];
                            sdkMock.findPage.withArgs(siteName).resolves();
                            sdkMock.getChildPages.resolves(new Map());
                        });
                        describe('when README.md not exists', () => {
                            beforeEach(() => {
                                getContextMock.returns({ siteName, repo, pages: [], sectionHierarchy: {}, readMe: null });
                                sdkMock.createPage.resolves(new RemotePage(100, 1, siteName, new Meta(repo), 1));
                            });
                            it('should create the page using the site name as content', () => {
                                return sync().then(() => {
                                    sandbox.assert.notCalled(loggerMock.fail);
                                    sandbox.assert.calledWith(sdkMock.createPage, readMe);
                                });
                            });
                        });
                        describe('when README.md exists', () => {
                            let readMe;
                            beforeEach(() => {
                                readMe = new LocalPage(siteName, new Meta(repo, '/path/to/README.md', 'abc123'));
                            });
                            describe('when README.md contains no images', () => {
                                beforeEach(() => {
                                    getContextMock.returns({ siteName, repo, pages: [], sectionHierarchy: {}, readMe });
                                    sdkMock.createPage.resolves(new RemotePage(100, 1, siteName, new Meta(repo), 1));
                                });
                                it('should create the page using the README.md as content', () => {
                                    return sync().then(() => {
                                        sandbox.assert.notCalled(loggerMock.fail);
                                        sandbox.assert.calledWith(sdkMock.createPage, readMe);
                                    });
                                });
                            });
                        });
                    });
                    describe('when home page exists', () => {
                        let existingPage;
                        beforeEach(() => {
                            existingPage = sandbox.createStubInstance(RemotePage);
                            existingPage.sync.resolves({ id: 100 });
                            sdkMock.findPage.withArgs(siteName).resolves(existingPage);
                            sdkMock.getChildPages.resolves([]);
                        });
                        describe('when README.md not exists', () => {
                            beforeEach(() => {
                                getContextMock.returns({ siteName, repo, pages: [], sectionHierarchy: {}, readMe: null });
                            });
                            describe('when home page sha does not match', () => {
                                it('should update the page using the site name as content', () => {
                                    return sync().then(() => {
                                        sandbox.assert.notCalled(loggerMock.fail);
                                        sandbox.assert.notCalled(sdkMock.createAttachment);
                                        sandbox.assert.calledWith(existingPage.sync, sinon.match.instanceOf(AssetRenderer), sinon.match.instanceOf(ConfluenceSDK));
                                    });
                                });
                            });
                        });

                        describe('when repo does not match', () => {
                            beforeEach(() => {
                                existingPage.repoConflict.returns(true);
                                existingPage.meta = { repo };
                                getContextMock.returns({ siteName, repo: 'other-repo', pages: [], sectionHierarchy: {}, readMe: null });
                            });
                            it('should fail with error', () => {
                                return sync().then(() => {
                                    const error = `Page "${siteName}" already exist for another repo "${repo}"`;
                                    sandbox.assert.calledWith(loggerMock.fail, sinon.match.has('message', error));
                                });
                            });
                        });
                    });
                });
            });
        });
        describe('sync child pages', () => {
            let parentPage, readMe;
            beforeEach(() => {
                parentPage = new RemotePage(1, 1, 'Parent Page', new Meta(repo));
                readMe = sandbox.createStubInstance(LocalPage);
                readMe.sync.resolves({ id: 100 });
                sdkMock.findPage.withArgs(config.confluence.parentPage).resolves(parentPage);
            });
            describe('when local page is new', () => {
                let local;
                beforeEach(() => {
                    local = sandbox.createStubInstance(LocalPage);
                    local.meta = new Meta(repo, 'path');
                    getContextMock.returns({ siteName, repo, pages: [local], sectionHierarchy: {}, readMe });
                    sdkMock.getChildPages.resolves(new Map());
                });
                it('should sync the local page', () => {
                    return sync().then(() => {
                        sandbox.assert.notCalled(loggerMock.fail);
                        sandbox.assert.calledWith(local.sync, sinon.match.instanceOf(AssetRenderer), sinon.match.instanceOf(ConfluenceSDK));
                    });
                });
            });
            describe('when remote page is orphan', () => {
                let remote;
                beforeEach(() => {
                    remote = sandbox.createStubInstance(RemotePage);
                    getContextMock.returns({ siteName, repo, pages: [], sectionHierarchy: {}, readMe });
                    sdkMock.getChildPages.resolves(new Map().set('path', remote));
                });
                it('should sync the remote page', () => {
                    return sync().then(() => {
                        sandbox.assert.notCalled(loggerMock.fail);
                        sandbox.assert.calledWith(remote.sync, sinon.match.instanceOf(AssetRenderer), sinon.match.instanceOf(ConfluenceSDK));
                    });
                });
            });
            describe('when remote matched local page', () => {
                const path = 'path';
                let remote, local;
                beforeEach(() => {
                    local = sandbox.createStubInstance(LocalPage);
                    local.meta = new Meta(repo, path);
                    remote = sandbox.createStubInstance(RemotePage);
                    getContextMock.returns({ siteName, repo, pages: [local], sectionHierarchy: {}, readMe });
                    sdkMock.getChildPages.resolves(new Map().set(path, remote));
                });
                it('should sync the remote page', () => {
                    return sync().then(() => {
                        sandbox.assert.notCalled(loggerMock.fail);
                        sandbox.assert.calledWith(remote.sync, sinon.match.instanceOf(AssetRenderer), sinon.match.instanceOf(ConfluenceSDK));
                        remote.localPage.should.equal(local);
                    });
                });
            });
        });


    });
    describe('cleanup', () => {
        const siteName = 'My Site';
        beforeEach(() => {
            getContextMock.returns({ siteName, sectionHierarchy: {} });
        });
        describe('when unexpected error occurs', () => {
            const error = new Error('Something went wrong');
            beforeEach(() => {
                sdkMock.findPage.withArgs(siteName).rejects(error);
            });
            it('should catch error and set action as failed', () => {
                return cleanup().then(() => {
                    sandbox.assert.calledWith(loggerMock.fail, error);
                });
            });
        });
        describe('when no home page found in confluence', () => {
            it('should log warning', () => {
                const message = `No page with title "${siteName}" found in confluence, nothing to clean here`;
                return cleanup().then(() => {
                    sandbox.assert.calledWith(loggerMock.warn, message);
                });
            });
        });
        describe('when homepage exists', () => {
            const parentPage = { id: 100 };
            const remotePages = [{ title: 'Page 101', id: 101 }, { title: 'Page 102', id: 102 }];
            beforeEach(() => {
                sdkMock.findPage.withArgs(siteName).resolves(parentPage);
                sdkMock.getChildPages.withArgs(parentPage.id).resolves(remotePages);
                sdkMock.deletePage.resolves();
            });
            it('should unpublish the homepage along with any children', () => {
                return cleanup().then(() => {
                    remotePages.concat(parentPage).forEach(page => {
                        sandbox.assert.calledWith(sdkMock.deletePage, page.id);
                    });
                });
            });
        });
    });
});
