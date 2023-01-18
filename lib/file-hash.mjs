import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const ALG = 'sha256';

export default function fileHash(path, encoding = 'utf8') {
    const contents = readFileSync(path, encoding);
    return createHash(ALG).update(contents, encoding).digest('hex');
}
