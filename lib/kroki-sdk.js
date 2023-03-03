/**
 * @module kroki-sdk
 */
import { createReadStream } from 'node:fs';
import BaseSdk from './base-sdk.js';

/**
 * SDK for the Kroki service
 * @extends BaseSdk
 */
class KrokiSdk extends BaseSdk {
    constructor(baseURL) {
        super(baseURL);
        this.api.defaults.headers.post['Content-Type'] = 'text/plain';
    }

    get supportedTypes() {
        return ['mermaid', 'plantuml'];
    }

    request(file, type) {
        const stream = createReadStream(file, 'utf8');
        return this.api.post(
            `/${type}/png`, stream, { responseType: 'stream' }
        );
    }
}

export default KrokiSdk;
