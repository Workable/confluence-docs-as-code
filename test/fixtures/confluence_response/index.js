import { readFileSync } from 'node:fs';
const childPages = JSON.parse(readFileSync('test/fixtures/confluence_response/child-pages.json'));
const childPages1 = JSON.parse(readFileSync('test/fixtures/confluence_response/child-pages-page-1.json'));
const childPages2 = JSON.parse(readFileSync('test/fixtures/confluence_response/child-pages-page-2.json'));
const childPages3 = JSON.parse(readFileSync('test/fixtures/confluence_response/child-pages-page-3.json'));

export { childPages, childPages1, childPages2, childPages3 };
