import qs from 'node:querystring';
import path from 'node:path';
import nock from 'nock';
import sinon from 'sinon';
import ConfluenceSdk from '../../lib/confluence-sdk.js';
import logger from '../../lib/logger.js';
import { RequestError } from '../../lib/confluence-sdk-errors.js';
import * as createPageFixtures from '../fixtures/sdk_request/create_page/index.js';
import * as updatePageFixtures from '../fixtures/sdk_request/update_page/index.js';
import * as responseFixtures from '../fixtures/confluence_response/index.js';
import retryPolicyTest from './retry-policy.test.js';
import Meta from '../../lib/models/meta.js';
import config from '../../lib/config.js';
import LocalPage from '../../lib/models/local-page.js';

const sandbox = sinon.createSandbox();
const basePath = '/wiki/rest/api/content';
const sdkOpts = {
    host: 'https://tenant.atlassian.net',
    user: 'foo@bar.com',
    token: 'AC0nFlu3nCe@piT0k3N',
    spaceKey: '~SpaCek3y',
    pageLimit: 25
};
const requestHeaders = {
    'Authorization':
        'Basic ' +
        Buffer.from(`${sdkOpts.user}:${sdkOpts.token}`).toString('base64'),
    'Accept': 'application/json'
};
const EXPAND_PROPERTIES = [
    'version',
    'metadata.properties.repo',
    'metadata.properties.path',
    'metadata.properties.sha',
    'metadata.properties.git_ref',
    'metadata.properties.git_sha',
    'metadata.properties.publisher_version'
].join(',');

