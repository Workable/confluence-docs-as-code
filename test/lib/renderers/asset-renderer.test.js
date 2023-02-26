import AssetRenderer from '../../../lib/renderers/asset-renderer.js';
import GraphRenderer from '../../../lib/renderers/graph-renderer.js';
import PageRenderer from '../../../lib/renderers/page-renderer.js';
import sinon from 'sinon';

const sandbox = sinon.createSandbox();

describe('renderers/asset-renderer', () => {
    const pageRefs = {};
    const config = {
        graphs: {},
        kroki: { host: 'host' },
        plantuml: { baseUrl: 'baseUrl' }
    };
    let renderer;
    beforeEach(() => {
        renderer = new AssetRenderer(config, pageRefs);
    });
    afterEach(() => {
        sandbox.restore();
    });

    describe('renderPage', () => {
        const page = { title: 'page' };
        let pageRenderMock;
        beforeEach(() => {
            pageRenderMock = sandbox.stub(PageRenderer.prototype, 'render').callsFake(() => page);
        });
        it('should call page renderer\'s render with the page and return the rendered page', () => {
            renderer.renderPage(page).should.equal(page);
            sandbox.assert.calledWith(pageRenderMock, page);
        });
    });

    describe('renderGraph', () => {
        const expected = 'path/to/marmaid.mmd';
        const graph = { renderer: 'mermaid' };
        let graphRenderMock;
        beforeEach(() => {
            graphRenderMock = sandbox.stub(GraphRenderer.prototype, 'render').callsFake(() => expected);
        });
        it('should call page renderer\'s render with the page and return the rendered page', () => {
            renderer.renderGraph(graph).should.equal(expected);
            sandbox.assert.calledWith(graphRenderMock, graph);
        });
    });
});
