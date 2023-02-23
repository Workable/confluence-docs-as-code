import sinon from 'sinon';
import GraphRenderer from '../../lib/graph-renderer.js';
import KrokiSdk from '../../lib/kroki-sdk.js';
import PlantUmlSdk from '../../lib/plantuml-sdk.js';

const sandbox = sinon.createSandbox();

describe('graph-renderer', () => {
    let graphRenderer;
    const config = {
        kroki: { host: 'host' },
        plantuml: { baseUrl: 'baseUrl' }
    };
    beforeEach(() => {
        graphRenderer = new GraphRenderer(config);
    });
    afterEach(() => {
        sandbox.restore();
    });
    describe('render', () => {
        describe('when graph renderer is kroki', () => {
            const renderer = 'kroki';
            const expected = 'kroki-rendered.png';
            beforeEach(() => {
                sandbox.stub(KrokiSdk.prototype, 'toPng').resolves(expected);
            });
            it('should use kroki service to render to png', () => {
                return graphRenderer.render({ renderer }).should.eventually.equal(expected);
            });
        });
        describe('when graph renderer is plantuml', () => {
            const renderer = 'plantuml';
            const expected = 'plantuml-rendered.png';
            beforeEach(() => {
                sandbox.stub(PlantUmlSdk.prototype, 'toPng').resolves(expected);
            });
            it('should use plantuml service to render to png', () => {
                return graphRenderer.render({ renderer }).should.eventually.equal(expected);
            });
        });
        describe('when graph renderer is mermaid-plugin', () => {
            const renderer = 'mermaid-plugin';
            const path = 'path_to_mermaid.mmd';
            const expected = path;
            beforeEach(() => {
                sandbox.stub(PlantUmlSdk.prototype, 'toPng').resolves(expected);
            });
            it('should use plantuml service to render to png', () => {
                return graphRenderer.render({ renderer, path }).should.eventually.equal(expected);
            });
        });
    });
});
