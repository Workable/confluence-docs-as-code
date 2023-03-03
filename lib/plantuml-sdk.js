/**
 * @module plantuml-sdk
 */
import { readFileSync } from 'node:fs';
import BaseSdk from './base-sdk.js';
import plantumlEncoder from 'plantuml-encoder';
/**
 * SDK for the plantuml service
 * @extends BaseSdk
 */
class PlantUmlSdk extends BaseSdk {
    get supportedTypes() {
        return ['plantuml'];
    }
    request(file) {
        const encoded = plantumlEncoder.encode(readFileSync(file, 'utf8'));
        return this.api.get(
            `/${encoded}`, { responseType: 'stream' }
        );
    }
}

export default PlantUmlSdk;
