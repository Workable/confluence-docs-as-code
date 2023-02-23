import KrokiSDK from './kroki-sdk.js';
import PlantUmlSdk from './plantuml-sdk.js';

const KROKI_RENDERER = 'kroki';
const PLANTUML_RENDERER = 'plantuml';
const MERMAID_PLUGIN_RENDERER = 'mermaid-plugin';

export default class GraphRenderer {
    constructor({ kroki, plantuml }) {
        this.kroki = new KrokiSDK(kroki.host);
        this.plantUml = new PlantUmlSdk(plantuml.baseUrl);
    }

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
