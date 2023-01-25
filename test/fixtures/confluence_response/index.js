import { readFileSync } from 'node:fs';
const childPages = JSON.parse(readFileSync('test/fixtures/confluence_response/child-pages.json'));

export { childPages };
