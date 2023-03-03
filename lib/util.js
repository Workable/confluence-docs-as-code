/**
 * @module util
 */
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

const ALG = 'sha256';

/**
 * Compute a hash for a file's contents
 * 
 * @param {string} path - File path 
 * @param {string} encoding [utf8] - File encoding
 * @returns {string} The hex encoded hash digest
 */
function fileHash(path, encoding = 'utf8') {
    const contents = readFileSync(path, encoding);
    return createHash(ALG).update(contents, encoding).digest('hex');
}

/**
 * Validate th type of an argument
 * 
 * @param {string} name - The argument's name
 * @param {any} value - The argument's value 
 * @param {string} type - The expected value type  
 * @returns {undefined} When validation passes
 * @throws Error if validation fails
 */
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
    const path = attribute.split('.');
    if (Array.isArray(array) && array.length > 0) {
        array.forEach((object) => {
            const pathValue = dig(object, path);
            if (pathValue) {
                index[pathValue] = object;
            }
        });
    }
    return index;
}

function dig(object, [first, ...rest]) {
    if (!object[first]) {
        return;
    }
    if (rest.length > 0) {
        return dig(object[first], rest);
    }
    return object[first];
}

/**
 * Examines if a relative path resolves under the CWD
 * @example
 * safePath('../../../../../etc/passwd'); // Returns `undefined`
 * 
 * @param {string} file - The relative file path 
 * @param {string} base [`process.cwd()`] - The base path to resolve file path
 * @returns {string|undefined} `undefined` if file path is not considered safe
 * @export
 */
function safePath(file, base = process.cwd()) {
    // Transpose absolute paths under process.cwd()
    let resolveFrom = path.dirname(base);
    if (file.startsWith('/')) {
        // consider the file to be relative to CWD
        file = '.' + file;
        resolveFrom = process.cwd();
    }
    const resolvedPath = path.resolve(resolveFrom, file);
    if (resolvedPath.startsWith(process.cwd()) && existsSync(resolvedPath)) {
        return path.relative(process.cwd(), resolvedPath);
    }
}

export default {
    validateType, fileHash, keyBy, safePath
};
