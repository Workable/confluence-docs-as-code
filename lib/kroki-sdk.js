import path from 'node:path';
import { createReadStream, existsSync, createWriteStream } from 'node:fs';
import axios from 'axios';

export default class KrokiSdk {
    constructor({ host, supportedTypes }) {
        this.host = host;
        this.supportedTypes = supportedTypes;
        this.api = axios.create({
            validateStatus: null,
            baseURL: `${this.host}`
        });
        this.api.defaults.headers.post['Content-Type'] = 'text/plain';
    }

    _fileStream(src) {
        const ext = path.extname(src);
        const graph = this.supportedTypes[ext];
        if (!graph) {
            throw new Error(
                `File extension ${ext} is not one of supported types ["${Object.keys(this.supportedTypes).join('", "')}"]`
            );
        }
        if (!existsSync(src)) {
            throw new Error(`File ${src} not found`);
        }
        const dest = src.slice(0, -1 * ext.length) + '.png';
        return { dest, graph, stream: createReadStream(src, 'utf8') };
    }

    async toPng(src) {
        const { dest, graph, stream } = this._fileStream(src);
        const response = await this.api.post(
            `/${graph}/png`, stream, { responseType: 'stream' }
        );
        if (response.status === 200) {
            return new Promise((resolve, reject) => {
                const out = createWriteStream(dest)
                    .on('close', () => resolve(dest))
                    .on('error', (error) => reject(error));
                response.data.pipe(out);
            });
        }
    }
}
