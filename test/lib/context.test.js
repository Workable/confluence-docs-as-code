import sinon from 'sinon';
import { expect } from 'chai';
import context from '../../lib/context.js';
import logger from '../../lib/logger.js';
import config from '../../lib/config.js';
import {
    simple, noReadme, withUnsafeFiles, withTitlePrefix
} from '../fixtures/context/index.js';

const sandbox = sinon.createSandbox();

describe('context', () => {
    beforeEach(() => {
        sandbox.replace(config.github, 'refName', 'branch-name');
        sandbox.replace(config.github, 'sha', 'git-hub-sha');
        sandbox.replace(config, 'version', '1.0.0');
    });
    afterEach(() => {
        sandbox.restore();
    });
    describe('when mkdocs.yml file exists', () => {
        describe('when mkdocs.yml file has the expected format', () => {
            describe('when no title prefix has been configured', () => {
                beforeEach(() => {
                    sandbox.replace(config.confluence, 'titlePrefix', '');
                });
                describe('when README.md not exists', () => {
                    it('should parse mkdocs.yml file and return a context object without readMe', () => {
                        const warnLog = sandbox.stub(logger, 'warn');
                        context.getContext('./test/fixtures/samples/no_readme').should.be.eql(noReadme);
                        sandbox.assert.calledWith(warnLog, 'Page "Fixture Site Name" not found at "test/fixtures/samples/no_readme/README.md"');
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
                        const warnLog = sandbox.stub(logger, 'warn');
                        context.getContext('./test/fixtures/samples/unsafe_paths').should.be.eql(withUnsafeFiles);
                        sandbox.assert.calledWith(warnLog, 'Page "Getting started" not found at "test/foo"');
                        sandbox.assert.calledWith(warnLog, 'Page "Fixture Site Name" not found at "test/fixtures/samples/unsafe_paths/README.md"');
                    });
                });
                describe('when debug is enabled', () => {
                    it('should debug log the context', () => {
                        sandbox.stub(logger, 'isDebug').returns(true);
                        const debug = sandbox.stub(logger, 'debug');
                        const basePath = './test/fixtures/samples/simple';
                        context.getContext(basePath).should.be.eql(simple);
                        sandbox.assert.calledWith(debug, `Context:\n${JSON.stringify(simple, null, 2)}`);
                    });
                });
            });
            describe('when title prefix configured', () => {
                beforeEach(() => {
                    sandbox.replace(config.confluence, 'titlePrefix', 'PFX:');
                });
                it('should prepend all page titles with the prefix configured', () => {
                    const basePath = './test/fixtures/samples/simple';
                    context.getContext(basePath).should.be.eql(withTitlePrefix);
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
