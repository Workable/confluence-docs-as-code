/**
 * @module renderers/graph-renderer
 */
import KrokiSDK from '../kroki-sdk.js';
import PlantUmlSdk from '../plantuml-sdk.js';

const KROKI_RENDERER = 'kroki';
const PLANTUML_RENDERER = 'plantuml';
const MERMAID_PLUGIN_RENDERER = 'mermaid-plugin';

/**
 * Render graphs to images based on the preferred method
 */
class GraphRenderer {
    constructor({ kroki, plantuml }) {
        this.kroki = new KrokiSDK(kroki.host);
        this.plantUml = new PlantUmlSdk(plantuml.baseUrl);
    }

    /**
     * Render a graph based on the configured render
     * 
     * @param {Graph} graph - The graph to render
     * @returns {string} The path of the rendered graph
     */
    async render(graph) {
        let imagePath;
        switch (graph.renderer) {
            case KROKI_RENDERER:
                imagePath = await this.kroki.toPng(graph);
                break;
            case PLANTUML_RENDERER:
                imagePath = await this.plantUml.toPng(graph);
                break;
            case MERMAID_PLUGIN_RENDERER:
                imagePath = graph.path;
                break;
        }
        return imagePath;
    }
}

export default GraphRenderer;
