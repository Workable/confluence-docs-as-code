import config from '../../lib/config.js';

describe('config', () => {
    it('should retrieve configuration values from github action inputs', () => {
        const expected = {
            confluence: {
                host: 'https://tenant.atlassian.net',
                parentPage: 'parent-page',
                titlePrefix: 'title-prefix',
                spaceKey: 'confluence-space-key',
                token: 'api-token',
                user: 'user@tenant.com',
                force_update: true
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
