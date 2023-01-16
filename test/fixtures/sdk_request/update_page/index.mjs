import { readFileSync } from 'node:fs';

const base = 'test/fixtures/sdk_request/update_page';
const simple = JSON.parse(readFileSync(`${base}/plain.json`));
const withParent = JSON.parse(readFileSync(`${base}/with-parent.json`));
const withParentAndMeta = JSON.parse(readFileSync(`${base}/with-parent-and-meta.json`));
const home = JSON.parse(readFileSync(`${base}/home.json`));
const homeWithParent = JSON.parse(readFileSync(`${base}/home-with-parent.json`));

export { simple, withParent, withParentAndMeta, home, homeWithParent };
