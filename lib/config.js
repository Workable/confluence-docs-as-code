import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { getInput } from '@actions/core';
const packageFile = new URL('../package.json', import.meta.url);

const { version } = JSON.parse(readFileSync(packageFile));
const requiredInputOptions = { required: true, trimWhitespace: true };
const optionalInputOptions = { required: false, trimWhitespace: true };

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
    },
    kroki: {
        enabled: getInput('kroki_enabled', optionalInputOptions)?.toLowerCase() === 'yes',
        host: 'https://kroki.io',
        supportedTypes: {
            '.mmd': 'mermaid',
            '.puml': 'plantuml'
        }
    },
    github: {
        sha: process.env.GITHUB_SHA,
        refName: process.env.GITHUB_REF_NAME
    }
};

export default config;
