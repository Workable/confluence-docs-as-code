import path from 'node:path';
import { createReadStream, existsSync, createWriteStream } from 'node:fs';
import axios from 'axios';

export default class KrokiSdk {
    constructor(baseURL) {
        this.supportedTypes = ['mermaid', 'plantuml'];
        this.api = axios.create({
            validateStatus: null,
            baseURL
        });
        this.api.defaults.headers.post['Content-Type'] = 'text/plain';
    }

    _fileStream(src) {
        if (!existsSync(src)) {
            throw new Error(`File ${src} not found`);
        }
        return createReadStream(src, 'utf8');
    }

    async toPng({ path: src, type }) {
        if (!this.supportedTypes.includes(type)) {
            throw new Error(
                `Graph type ${type} is not one of supported ["${this.supportedTypes.join('", "')}"]`
            );
        }
        const stream = this._fileStream(src);
        const response = await this.api.post(
            `/${type}/png`, stream, { responseType: 'stream' }
        );
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
