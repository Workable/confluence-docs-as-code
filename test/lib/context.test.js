import sinon from 'sinon';
import context from '../../lib/context.js';
import logger from '../../lib/logger.js';
import { expect } from 'chai';
import { simple, noReadme, withUnsafeFiles } from '../fixtures/context/index.js';

const sandbox = sinon.createSandbox();
describe('context', () => {
    describe('when mkdocs.yml file exists', () => {
        describe('when mkdocs.yml file has the expected format', () => {
            describe('when README.md not exists', () => {
                it('should parse mkdocs.yml file and return a context object without readMe', () => {
                    context.getContext('./test/fixtures/samples/no_readme').should.be.eql(noReadme);
                });
            });
            describe('when README.md exists', () => {
                it('should parse mkdocs.yml file and return a context object without readMe', () => {
                    const basePath = './test/fixtures/samples/simple';
                    context.getContext(basePath).should.be.eql(simple);
                });
            });
            describe('when mkdocs.yml has unsafe paths', () => {
                it('should mark unsafe files as not existent', () => {
                    context.getContext('./test/fixtures/samples/unsafe_paths').should.be.eql(withUnsafeFiles);
                });
            });
            describe('when debug is enabled', () => {
                afterEach(() => {
                    sandbox.restore();
                });
                it('should debug log the context', () => {
                    sandbox.stub(logger, 'isDebug').returns(true);
                    const debug = sandbox.stub(logger, 'debug');
                    const basePath = './test/fixtures/samples/simple';
                    context.getContext(basePath).should.be.eql(simple);
                    sandbox.assert.calledWith(debug, `Context:\n${JSON.stringify(simple, null, 2)}`);
                });
            });
        });
        describe('when nav is missing', () => {
            it('should throw error that nav is missing', () => {
                expect(() => context.getContext('./test/fixtures/samples/no_nav')).to.throw('nav is missing from your mkdocs.yml file');
            });
        });
        describe('when repo_url is missing', () => {
            it('should throw error that repo_url is missing', () => {
                expect(() => context.getContext('./test/fixtures/samples/no_repo')).to.throw('repo_url is missing from your mkdocs.yml file');
            });
        });
        describe('when nav entry is missing a title', () => {
            it('should throw error that repo_url is missing', () => {
                expect(() => context.getContext('./test/fixtures/samples/no_nav_title')).to.throw('No title for getting-started.md');
            });
        });
    });
    describe('when mkdocs.yml file is missing', () => {
        it('should throw error about missing file', () => {
            expect(() => context.getContext('./boom-not-found')).to.throw(/ENOENT: no such file or directory/);
        });
    });
});