describe('confluence-sdk', () => {
    let sdk;
    beforeEach(() => {
        sdk = new ConfluenceSdk(sdkOpts);
        sandbox.stub(logger, 'error');
        sandbox.replace(config, 'version', '1.0.0');
    });
    afterEach(() => {
        sandbox.restore();
    });

    retryPolicyTest(new ConfluenceSdk(sdkOpts).api);

    describe('findPage', () => {
        const title = 'A Page Title';
        const query = qs.stringify({
            title,
            type: 'page',
            spaceKey: sdkOpts.spaceKey,
            expand: EXPAND_PROPERTIES
        });
        let requestMock;
        beforeEach(() => {
            requestMock = nock(sdkOpts.host, { reqheaders: requestHeaders }).get(
                `${basePath}?${query}`
            );
        });
        describe('when page is found', () => {
            it('should return the id of the page', () => {
                const expected = {
                    id: 1821,
                    title: 'Test',
                    version: 18,
                    meta: {
                        path: 'foo/bar/doc.md',
                        repo: 'https://github.com/Org/Repo',
                        sha: 'Zm9vL2Jhci9kb2MubWQ=',
                        git_ref: 'git_ref',
                        git_sha: 'git_sha',
                        publisher_version: '1.0.0'
                    }
                };
                requestMock.reply(200, responseFixtures.childPages);
                return sdk.findPage(title).should.eventually.eql(expected);
            });
        });
        describe('when title is not specified', () => {
            it('should throw Error', () => {
                return sdk
                    .findPage(null)
                    .should.be.rejectedWith(
                        'title should be a string'
                    );
            });
        });
        describe('when no page is found', () => {
            it('should throw PageNotFound error', () => {
                requestMock.reply(200, { size: 0 });
                return sdk.findPage(title).should.eventually.be.undefined;
            });
        });
        describe('when the request is not successful', () => {
            it('should return undefined', () => {
                requestMock.reply(409);
                return sdk.findPage(title).should.be.rejectedWith(RequestError);
            });
        });
    });
    describe('createPage', () => {
        const title = 'A Page Title';
        const content = '<h1>hello</h1>';
        let page;
        let requestMock;
        beforeEach(() => {
            page = new LocalPage(title, new Meta('repo'));
            page.html = content;
            sdk.currentUser = {
                type: 'type',
                accountId: 'accountId',
                accountType: 'accountType'
            };
            requestMock = nock(sdkOpts.host, { reqheaders: requestHeaders }).post(
                basePath
            );
        });
        describe('when request is not successful', () => {
            it('should throw a RequestError', () => {
                requestMock.reply(400);
                return sdk
                    .createPage(page)
                    .should.be.rejectedWith(RequestError);
            });
        });
        describe('when title is not specified', () => {
            it('should throw Error', () => {
                page.title = null;
                return sdk
                    .createPage(page)
                    .should.be.rejectedWith(
                        'title should be a string'
                    );
            });
        });
        describe('when page is created', () => {
            describe('without parent or meta', () => {
                it('should return the id of the new page', () => {
                    const pageId = 1975;
                    page.meta = null;
                    nock(sdkOpts.host, { reqheaders: requestHeaders })
                        .post(basePath, createPageFixtures.simple)
                        .reply(200, { id: pageId });
                    return sdk
                        .createPage(page).then(created => {
                            created.should.equal(page);
                            created.confluencePageId.should.equal(pageId);
                        });
                });
            });
            describe('with parent page and no meta', () => {
                it('should return the id of the new page', () => {
                    const pageId = 1821;
                    const parentPage = 1453;
                    page.meta = null;
                    page.parentPageId = parentPage;
                    nock(sdkOpts.host, { reqheaders: requestHeaders })
                        .post(basePath, createPageFixtures.withParent)
                        .reply(200, { id: pageId });
                    return sdk
                        .createPage(page).then(created => {
                            created.should.equal(page);
                        });
                });
            });
            describe('with parent page and meta', () => {
                it('should return the id of the new page', () => {
                    const pageId = 1821;
                    const parentPage = 1453;
                    page.meta = new Meta('repo');
                    page.parentPageId = parentPage;
                    nock(sdkOpts.host, { reqheaders: requestHeaders })
                        .post(basePath, createPageFixtures.withParentAndMeta)
                        .reply(200, { id: pageId });
                    return sdk
                        .createPage(page).then(created => {
                            created.should.equal(page);
                            created.confluencePageId.should.equal(pageId);
                        });
                });
            });
            describe('when meta is not an instance of Meta', () => {
                it('should throw Error', () => {
                    page.meta = 'meta';
                    return sdk
                        .createPage(page)
                        .should.be.rejectedWith('meta is not an instance of Meta class');
                });
            });
            describe('when parent is not an number', () => {
                it('should throw Error', () => {
                    page.parentPageId = 'string';
                    return sdk
                        .createPage(page)
                        .should.be.rejectedWith(
                            'parentPage should be a number'
                        );
                });
            });
        });
    });

    describe('updatePage', () => {
        const pageId = 1881;
        let requestMock;
        beforeEach(() => {
            requestMock = nock(sdkOpts.host, { reqheaders: requestHeaders }).put(
                `${basePath}/${pageId}`
            );
            sdk.currentUser = {
                type: 'type',
                accountId: 'accountId',
                accountType: 'accountType'
            };
        });
        describe('when id is not specified', () => {
            it('should throw Error', () => {
                return sdk
                    .updatePage(null, 11, 'Title', 'Html')
                    .should.be.rejectedWith(
                        'id should be a number'
                    );
            });
        });
        describe('when version is not specified', () => {
            it('should throw Error', () => {
                return sdk
                    .updatePage(pageId, null, 'Title', 'Html')
                    .should.be.rejectedWith(
                        'version should be a number'
                    );
            });
        });
        describe('when title is not specified', () => {
            it('should throw Error', () => {
                return sdk
                    .updatePage(pageId, 11, null, 'Html')
                    .should.be.rejectedWith(
                        'title should be a string'
                    );
            });
        });
        describe('when html is not specified', () => {
            it('should throw Error', () => {
                return sdk
                    .updatePage(pageId, 11, 'Title', null)
                    .should.be.rejectedWith(
                        'html should be a string'
                    );
            });
        });

        describe('when parent page is not a number', () => {
            it('should throw Error', () => {
                return sdk
                    .updatePage(pageId, 11, 'Title', 'Html', 'Parent')
                    .should.be.rejectedWith('parentPage should be a number');
            });
        });

        describe('when meta is not an instance of Meta', () => {
            it('should throw Error', () => {
                return sdk
                    .updatePage(pageId, 11, 'Title', 'Html', 1453, 777)
                    .should.be.rejectedWith('meta is not an instance of Meta class');
            });
        });

        describe('when request fails', () => {
            it('should throw RequestError', () => {
                requestMock.reply(400);
                return sdk
                    .updatePage(pageId, 11, 'Title', 'Html')
                    .should.be.rejectedWith(RequestError);
            });
        });
        describe('when update is successful', () => {
            describe('without parent page or meta', () => {
                it('should return void', () => {
                    nock(sdkOpts.host, { reqheaders: requestHeaders })
                        .put(`${basePath}/${pageId}`, updatePageFixtures.simple)
                        .reply(200);
                    return sdk.updatePage(pageId, 11, 'Title', '<h1>Html</h1>')
                        .should.be.fulfilled;
                });
            });
            describe('with parent page and no meta', () => {
                it('should return void', () => {
                    const parentPageId = 1566;
                    nock(sdkOpts.host, { reqheaders: requestHeaders })
                        .put(
                            `${basePath}/${pageId}`,
                            updatePageFixtures.withParent
                        )
                        .reply(200);
                    return sdk.updatePage(
                        pageId,
                        11,
                        'Title',
                        '<h1>Html</h1>',
                        parentPageId
                    ).should.be.fulfilled;
                });
            });
            describe('with parent page and meta', () => {
                it('should return void', () => {
                    const parentPageId = 1566;
                    const meta = new Meta('repo');
                    nock(sdkOpts.host, { reqheaders: requestHeaders })
                        .put(
                            `${basePath}/${pageId}`,
                            updatePageFixtures.withParentAndMeta
                        )
                        .reply(200);
                    return sdk.updatePage(
                        pageId,
                        11,
                        'Title',
                        '<h1>Html</h1>',
                        parentPageId,
                        meta
                    ).should.be.fulfilled;
                });
            });
        });
    });
    describe('deletePage', () => {
        const pageId = 1668;
        let requestMock;
        beforeEach(() => {
            requestMock = nock(sdkOpts.host, {
                reqheaders: requestHeaders
            }).delete(`${basePath}/${pageId}`);
            sdk.currentUser = {
                type: 'type',
                accountId: 'accountId',
                accountType: 'accountType'
            };
        });
        describe('when request fails', () => {
            it('should throw RequestError', () => {
                requestMock.reply(400);
                return sdk
                    .deletePage(pageId)
                    .should.be.rejectedWith(RequestError);
            });
        });
        describe('when page deleted', () => {
            it('should return void', () => {
                requestMock.reply(204);
                return sdk.deletePage(pageId).should.be.fulfilled;
            });
        });
        describe('when page not found', () => {
            it('should return void', () => {
                requestMock.reply(404);
                return sdk.deletePage(pageId).should.be.fulfilled;
            });
        });
    });
    describe('getChildPages', () => {
        let requestMock;
        const parentPageId = 1453;
        const query = qs.stringify({
            expand: EXPAND_PROPERTIES,
            start: 0,
            limit: sdkOpts.pageLimit
        });
        beforeEach(() => {
            requestMock = nock(sdkOpts.host, { reqheaders: requestHeaders }).get(
                `${basePath}/${parentPageId}/child/page?${query}`
            );
        });
        describe('when parentPage is not specified', () => {
            it('should throw Error', () => {
                return sdk
                    .getChildPages(null)
                    .should.be.rejectedWith('parentPage should be a number');
            });
        });
        describe('when request fails', () => {
            it('should throw RequestError', () => {
                requestMock.reply(400);
                return sdk
                    .getChildPages(parentPageId)
                    .should.be.rejectedWith(RequestError);
            });
        });
        describe('when there are no child pages', () => {
            it('should return empty array', () => {
                requestMock.reply(200, { size: 0 });
                return sdk
                    .getChildPages(parentPageId)
                    .should.eventually.eql(new Map());
            });
        });
        describe('when there are child pages', () => {
            describe('when all results are returned with the first response', () => {
                it('should return an array with the child pages', () => {
                    const expected = new Map().set('foo/bar/doc.md',
                        {
                            id: 1821,
                            parentId: 1453,
                            version: 18,
                            title: 'Test',
                            meta: {
                                path: 'foo/bar/doc.md',
                                repo: 'https://github.com/Org/Repo',
                                sha: 'Zm9vL2Jhci9kb2MubWQ=',
                                git_ref: 'git_ref',
                                git_sha: 'git_sha',
                                publisher_version: '1.0.0'
                            }
                        }
                    );
                    requestMock.reply(200, responseFixtures.childPages);
                    return sdk
                        .getChildPages(parentPageId)
                        .should.eventually.eql(expected);
                });
                describe('when results are paged', () => {
                    it('should traverse paged results an return all child pages', () => {
                        const expected = [1, 2, 3].reduce((map, p) => {
                            const page = {
                                id: p,
                                parentId: 1453,
                                title: `Page ${p}`,
                                version: p,
                                meta: {
                                    path: `foo/bar/page${p}.md`,
                                    repo: 'https://github.com/Org/Repo',
                                    sha: 'Zm9vL2Jhci9kb2MubWQ=',
                                    git_ref: 'git_ref',
                                    git_sha: 'git_sha',
                                    publisher_version: '1.0.0'
                                }
                            };
                            map.set(page.meta.path, page);
                            return map;
                        }, new Map());

                        const [second, third] = [1, 2].map(p => {
                            const query = qs.stringify({
                                expand: EXPAND_PROPERTIES,
                                start: p,
                                limit: sdkOpts.pageLimit
                            });
                            return `${basePath}/${parentPageId}/child/page?${query}`;
                        });
                        requestMock
                            .reply(200, responseFixtures.childPages1)
                            .get(second)
                            .reply(200, responseFixtures.childPages2)
                            .get(third)
                            .reply(200, responseFixtures.childPages3);
                        return sdk
                            .getChildPages(parentPageId)
                            .should.eventually.eql(expected);
                    });
                });
            });
        });
    });
    describe('getCurrentUser', () => {
        let requestMock;
        beforeEach(() => {
            requestMock = nock(sdkOpts.host, { reqheaders: requestHeaders }).get(
                '/wiki/rest/api/user/current'
            );
        });
        afterEach(() => {
            nock.cleanAll();
        });
        describe('when request fails', () => {
            it('should throw RequestError', () => {
                requestMock.reply(400);
                return sdk
                    ._getCurrentUser()
                    .should.be.rejectedWith(RequestError);
            });
        });
        describe('when user is cached', () => {
            beforeEach(() => {
                requestMock.reply(200);
                sdk.currentUser = {
                    type: 'type',
                    accountId: 'accountId',
                    accountType: 'accountType'
                };
            });
            it('should skip the request and return cached user', () => {
                return sdk._getCurrentUser().then((user) => {
                    user.should.be.eql(sdk.currentUser);
                    requestMock.scope.isDone().should.be.false;
                });
            });
        });
        describe('when user is not cached', () => {
            const user = {
                type: 'type2',
                accountId: 'accountId2',
                accountType: 'accountType2'
            };
            beforeEach(() => {
                requestMock.reply(200, user);
                sdk.currentUser = null;
            });
            it('should request the user', () => {
                return sdk._getCurrentUser().then((user) => {
                    user.should.be.eql(user);
                    requestMock.scope.isDone().should.be.true;
                });
            });
        });
    });
    describe('createAttachment', () => {
        const file = path.resolve(process.cwd(), 'test/fixtures/images/img-1.png');
        const pageId = 1;
        let requestMock;
        beforeEach(() => {
            requestMock = nock(sdkOpts.host, { reqheaders: requestHeaders }).put(
                `${basePath}/${pageId}/child/attachment`
            );
        });
        describe('when file exists', () => {
            describe('when page exists', () => {
                it('should upload the file as page attachment', () => {
                    requestMock.reply(
                        function () {
                            this.req.headers['x-atlassian-token'].should.equal('nocheck');
                            this.req.headers['content-type'].startsWith('multipart/form-data; boundary=').should.be.true;
                            return [200];
                        }
                    );
                    return sdk.createAttachment(pageId, file).should.be.fulfilled;
                });
            });
            describe('when page not exists', () => {
                it('should throw RequestError', () => {
                    requestMock.reply(404);
                    return sdk.createAttachment(pageId, file).should.be.rejectedWith(RequestError);
                });
            });
        });
        describe('when file not exists', () => {
            it('should throw RequestError', () => {
                const notExistentFile = file + '.not_exists';
                const error = `Attachment '${notExistentFile}' not exists`;
                requestMock.reply(200);
                return sdk.createAttachment(pageId, notExistentFile).should.be.rejectedWith(error);
            });
        });
    });
});
