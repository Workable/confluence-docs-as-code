import config from '../../lib/config.mjs';

describe('config', () => {
    it('should retrieve configuration values from github action inputs', () => {
        const expected = {
            confluence: {
                host: 'https://tenant.atlassian.net',
                parentPage: 'parent-page',
                spaceKey: 'confluence-space-key',
                token: 'api-token',
                user: 'user@tenant.com'
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
