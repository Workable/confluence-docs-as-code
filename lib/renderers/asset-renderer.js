import GraphRenderer from './graph-renderer.js';
import PageRenderer from './page-renderer.js';

export default class AssetRenderer {
    constructor(config, pageRefs) {
        this.pageRenderer = new PageRenderer(config, pageRefs);
        this.graphRenderer = new GraphRenderer(config);
    }

    renderPage(page) {
        return this.pageRenderer.render(page);
    }

    renderGraph(graph) {
        return this.graphRenderer.render(graph);
    }
}
