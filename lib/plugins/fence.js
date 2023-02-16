import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { toConfluenceImage } from './image.js';

export default function plugin(md, options) {
    const config = options.graphs;
    const supportedGraphs = Object.keys(config);

    md.renderer.rules.fence = (tokens, idx, _, env) => {
        const token = tokens[idx];
        const language = token?.info?.trim();
        const content = token?.content?.trim();
        if (supportedGraphs.includes(language)) {
            return processGraph(config[language], content, env);
        }
        return codeMacro(language, content);
    };
}

function codeMacro(language, content) {
    if (content.length === 0) {
        return '';
    }

    const cdata = `<![CDATA[${escape(content)}]]>`;
    let parameter = '';
    if (language.length > 0) {
        parameter = `<ac:parameter ac:name="language">${language.trim()}</ac:parameter>`;
    }
    return `<ac:structured-macro ac:name="code">${parameter}<ac:plain-text-body>${cdata}</ac:plain-text-body></ac:structured-macro>\n`;
}

function escape(str) {
    return str.replace(/]]>/g, ']]]]><![CDATA[>');
}

function processGraph(config, content, { attachments, source }) {
    if (config.renderer === 'none') {
        return codeMacro(config.type, content);
    }
    const alt = `graph_${attachments.length + 1}`;
    const base = path.basename(source, '.md') + '_' + alt;
    const image = base + '.png';
    const graph = base + config.extension;
    const resolvedPath = path.resolve(path.dirname(source), graph);
    writeFileSync(resolvedPath, content, 'utf8');
    attachments.push({ path: path.relative(process.cwd(), resolvedPath), renderer: config.renderer, type: config.type });

    if (['kroki', 'plantuml'].includes(config.renderer)) {
        return toConfluenceImage(alt, image);
    }

    if (config.renderer === 'mermaid-plugin') {
        return toMermaidPlugin(graph);
    }
}


export function toMermaidPlugin(filename) {
    return `<ac:structured-macro ac:name="mermaid-cloud" data-layout="default" ><ac:parameter ac:name="filename">${filename}</ac:parameter></ac:structured-macro>`;
}
