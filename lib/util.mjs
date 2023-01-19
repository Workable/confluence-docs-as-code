import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const ALG = 'sha256';

function fileHash(path, encoding = 'utf8') {
    const contents = readFileSync(path, encoding);
    return createHash(ALG).update(contents, encoding).digest('hex');
}

function validateType(name, value, type) {
    const article = 'aeiou'.includes(type[0]) ? 'an' : 'a';
    const error = new Error(`${name} should be ${article} ${type}`);
    if (type === 'array' && Array.isArray(value)) {
        return;
    } else if (type === 'object') {
        if (
            typeof value !== 'object' ||
            value === null ||
            Array.isArray(value)
        ) {
            throw error;
        }
    } else if (typeof value !== type) {
        throw error;
    }
}

function keyBy(array, attribute) {
    const index = {};
    if (Array.isArray(array)) {
        array.forEach((object) => (index[object[attribute]] = object));
    }
    return index;
}

export default { validateType, fileHash, keyBy };
