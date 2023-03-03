/**
 * Action configuration
 * @module config
 */
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { getInput } from '@actions/core';
const packageFile = new URL('../package.json', import.meta.url);

const { version } = JSON.parse(readFileSync(packageFile));
const requiredInputOptions = { required: true, trimWhitespace: true };
const optionalInputOptions = { required: false, trimWhitespace: true };
const mermaidRenderer = getInput('mermaid_renderer', optionalInputOptions);
const plantumlRenderer = getInput('plantuml_renderer', optionalInputOptions);

// Deprecated
const krokiEnabled = getInput('kroki_enabled', optionalInputOptions)?.toLowerCase() === 'yes';
const defaultRenderer = krokiEnabled ? 'kroki' : 'none';

const config = {
    version,
    confluence: {
        host: `https://${getInput('confluence_tenant', requiredInputOptions)}.atlassian.net`,
        user: getInput('confluence_user', requiredInputOptions),
        token: getInput('confluence_token', requiredInputOptions),
        spaceKey: getInput('confluence_space', requiredInputOptions),
        parentPage: getInput('confluence_parent_page', optionalInputOptions),
        titlePrefix: getInput('confluence_title_prefix', optionalInputOptions),
        forceUpdate: getInput('confluence_force_update', optionalInputOptions).toLowerCase() === 'yes',
        cleanup: getInput('confluence_cleanup', optionalInputOptions).toLowerCase() === 'yes',
        pageLimit: 25 // paging limit
    },
    graphs: {
        mermaid: {
            type: 'mermaid',
            renderer: ['none', 'kroki', 'mermaid-plugin'].includes(mermaidRenderer) ? mermaidRenderer : defaultRenderer,
            extension: '.mmd'
        },
        plantuml: {
            type: 'plantuml',
            renderer: ['none', 'kroki', 'plantuml'].includes(plantumlRenderer) ? plantumlRenderer : defaultRenderer,
            extension: '.puml'
        }
    },
    kroki: {
        host: 'https://kroki.io'
    },
    plantuml: {
        baseUrl: 'https://www.plantuml.com/plantuml/img'
    },
    github: {
        sha: process.env.GITHUB_SHA,
        refName: process.env.GITHUB_REF_NAME
    }
};

export default config;
