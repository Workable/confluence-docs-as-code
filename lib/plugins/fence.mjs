import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { toConfluenceImage } from './image.mjs';

export default function plugin(md, options) {
    const supportedGraphs = options.kroki?.enabled && options.kroki?.supportedTypes ? Object.values(options.kroki.supportedTypes) : [];
    const graphExtension = options.kroki?.enabled && options.kroki?.supportedTypes ? Object.entries(options.kroki.supportedTypes).reduce((o, [k, v]) => {
        o[v] = k;
        return o;
    }, {}) : {};

    md.renderer.rules.fence = (tokens, idx, _, env) => {
        const token = tokens[idx];
        const language = token?.info?.trim();
        const content = token?.content?.trim();
        if (supportedGraphs.includes(language)) {
            return processGraph(graphExtension[language], content, env);
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

function processGraph(ext, content, { graphs, source }) {
    const alt = `graph_${graphs.length + 1}`;
    const base = path.basename(source, '.md') + '_' + alt;
    const image = base + '.png';
    const graph = base + ext;
    const resolvedPath = path.resolve(path.dirname(source), graph);
    writeFileSync(resolvedPath, content, 'utf8');
    graphs.push(path.relative(process.cwd(), resolvedPath));
    return toConfluenceImage(alt, image);
}
