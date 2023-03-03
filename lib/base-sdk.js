/**
 * @module base-sdk
 */
import path from 'node:path';
import { existsSync, createWriteStream } from 'node:fs';
import axios from 'axios';
import retryPolicy from './retry-policy.js';

/**
 * The base class provides common functionality 
 * for both KrokiSdk and PlantUmlSdk subclasses
 */
class BaseSdk {
    /**
     * 
     * @param {string} baseURL - The baseurl of the service
     */
    constructor(baseURL) {
        this.api = axios.create({
            validateStatus: (status) => status < 500,
            baseURL
        });
        // Add retry policy
        retryPolicy(this.api);
    }

    /**
     * Supported graph types
     * 
     * @type {Array<string>} 
     */
    get supportedTypes() {
        throw new Error('Unimplemented');
    }

    /**
     * Check if file exists
     * 
     * @param {string} file - The path to a file 
     */
    fileCheck(file) {
        if (!existsSync(file)) {
            throw new Error(`File ${file} not found`);
        }
    }

    /**
     * Creates the http request that renders a graph to image
     * Should be implemented by subclasses
     * 
     * @abstract
     * @param {string} file - The path to a file 
     * @param {string} type - Graph type
     */
    // eslint-disable-next-line no-unused-vars
    request(file, type) {
        throw new Error('Unimplemented');
    }

    /**
     * Renders a graph to png image
     * 
     * @param {Graph} param0 - The graph to render as png
     * @returns {Promise<string>} The path to the image created
     */
    async toPng({ path: src, type }) {
        if (!this.supportedTypes.includes(type)) {
            throw new Error(
                `Graph type ${type} is not one of supported ["${this.supportedTypes.join('", "')}"]`
            );
        }
        this.fileCheck(src);
        const response = await this.request(src, type);
        if (response.status === 200) {
            const ext = path.extname(src);
            const dest = src.slice(0, -1 * ext.length) + '.png';
            return new Promise((resolve, reject) => {
                const out = createWriteStream(dest)
                    .on('close', () => resolve(dest))
                    .on('error', (error) => reject(error));
                response.data.pipe(out);
            });
        }
    }
}

export default BaseSdk;
