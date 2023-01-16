import { createHash } from 'node:crypto';
import {readFileSync} from 'node:fs';

export default function fileHash(path){
    const contents = readFileSync(path, 'utf8');
    return createHash('sha256').update(contents).digest('hex');
}
