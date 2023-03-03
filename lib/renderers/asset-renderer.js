/**
 * @module renderers/asset-renderer
 */
import GraphRenderer from './graph-renderer.js';
import PageRenderer from './page-renderer.js';

/**
 * A Renderer for both pages (to html) and graphs (to images)
 */
class AssetRenderer {
    /**
     * @param {object} config - Configuration object
     * @param {object} pageRefs - Page references
     */
    constructor(config, pageRefs) {
        this.pageRenderer = new PageRenderer(config, pageRefs);
        this.graphRenderer = new GraphRenderer(config);
    }

    /**
     * Renders a page to HTML + attachments
     * 
     * @param {LocalPage} page - The page to render markup for
     * @returns {LocalPage} The `page` rendered
     */
    renderPage(page) {
        return this.pageRenderer.render(page);
    }

    /** 
     * Renders a graph (typically to png)
     * 
     * @param {Graph} graph
     * @returns {Promise<string>} the file where the graph was rendered to  
     */
    renderGraph(graph) {
        return this.graphRenderer.render(graph);
    }
}

export default AssetRenderer;
