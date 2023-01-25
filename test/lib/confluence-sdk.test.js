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

const sandbox = sinon.createSandbox();
const basePath = '/wiki/rest/api/content';
const sdkOpts = {
    host: 'https://tenant.atlassian.net',
    user: 'foo@bar.com',
    token: 'AC0nFlu3nCe@piT0k3N',
    spaceKey: '~SpaCek3y'
};
const requestHeaders = {
    authorization:
        'Basic ' +
        Buffer.from(`${sdkOpts.user}:${sdkOpts.token}`).toString('base64'),
    accept: 'application/json'
};
const EXPAND_PROPERTIES = [
    'version',
    'metadata.properties.repo',
    'metadata.properties.path',
    'metadata.properties.sha'
].join(',');

describe('confluence-sdk', () => {
    let sdk;
    beforeEach(() => {
        sdk = new ConfluenceSdk(sdkOpts);
        sandbox.stub(logger, 'error');
    });
    afterEach(() => {
        sandbox.restore();
    });
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
                    path: 'foo/bar/doc.md',
                    repo: 'https://github.com/Org/Repo',
                    sha: 'Zm9vL2Jhci9kb2MubWQ=',
                    title: 'Test',
                    version: 18
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
        let requestMock;
        beforeEach(() => {
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
                    .createPage(title, content)
                    .should.be.rejectedWith(RequestError);
            });
        });
        describe('when title is not specified', () => {
            it('should throw Error', () => {
                return sdk
                    .createPage(null, null)
                    .should.be.rejectedWith(
                        'title should be a string'
                    );
            });
        });
        describe('when html is not specified', () => {
            it('should throw Error', () => {
                return sdk
                    .createPage(title, null)
                    .should.be.rejectedWith(
                        'html should be a string'
                    );
            });
        });
        describe('when page is created', () => {
            describe('without parent or meta', () => {
                it('should return the id of the new page', () => {
                    const pageId = 1975;
                    nock(sdkOpts.host, { reqheaders: requestHeaders })
                        .post(basePath, createPageFixtures.simple)
                        .reply(200, { id: pageId });
                    return sdk
                        .createPage(title, content)
                        .should.eventually.equal(pageId);
                });
            });
            describe('with parent page and no meta', () => {
                it('should return the id of the new page', () => {
                    const pageId = 1821;
                    const parentPage = 1453;
                    nock(sdkOpts.host, { reqheaders: requestHeaders })
                        .post(basePath, createPageFixtures.withParent)
                        .reply(200, { id: pageId });
                    return sdk
                        .createPage(title, content, parentPage)
                        .should.eventually.equal(pageId);
                });
            });
            describe('with parent page and meta', () => {
                it('should return the id of the new page', () => {
                    const pageId = 1821;
                    const parentPage = 1453;
                    const meta = { metaKey: 'metaValue' };
                    nock(sdkOpts.host, { reqheaders: requestHeaders })
                        .post(basePath, createPageFixtures.withParentAndMeta)
                        .reply(200, { id: pageId });
                    return sdk
                        .createPage(title, content, parentPage, meta)
                        .should.eventually.equal(pageId);
                });
            });
            describe('when meta is not an object', () => {
                it('should throw Error', () => {
                    return sdk
                        .createPage(title, content, 1234, 'foo')
                        .should.be.rejectedWith('meta should be an object');
                });
            });
            describe('when parent is not an number', () => {
                it('should throw Error', () => {
                    return sdk
                        .createPage(title, content, 'String')
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

        describe('when meta is not an object', () => {
            it('should throw Error', () => {
                return sdk
                    .updatePage(pageId, 11, 'Title', 'Html', 1453, 777)
                    .should.be.rejectedWith('meta should be an object');
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
                    const meta = { metaKey: 'metaValue' };
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
            expand: EXPAND_PROPERTIES
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
                    .should.eventually.eql([]);
            });
        });
        describe('when there are child pages', () => {
            it('should return an array with the child pages', () => {
                const expected = [
                    {
                        id: 1821,
                        parentId: 1453,
                        path: 'foo/bar/doc.md',
                        repo: 'https://github.com/Org/Repo',
                        sha: 'Zm9vL2Jhci9kb2MubWQ=',
                        title: 'Test',
                        version: 18
                    }
                ];
                requestMock.reply(200, responseFixtures.childPages);
                return sdk
                    .getChildPages(parentPageId)
                    .should.eventually.eql(expected);
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
                const error = `ENOENT: no such file or directory, open '${notExistentFile}'`;
                requestMock.reply(404);
                return sdk.createAttachment(pageId, notExistentFile).should.be.rejectedWith(error);
            });
        });
    });
});
