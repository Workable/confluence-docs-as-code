import { resolve } from 'node:path';
import sinon from 'sinon';
import { sync } from '../../lib/confluence-syncer.mjs';
import ConfluenceSDK from '../../lib/confluence-sdk.mjs';
import KrokiSDK from '../../lib/kroki-sdk.mjs';
import logger from '../../lib/logger.mjs';
import context from '../../lib/context.mjs';
import config from '../../lib/config.mjs';
import md2html from '../../lib/md2html.mjs';
import util from '../../lib/util.mjs';

const sandbox = sinon.createSandbox();

describe('confluence-syncer', () => {
    let getContextMock;
    let sdkMock = {};
    let loggerMock = {};
    let md2htmlMock;
    let toPngMock;
    const root = 1;
    const parentPage = { id: 1 };

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
        md2htmlMock = sandbox.stub(md2html, 'render');
        toPngMock = sandbox.stub(KrokiSDK.prototype, 'toPng');
    });
    afterEach(() => {
        sandbox.restore();
    });
    describe('when an error occurs', () => {
        describe('when debug is not enabled', () => {
            it('should catch error and set action as failed', () => {
                const error = new Error('Something went wrong');
                sdkMock.findPage.rejects(error);
                getContextMock.returns({ pages: [] });
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
                getContextMock.returns({ pages: [] });
                return sync().then(() => {
                    const expected = `Config:\n${JSON.stringify(config, null, 2)}`;
                    sandbox.assert.calledWith(loggerMock.fail, sinon.match.has('message', error));
                    sandbox.assert.calledWith(loggerMock.debug, expected);
                });
            });
        });
    });
    describe('sync home page', () => {
        describe('when parent page is configured', () => {
            describe('when parent page not found', () => {
                it('should fail with error', () => {
                    const error = `The page configured as parent (${config.confluence.parentPage}) does not exist in confluence`;
                    getContextMock.returns({ pages: [] });
                    sdkMock.findPage.resolves(undefined);
                    return sync().then(() => {
                        sandbox.assert.calledWith(loggerMock.fail, sinon.match.has('message', error));
                    });
                });
            });
            describe('when parent page exists', () => {
                beforeEach(() => {
                    sdkMock.findPage.withArgs(config.confluence.parentPage).resolves(parentPage);
                });
                describe('when home page does not exist', () => {
                    const repo = 'repo';
                    const siteName = 'Site Name';
                    const html = `<h1>${siteName}</h1>`;
                    beforeEach(() => {
                        sdkMock.findPage.withArgs(siteName).resolves();
                        sdkMock.getChildPages.resolves([]);
                    });
                    describe('when README.md not exists', () => {
                        beforeEach(() => {
                            getContextMock.returns({ siteName, repo, pages: [], readMe: null });
                        });
                        it('should create the page using the site name as content', () => {
                            return sync().then(() => {
                                sandbox.assert.calledWith(sdkMock.createPage, siteName, html, parentPage.id, { repo });
                                sandbox.assert.notCalled(loggerMock.fail);
                            });
                        });
                    });
                    describe('when README.md exists', () => {
                        const html = '<h1>From README.md</h1>';
                        const readMe = { path: '/path/to/README.md', sha: 'abc123', exists: true };
                        describe('when README.md contains no images', () => {
                            beforeEach(() => {
                                md2htmlMock.withArgs(readMe.path).returns({ html, images: [], graphs: [] });
                                getContextMock.returns({ siteName, repo, pages: [], readMe });
                            });
                            it('should create the page using the README.md as content', () => {
                                return sync().then(() => {
                                    sandbox.assert.calledWith(sdkMock.createPage, siteName, html, parentPage.id, { repo, ...readMe });
                                    sandbox.assert.notCalled(sdkMock.createAttachment);
                                    sandbox.assert.notCalled(loggerMock.fail);
                                });
                            });
                        });
                        describe('when README.md contains images', () => {
                            const id = 1;
                            const imagePath = 'test/fixtures/images/img-1.png';
                            const sha = '14505743f8bcd27ceb3a3d0fb8260ea2de3c6b3bb48c029c0061bb05baa70332';
                            beforeEach(() => {
                                md2htmlMock.withArgs(readMe.path).returns({ html, images: [imagePath], graphs: [] });
                                getContextMock.returns({ siteName, repo, pages: [], readMe });
                                sdkMock.createPage.returns(id);
                            });
                            it('should create the page using the content and images from README.md', () => {
                                return sync().then(() => {
                                    sandbox.assert.notCalled(loggerMock.fail);
                                    sandbox.assert.calledWith(sdkMock.createPage, siteName, html, parentPage.id, { repo, ...readMe });
                                    sandbox.assert.calledWith(sdkMock.createAttachment, id, resolve(imagePath), { sha });
                                });
                            });
                        });

                    });
                });
                describe('when home page exists', () => {
                    const repo = 'repo';
                    const siteName = 'Site Name';
                    const html = `<h1>${siteName}</h1>`;
                    const existingPage = { id: 9, repo, sha: 'abc123', version: 10 };
                    beforeEach(() => {
                        sdkMock.findPage.withArgs(siteName).resolves(existingPage);
                        sdkMock.getChildPages.resolves([]);
                    });
                    describe('when README.md not exists', () => {
                        beforeEach(() => {
                            getContextMock.returns({ siteName, repo, pages: [], readMe: null });
                        });
                        describe('when home page sha does not match', () => {
                            it('should update the page using the site name as content', () => {
                                return sync().then(() => {
                                    sandbox.assert.calledWith(sdkMock.updatePage, existingPage.id, existingPage.version + 1, siteName, html, parentPage.id, { repo });
                                    sandbox.assert.notCalled(sdkMock.createAttachment);
                                    sandbox.assert.notCalled(loggerMock.fail);
                                });
                            });
                        });
                    });

                    describe('when repo does not match', () => {
                        beforeEach(() => {
                            getContextMock.returns({ siteName, repo: 'other-repo', pages: [], readMe: null });
                        });
                        it('should fail with error', () => {
                            return sync().then(() => {
                                const error = `Page "${siteName}" already exist for another repo "${repo}"`;
                                sandbox.assert.calledWith(loggerMock.fail, sinon.match.has('message', error));
                            });
                        });
                    });
                    describe('when README.md exists', () => {
                        const html = '<h1>From README.md</h1>';
                        const readMe = { path: '/path/to/README.md', sha: 'abc123' };
                        beforeEach(() => {
                            md2htmlMock.withArgs(readMe.path).returns({ html, images: [], graphs: [] });
                            getContextMock.returns({ siteName, repo, pages: [], readMe });
                        });
                        describe('when home page sha matches', () => {
                            it('should not update the page', () => {
                                return sync().then(() => {
                                    sandbox.assert.notCalled(loggerMock.fail);
                                    sandbox.assert.notCalled(sdkMock.createAttachment);
                                    sandbox.assert.notCalled(sdkMock.createPage);
                                    sandbox.assert.notCalled(sdkMock.updatePage);
                                });
                            });
                        });
                        describe('when home page sha does not match', () => {
                            const readMe = { path: '/path/to/README.md', sha: 'abc456', exists: true };
                            beforeEach(() => {
                                getContextMock.returns({ siteName, repo, pages: [], readMe });
                            });
                            it('should update the page using the README.md as content', () => {
                                return sync().then(() => {
                                    sandbox.assert.notCalled(loggerMock.fail);
                                    sandbox.assert.notCalled(sdkMock.createAttachment);
                                    sandbox.assert.calledWith(
                                        sdkMock.updatePage,
                                        existingPage.id,
                                        existingPage.version + 1,
                                        siteName,
                                        html,
                                        parentPage.id,
                                        { repo, ...readMe }
                                    );
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    describe('sync child pages', () => {
        describe('when there are all kind of changed to be performed', () => {
            const repo = 'git-repo';
            const siteName = 'Site Name';
            const readMe = { path: '/path/to/README.md', sha: 'abc123' };
            const image1 = {
                path: 'test/fixtures/images/img-1.png',
                sha: '14505743f8bcd27ceb3a3d0fb8260ea2de3c6b3bb48c029c0061bb05baa70332'
            };
            const image2 = {
                path: 'test/fixtures/images/img-2.png',
                sha: '8124a1c6d4fd2895b9e1e4e4f7413342413733fb1094aa3b6840933072936655'
            };
            const existingPage = { id: 1, repo, sha: 'abc123', version: 1 };
            const deletedPage = {
                path: 'docs/deleted.md', sha: 'abc123', id: 100
            };
            const updatePage = {
                title: 'Updated Page', path: 'docs/updated.md', sha: 'abc123', html: '<h1>Updated Page</h1>',
                images: [image1.path], graphs: ['update-page-graph.mmd'], repo, version: 1, id: 200
            };
            const createPage = {
                title: 'Created Page', path: 'docs/created.md', sha: 'abc456', html: '<h1>Created Page</h1>',
                images: [image2.path], graphs: ['create-page-graph.mmd', 'unprocessable-graph.mmd'], repo, id: 300
            };
            const remotePages = [deletedPage, updatePage].map(({ path, sha, version, id }) => ({ id, path, sha, version }));
            const localPages = [createPage, updatePage].map(({ path, title }) => ({ title, path, sha: 'abc456', exists: true }));
            const pageRefs = { pages: util.keyBy(localPages.concat(readMe), 'path') };
            beforeEach(() => {
                sdkMock.findPage.withArgs(config.confluence.parentPage).resolves(parentPage);
                sdkMock.findPage.withArgs(siteName).resolves(existingPage);
                sdkMock.createPage.resolves(createPage.id);
                sdkMock.updatePage.resolves();
                sdkMock.deletePage.resolves();
                sdkMock.getChildPages.withArgs(root).resolves(remotePages);
                getContextMock.returns({ siteName, repo, readMe, pages: localPages });
                md2htmlMock.withArgs(resolve(createPage.path), pageRefs)
                    .returns({ html: createPage.html, images: createPage.images, graphs: createPage.graphs });
                md2htmlMock.withArgs(resolve(updatePage.path), pageRefs)
                    .returns({ html: updatePage.html, images: updatePage.images, graphs: updatePage.graphs });
                toPngMock.withArgs(updatePage.graphs[0]).resolves(updatePage.graphs[0].slice(0, -4) + '.png');
                toPngMock.withArgs(createPage.graphs[0]).resolves(createPage.graphs[0].slice(0, -4) + '.png');
                toPngMock.withArgs(createPage.graphs[1]).resolves();
            });
            it('should sync page changes with attachments', () => {
                return sync().then(() => {
                    sandbox.assert.notCalled(loggerMock.fail);
                    sandbox.assert.callOrder(sdkMock.deletePage, sdkMock.updatePage, sdkMock.createPage);
                    sandbox.assert.calledWith(
                        sdkMock.createPage,
                        createPage.title,
                        createPage.html,
                        root,
                        { repo, path: createPage.path, sha: createPage.sha }
                    );
                    sandbox.assert.calledWith(
                        sdkMock.updatePage,
                        updatePage.id,
                        updatePage.version + 1,
                        updatePage.title,
                        updatePage.html,
                        root,
                        { repo, path: updatePage.path, sha: 'abc456' }
                    );
                    sandbox.assert.calledWith(sdkMock.deletePage, deletedPage.id);
                    // Attachments
                    sandbox.assert.callCount(sdkMock.createAttachment, 4);
                    sandbox.assert.calledWith(sdkMock.createAttachment, createPage.id, resolve(createPage.images[0]), { sha: image2.sha });
                    sandbox.assert.calledWith(sdkMock.createAttachment, updatePage.id, resolve(updatePage.images[0]), { sha: image1.sha });
                    sandbox.assert.calledWith(sdkMock.createAttachment, createPage.id, resolve(createPage.graphs[0].slice(0, -4) + '.png'));
                    sandbox.assert.calledWith(sdkMock.createAttachment, updatePage.id, resolve(updatePage.graphs[0].slice(0, -4) + '.png'));
                    loggerMock.warn.calledWith(`Graph "${createPage.graphs[1]}" for page #${createPage.id} could not be processed`);
                });
            });
        });
    });
});

