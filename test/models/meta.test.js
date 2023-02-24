import config from '../../lib/config.js';
import Meta from '../../lib/models/meta.js';

describe('models/meta', () => {
    const [repo, path, sha] = ['repo', 'path', 'sha'];
    const { version: publisher_version, github: { sha: git_sha, refName: git_ref } } = config;
    describe('constructor', () => {
        describe('with all properties', () => {
            it('should create a meta instance with all properties', () => {
                const expected = {
                    repo, path, sha, publisher_version, git_ref, git_sha
                };
                const instance = new Meta(repo, path, sha);
                instance.should.eql(expected);
            });
        });
        describe('only with repo', () => {
            it('should create a meta instance with null path and sha', () => {
                const expected = {
                    repo, path: null, sha: null, publisher_version, git_ref, git_sha
                };
                const instance = new Meta(repo);
                instance.should.eql(expected);
            });
        });
    });
    describe('toConfluenceProperties', () => {
        it('should return properties as key/value pairs indexed by their key', () => {
            const expected = {
                repo: { key: 'repo', value: repo },
                path: { key: 'path', value: path },
                sha: { key: 'sha', value: sha },
                publisher_version: { key: 'publisher_version', value: publisher_version },
                git_ref: { key: 'git_ref', value: git_ref },
                git_sha: { key: 'git_sha', value: git_sha }
            };
            const instance = new Meta(repo, path, sha);
            instance.toConfluenceProperties().should.eql(expected);
        });
        describe('when properties have no value', () => {
            it('should return properties as key/value pairs excluding the pairs without values', () => {
                const expected = {
                    repo: { key: 'repo', value: repo },
                    publisher_version: { key: 'publisher_version', value: publisher_version },
                    git_ref: { key: 'git_ref', value: git_ref },
                    git_sha: { key: 'git_sha', value: git_sha }
                };
                const instance = new Meta(repo);
                instance.toConfluenceProperties().should.eql(expected);
            });
        });
    });
});
