import { resolve } from 'node:path';
import sinon from 'sinon';
import { sync, cleanup } from '../../lib/confluence-syncer.js';
import ConfluenceSDK from '../../lib/confluence-sdk.js';
import KrokiSDK from '../../lib/kroki-sdk.js';
import PlantUmlSdk from '../../lib/plantuml-sdk.js';
import logger from '../../lib/logger.js';
import context from '../../lib/context.js';
import config from '../../lib/config.js';
import md2html from '../../lib/md2html.js';
import util from '../../lib/util.js';
import { Image, Graph } from '../../lib/models/index.js';

const sandbox = sinon.createSandbox();

describe('confluence-syncer', () => {
    let getContextMock;
    let sdkMock = {};
    let loggerMock = {};
    let md2htmlMock;
    let krokiMock;
    let plantUmlMock;
    const commonMeta = {
        git_ref: config.github.refName,
        git_sha: config.github.sha,
        publisher_version: config.version
    };
    const [majorVer, minorVer, patchVer] = config.version.split('.').map(i => Number.parseInt(i));

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
        krokiMock = sandbox.stub(KrokiSDK.prototype, 'toPng');
        plantUmlMock = sandbox.stub(PlantUmlSdk.prototype, 'toPng');
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
                    const { repo, siteName, parentPage } = prepareState();
                    beforeEach(() => {
                        sdkMock.findPage.withArgs(config.confluence.parentPage).resolves(parentPage);
                    });
                    describe('when home page does not exist', () => {
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
                                    sandbox.assert.notCalled(loggerMock.fail);
                                    sandbox.assert.calledWith(sdkMock.createPage, siteName, html, parentPage.id, { repo, ...commonMeta });
                                });
                            });
                        });
                        describe('when README.md exists', () => {
                            const html = '<h1>From README.md</h1>';
                            const readMe = { path: '/path/to/README.md', sha: 'abc123', exists: true };
                            const meta = { repo, ...readMe, ...commonMeta };
                            delete meta.exists;
                            describe('when README.md contains no images', () => {
                                beforeEach(() => {
                                    md2htmlMock.withArgs(readMe).returns({ html, attachments: [] });
                                    getContextMock.returns({ siteName, repo, pages: [], readMe });
                                });
                                it('should create the page using the README.md as content', () => {
                                    return sync().then(() => {
                                        sandbox.assert.notCalled(loggerMock.fail);
                                        sandbox.assert.calledWith(sdkMock.createPage, siteName, html, parentPage.id, meta);
                                        sandbox.assert.notCalled(sdkMock.createAttachment);
                                    });
                                });
                            });
                            describe('when README.md contains images', () => {
                                const id = 1;
                                beforeEach(() => {
                                    md2htmlMock.withArgs(readMe).returns({
                                        html, attachments: [new Image('image/path/image-file.png')]
                                    });
                                    getContextMock.returns({ siteName, repo, pages: [], readMe });
                                    sdkMock.createPage.returns(id);
                                });
                                it('should create the page using the content and images from README.md', () => {
                                    return sync().then(() => {
                                        sandbox.assert.notCalled(loggerMock.fail);
                                        sandbox.assert.calledWith(sdkMock.createPage, siteName, html, parentPage.id, meta);
                                        sandbox.assert.calledWith(sdkMock.createAttachment, id, resolve('image/path/image-file.png'));
                                    });
                                });
                            });

                        });
                    });
                    describe('when home page exists', () => {
                        const { repo, siteName, existingPage } = prepareState();
                        const html = `<h1>${siteName}</h1>`;
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
                                        sandbox.assert.calledWith(sdkMock.updatePage, existingPage.id, existingPage.version + 1, siteName, html, parentPage.id, { repo, ...commonMeta });
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
                            describe('when home page sha matches', () => {
                                const readMe = { path: '/path/to/README.md', sha: 'abc123', exists: true };
                                beforeEach(() => {
                                    getContextMock.returns({ siteName, repo, pages: [], readMe });
                                    md2htmlMock.withArgs(readMe).returns({ html, attachments: [] });
                                });
                                describe('when force update is disabled', () => {
                                    beforeEach(() => {
                                        sandbox.replace(config.confluence, 'forceUpdate', false);
                                    });
                                    it('should not update the page', () => {
                                        return sync().then(() => {
                                            sandbox.assert.notCalled(loggerMock.fail);
                                            sandbox.assert.notCalled(sdkMock.createAttachment);
                                            sandbox.assert.notCalled(sdkMock.createPage);
                                            sandbox.assert.notCalled(sdkMock.updatePage);
                                        });
                                    });
                                });

                                describe('when force update is enabled', () => {
                                    const meta = { repo, ...readMe, ...commonMeta };
                                    delete meta.exists;
                                    beforeEach(() => {
                                        sandbox.replace(config.confluence, 'forceUpdate', true);
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
                                                meta
                                            );
                                        });
                                    });
                                });
                                describe('when publisher version changes', () => {
                                    const meta = { repo, ...readMe, ...commonMeta };
                                    delete meta.exists;
                                    beforeEach(() => {
                                        sandbox.replace(config.confluence, 'forceUpdate', false);
                                        getContextMock.returns({ siteName, repo, pages: [], readMe });
                                        existingPage.publisher_version = `${majorVer + 1}.0.0`;
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
                                                meta
                                            );
                                        });
                                    });
                                });
                            });
                            describe('when home page sha does not match', () => {
                                const { readMe, existingPage } = prepareState();
                                readMe.exists = true;
                                const meta = { repo, ...readMe, ...commonMeta };
                                delete meta.exists;
                                beforeEach(() => {
                                    getContextMock.returns({ siteName, repo, pages: [], readMe });
                                    md2htmlMock.withArgs(readMe).returns({ html, attachments: [] });
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
                                            meta
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
            const publisher_version = config.version;
            const { root, repo, parentPage, siteName, existingPage, readMe } = prepareState();
            describe('when page content has not changed', () => {
                const [path, sha] = ['docs/unchanged.md', 'abc345'];
                const remotePages = [{ id: 100, path, sha, version: 1, publisher_version }];
                const localPages = [{ title: 'Unchanged', path, sha, exists: true }];
                beforeEach(() => {
                    sdkMock.findPage.withArgs(config.confluence.parentPage).resolves(parentPage);
                    sdkMock.findPage.withArgs(siteName).resolves(existingPage);
                    getContextMock.returns({ siteName, repo, readMe, pages: localPages });
                    sdkMock.getChildPages.withArgs(root).resolves(remotePages);
                });
                describe('when force update is disabled', () => {
                    beforeEach(() => {
                        sandbox.replace(config.confluence, 'forceUpdate', false);
                    });
                    it('should skip updating the unchanged page', () => {
                        return sync().then(() => {
                            sandbox.assert.notCalled(loggerMock.fail);
                            sandbox.assert.notCalled(sdkMock.deletePage);
                            sandbox.assert.notCalled(sdkMock.updatePage);
                            sandbox.assert.notCalled(sdkMock.createPage);
                        });
                    });
                });
                describe('when force update is enabled', () => {
                    const html = '<h1>Unchanged Page</h1>';
                    beforeEach(() => {
                        sandbox.replace(config.confluence, 'forceUpdate', true);
                        md2htmlMock.returns({ html, attachments: [] });
                        sdkMock.updatePage.resolves();
                    });
                    it('should also update unchanged pages', () => {
                        return sync().then(() => {
                            sandbox.assert.notCalled(loggerMock.fail);
                            sandbox.assert.notCalled(sdkMock.deletePage);
                            sandbox.assert.notCalled(sdkMock.createPage);
                            sandbox.assert.calledWith(
                                sdkMock.updatePage, 100, 2, 'Unchanged', html, root, { repo, path, sha, ...commonMeta }
                            );
                        });
                    });
                });
                describe('when publisher version changes', () => {
                    const html = '<h1>Unchanged Page</h1>';
                    beforeEach(() => {
                        sandbox.replace(config.confluence, 'forceUpdate', false);
                        md2htmlMock.returns({ html, attachments: [] });
                        sdkMock.updatePage.resolves();
                    });
                    describe('when patch version changes', () => {
                        it('should skip updating the unchanged page', () => {
                            remotePages[0].publisher_version = `${majorVer}.${minorVer}.${patchVer + 1}`;
                            return sync().then(() => {
                                sandbox.assert.notCalled(loggerMock.fail);
                                sandbox.assert.notCalled(sdkMock.deletePage);
                                sandbox.assert.notCalled(sdkMock.updatePage);
                                sandbox.assert.notCalled(sdkMock.createPage);
                            });
                        });
                    });
                    [
                        ['version missing', null],
                        ['major version changes', `${majorVer + 1}.0.0`],
                        ['minor version changes', `${majorVer}.${minorVer + 1}.0`]
                    ].forEach(testCase => {
                        describe(`when publisher ${testCase[0]}`, () => {
                            it('should also update unchanged pages', () => {
                                remotePages[0].publisher_version = testCase[1];
                                return sync().then(() => {
                                    sandbox.assert.notCalled(loggerMock.fail);
                                    sandbox.assert.notCalled(sdkMock.deletePage);
                                    sandbox.assert.notCalled(sdkMock.createPage);
                                    sandbox.assert.calledWith(
                                        sdkMock.updatePage, 100, 2, 'Unchanged', html, root, { repo, path, sha, ...commonMeta }
                                    );
                                });
                            });
                        });
                    });
                });
                describe('when publisher version missing', () => {
                    const html = '<h1>Unchanged Page</h1>';
                    beforeEach(() => {
                        sandbox.replace(config.confluence, 'forceUpdate', false);
                        md2htmlMock.returns({ html, attachments: [] });
                        sdkMock.updatePage.resolves();
                        remotePages[0].publisher_version = null;
                    });
                    it('should also update unchanged pages', () => {
                        return sync().then(() => {
                            sandbox.assert.notCalled(loggerMock.fail);
                            sandbox.assert.notCalled(sdkMock.deletePage);
                            sandbox.assert.notCalled(sdkMock.createPage);
                            sandbox.assert.calledWith(
                                sdkMock.updatePage, 100, 2, 'Unchanged', html, root, { repo, path, sha, ...commonMeta }
                            );
                        });
                    });
                });
            });
            describe('when there are all kind of changed to be performed', () => {
                describe('when all graphs rendered with kroki', () => {
                    const renderers = ['kroki', 'kroki'];
                    const state = prepareState(renderers);
                    beforeEach(() => {
                        prepareMocks(state);
                    });
                    it('should sync page changes with attachments', () => {
                        return assertSync(state);
                    });
                });
                describe('when mermaid graphs are rendered as confluence plugin', () => {
                    const renderers = ['mermaid-plugin', 'plantuml'];
                    const state = prepareState(renderers);
                    beforeEach(() => {
                        prepareMocks(state);
                    });
                    it('should sync page changes with attachments', () => {
                        return assertSync(state);
                    });
                });
            });
        });
        function assertSync({ root, repo, deletedPage, updatePage, createPage, renderers }) {
            return sync().then(() => {
                sandbox.assert.notCalled(loggerMock.fail);
                sandbox.assert.callOrder(sdkMock.deletePage, sdkMock.updatePage, sdkMock.createPage);
                sandbox.assert.calledWith(
                    sdkMock.createPage,
                    createPage.title,
                    createPage.html,
                    root,
                    { repo, path: createPage.path, sha: createPage.sha, ...commonMeta }
                );
                sandbox.assert.calledWith(
                    sdkMock.updatePage,
                    updatePage.id,
                    updatePage.version + 1,
                    updatePage.title,
                    updatePage.html,
                    root,
                    { repo, path: updatePage.path, sha: 'abc456', ...commonMeta }
                );
                sandbox.assert.calledWith(sdkMock.deletePage, deletedPage.id);
                // Attachments

                sandbox.assert.calledWith(sdkMock.createAttachment, createPage.id, resolve(createPage.attachments[0].path));
                sandbox.assert.calledWith(sdkMock.createAttachment, updatePage.id, resolve(updatePage.attachments[0].path));
                if (renderers[0] === 'kroki') {
                    sandbox.assert.calledWith(sdkMock.createAttachment, createPage.id, resolve(createPage.attachments[1].path.slice(0, -4) + '.png'));
                    sandbox.assert.calledWith(sdkMock.createAttachment, updatePage.id, resolve(updatePage.attachments[1].path.slice(0, -4) + '.png'));
                    sandbox.assert.callCount(sdkMock.createAttachment, 4);
                    sandbox.assert.calledWith(loggerMock.warn, `Graph "${createPage.attachments[2].path}" for page #${createPage.id} could not be processed`);
                } else {
                    sandbox.assert.calledWith(sdkMock.createAttachment, createPage.id, resolve(createPage.attachments[1].path));
                    sandbox.assert.calledWith(sdkMock.createAttachment, createPage.id, resolve(createPage.attachments[2].path.slice(0, -5) + '.png'));
                    sandbox.assert.calledWith(sdkMock.createAttachment, updatePage.id, resolve(updatePage.attachments[1].path));
                    sandbox.assert.callCount(sdkMock.createAttachment, 5);
                    sandbox.assert.notCalled(loggerMock.warn);
                }

            });
        }
        function prepareMocks(state) {
            const {
                root, repo, readMe, parentPage, siteName, existingPage, updatePage,
                createPage, remotePages, localPages, pageRefs
            } = state;
            sdkMock.findPage.withArgs(config.confluence.parentPage).resolves(parentPage);
            sdkMock.findPage.withArgs(siteName).resolves(existingPage);
            sdkMock.createPage.resolves(createPage.id);
            sdkMock.updatePage.resolves();
            sdkMock.deletePage.resolves();
            sdkMock.getChildPages.withArgs(root).resolves(remotePages);
            getContextMock.returns({ siteName, repo, readMe, pages: localPages });
            md2htmlMock.withArgs(localPages[0], pageRefs)
                .returns({ html: createPage.html, attachments: createPage.attachments });
            md2htmlMock.withArgs(localPages[1], pageRefs)
                .returns({ html: updatePage.html, attachments: updatePage.attachments });
            krokiMock.withArgs(updatePage.attachments[1]).resolves(updatePage.attachments[1].path.slice(0, -4) + '.png');
            krokiMock.withArgs(createPage.attachments[1]).resolves(createPage.attachments[1].path.slice(0, -4) + '.png');
            plantUmlMock.withArgs(createPage.attachments[2]).resolves(createPage.attachments[2].path.slice(0, -5) + '.png');
            krokiMock.withArgs(createPage.attachments[2]).resolves();
        }
    });
    describe('cleanup', () => {
        const siteName = 'My Site';
        beforeEach(() => {
            getContextMock.returns({ siteName });
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

function prepareState(renderers = []) {
    const siteName = 'Site Name';
    const repo = 'git-repo';
    const publisher_version = config.version;
    const existingPage = { id: 1, repo, sha: 'abc123', version: 1, publisher_version };
    const root = 1;
    const parentPage = { id: 1 };
    const readMe = { path: '/path/to/README.md', sha: 'abc123' };
    const deletedPage = {
        path: 'docs/deleted.md', sha: 'abc123', id: 100
    };
    const updatePage = {
        title: 'Updated Page', path: 'docs/updated.md', sha: 'abc123', html: '<h1>Updated Page</h1>',
        attachments: [
            new Image('create-page-image.png'),
            new Graph('update-page-graph.mmd', 'mermaid', renderers[0])
        ], repo, version: 1, id: 200
    };
    const createPage = {
        title: 'Created Page', path: 'docs/created.md', sha: 'abc456', html: '<h1>Created Page</h1>',
        attachments: [
            new Image('create-page-image.png'),
            new Graph('create-page-graph.mmd', 'mermaid', renderers[0]),
            new Graph('unprocessable-graph.puml', 'plantuml', renderers[1])
        ],
        repo, id: 300
    };
    const remotePages = [deletedPage, updatePage].map(({ path, sha, version, id }) => ({ id, path, sha, version }));
    const localPages = [createPage, updatePage].map(({ path, title }) => ({ title, path, sha: 'abc456', exists: true }));
    const pageRefs = { pages: util.keyBy(localPages.concat(readMe), 'path') };
    return { siteName, existingPage, root, repo, readMe, parentPage, deletedPage, updatePage, createPage, remotePages, localPages, pageRefs, renderers };
}

