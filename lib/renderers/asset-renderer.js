import GraphRenderer from './graph-renderer.js';
import PageRenderer from './page-renderer.js';

/**
 * A Renderer for both pages (to html) and graphs (to images)
 */
export default class AssetRenderer {
    /**
     * @param {object} config - Configuration object
     * @param {object} pageRefs - Page references
     */
    constructor(config, pageRefs) {
        this.pageRenderer = new PageRenderer(config, pageRefs);
        this.graphRenderer = new GraphRenderer(config);
    }

    /** 
    * @typedef {import('../models/local-page.js').default} LocalPage 
    * @param {LocalPage} page - The page to render markup for
    * @returns {LocalPage} The `page` rendered
    */
    renderPage(page) {
        return this.pageRenderer.render(page);
    }

    /** 
    * 
    * @typedef {import('../models/graph.js').default} Graph 
    * @param {Graph} graph
    * @returns {Promise<string>} the file where the graph was rendered to  
    */
    renderGraph(graph) {
        return this.graphRenderer.render(graph);
    }
}
