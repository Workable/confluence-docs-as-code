import { readFileSync } from 'node:fs';
import config from '../../lib/config.js';

describe('config', () => {
    it('should retrieve configuration values from github action inputs', () => {
        const { version } = JSON.parse(readFileSync('package.json'));
        const expected = {
            version,
            confluence: {
                host: 'https://tenant.atlassian.net',
                parentPage: 'parent-page',
                titlePrefix: 'title-prefix',
                spaceKey: 'confluence-space-key',
                token: 'api-token',
                user: 'user@tenant.com',
                forceUpdate: true
            },
            github: {
                refName: process.env.GITHUB_REF_NAME,
                sha: process.env.GITHUB_SHA
            },
            kroki: {
                enabled: true,
                host: 'https://kroki.io',
                supportedTypes: {
                    '.mmd': 'mermaid',
                    '.puml': 'plantuml'
                }
            }
        };
        config.should.be.eql(expected);
    });
});
