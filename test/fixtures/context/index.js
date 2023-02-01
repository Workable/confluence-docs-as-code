import { readFileSync } from 'node:fs';
const base = 'test/fixtures/context';
const simple = JSON.parse(readFileSync(`${base}/simple.json`));
const noReadme = JSON.parse(readFileSync(`${base}/without-readme.json`));
const withUnsafeFiles = JSON.parse(readFileSync(`${base}/with-unsafe-paths.json`));
const withTitlePrefix = JSON.parse(readFileSync(`${base}/with-prefix.json`));

export { simple, noReadme, withUnsafeFiles, withTitlePrefix };
