/**
 * @module plugins/fence
 */
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import Graph from '../models/graph.js';

/**
 * MarkdownIt plugin to handle fenced code blocks
 * 
 * @param {MarkdownIt} md - A `MarkdownIt` instance
 * @param {object} options - Plugin options
 */
function plugin(md, options) {
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
/**
 * 
 * @param {string} language - Fenced code language attribute
 * @param {string} content - Fenced code content
 * @returns {string} Html markup
 */
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

/**
 * Escape the string `]]>` found in `str` in order to be valid inside a `CDATA` block
 *  
 * @param {string} str - Text to escape
 * @returns {string} Escaped text
 */
function escape(str) {
    return str.replace(/]]>/g, ']]]]><![CDATA[>');
}

/**
 * Processes graph content and produces appropriate markup based on the configuration
 * 
 * @param {string} config - Configuration specific to the fenced code language attribute
 * @param {string} content - Fenced code content 
 * @param {object} param2 - Parser environment object
 * @returns {string} Html markup
 */
function processGraph(config, content, { page }) {
    if (config.renderer === 'none') {
        return codeMacro(config.type, content);
    }
    const source = page?.meta?.path;
    const alt = `graph_${page.attachments.length + 1}`;
    const graph = path.basename(source, '.md') + '_' + alt + config.extension;
    const resolvedPath = path.resolve(path.dirname(source), graph);
    writeFileSync(resolvedPath, content, 'utf8');
    const relPath = path.relative(process.cwd(), resolvedPath);
    const attachment = new Graph(relPath, config.type, config.renderer, alt);
    page.attachments.push(attachment);
    return attachment.markup;
}

export default plugin;
