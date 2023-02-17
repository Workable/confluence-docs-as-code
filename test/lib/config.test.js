import { readFileSync } from 'node:fs';
import sinon from 'sinon';
const { version } = JSON.parse(readFileSync('package.json'));
const sandbox = sinon.createSandbox();

describe('config', () => {
    afterEach(() => {
        sandbox.restore();
    });
    describe('when kroki is enabled', () => {
        describe('and no renderer has been explicitly configured', () => {
            it('should retrieve values from action inputs and set kroki as graph renderer', () => {
                return assertConfig('kroki');
            });
        });
        describe('and none renderer configured explicitly', () => {
            beforeEach(() => {
                sandbox.replace(process.env, 'INPUT_MERMAID_RENDERER', 'none');
                sandbox.replace(process.env, 'INPUT_PLANTUML_RENDERER', 'none');
            });
            it('should retrieve values from action inputs and set kroki as graph renderer', () => {
                return assertConfig('none');
            });
        });
    });
    describe('when kroki is disabled', () => {
        beforeEach(() => {
            sandbox.replace(process.env, 'INPUT_KROKI_ENABLED', 'no');
        });
        describe('and no renderer has been configured', () => {
            it('should retrieve values from action inputs and set none as graph renderer', () => {
                return assertConfig('none');
            });
        });
        describe('and kroki configured explicitly as renderer', () => {
            beforeEach(() => {
                sandbox.replace(process.env, 'INPUT_MERMAID_RENDERER', 'kroki');
                sandbox.replace(process.env, 'INPUT_PLANTUML_RENDERER', 'kroki');
            });
            it('should retrieve values from action inputs and set kroki as graph renderer', () => {
                return assertConfig('kroki');
            });
        });
    });
});

let ver = 1;

function assertConfig(renderer) {
    return loadConfig().should.eventually.be.eql(expected(renderer));
}

async function loadConfig() {
    const config = (await import(`../../lib/config.js?v=${ver}`)).default;
    ver++;
    return config;
}

function expected(renderer) {
    return {
        version,
        confluence: {
            host: 'https://tenant.atlassian.net',
            parentPage: 'parent-page',
            titlePrefix: 'title-prefix',
            spaceKey: 'confluence-space-key',
            token: 'api-token',
            user: 'user@tenant.com',
            forceUpdate: true,
            cleanup: false
        },
        github: {
            refName: process.env.GITHUB_REF_NAME,
            sha: process.env.GITHUB_SHA
        },
        graphs: {
            mermaid: {
                type: 'mermaid',
                renderer,
                extension: '.mmd'
            },
            plantuml: {
                type: 'plantuml',
                renderer,
                extension: '.puml'
            }
        },
        kroki: {
            host: 'https://kroki.io'
        },
        plantuml: {
            baseUrl: 'https://www.plantuml.com/plantuml/img'
        }
    };
}
