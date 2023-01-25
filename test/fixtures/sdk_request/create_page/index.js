import { readFileSync } from 'node:fs';

const base = 'test/fixtures/sdk_request/create_page';
const simple = JSON.parse(readFileSync(`${base}/plain.json`));
const withParent = JSON.parse(readFileSync(`${base}/with-parent.json`));
const withParentAndMeta = JSON.parse(readFileSync(`${base}/with-parent-and-meta.json`));
const homePage = JSON.parse(readFileSync(`${base}/home-page.json`));
const homePageWithParent = JSON.parse(readFileSync(`${base}/home-page-with-parent.json`));

export { simple, withParent, withParentAndMeta, homePage, homePageWithParent };
