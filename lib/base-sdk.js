import path from 'node:path';
import { existsSync, createWriteStream } from 'node:fs';
import axios from 'axios';
import retryPolicy from './retry-policy.js';

export default class BaseSdk {
    constructor(baseURL) {
        this.api = axios.create({
            validateStatus: (status) => status < 500,
            baseURL
        });
        // Add retry policy
        retryPolicy(this.api);
    }

    get supportedTypes() {
        throw new Error('Unimplemented');
    }

    fileCheck(file) {
        if (!existsSync(file)) {
            throw new Error(`File ${file} not found`);
        }
    }

    // eslint-disable-next-line no-unused-vars
    request(file, type) {
        throw new Error('Unimplemented');
    }

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
