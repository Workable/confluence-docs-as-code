import path from 'node:path';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import sinon from 'sinon';
import { expect } from 'chai';
import md2html from '../../lib/md2html.js';
import config from '../../lib/config.js';

const sandbox = sinon.createSandbox();

describe('md2html', () => {
    afterEach(() => {
        sandbox.restore();
    });
    describe('render', () => {
        describe('when file argument is not a string', () => {
            it('should throw error', () => {
                expect(() => md2html.render()).to.throw('file parameter is required');
            });
        });
        describe('when file is not md', () => {
            it('should throw error', () => {
                expect(() => md2html.render('foo.txt')).to.throw('foo.txt is not a markdown (.md) file');
            });
        });
        describe('when a markdown file is given', async () => {
            const fixturesPath = 'test/fixtures/markdown';
            const mdFile = path.resolve(fixturesPath, 'full.md');
            const expectedImages = ['test/fixtures/images/img-1.png'];
            const mmdFile = 'test/fixtures/markdown/full_graph_1.mmd';
            const pumlFile = 'test/fixtures/markdown/full_graph_2.puml';
            const expectedGraphs = [mmdFile, pumlFile];
            const pageRefs = { pages: { 'test/fixtures/markdown/other-page.md': { title: 'Other Page', exists: true } } };
            afterEach(() => {
                expectedGraphs.forEach((graph) => {
                    if (existsSync(graph)) {
                        unlinkSync(graph);
                    }
                });
            });

            describe('when kroki is enabled', () => {
                const htmlFile = path.resolve(fixturesPath, 'full.html');
                it('should render the markdown, save mermaid graph to file, return image and graph references', () => {
                    const expectedHtml = readFileSync(htmlFile, 'utf8');
                    const { html, images, graphs } = md2html.render(mdFile, pageRefs);
                    html.should.equal(expectedHtml);
                    images.should.eql(expectedImages);
                    graphs.should.eql(expectedGraphs);
                    existsSync(mmdFile).should.be.true;
                });
            });
            describe('when kroki is disabled', () => {
                const htmlFile = path.resolve(fixturesPath, 'kroki-disabled.html');
                beforeEach(() => {
                    sandbox.replace(config.kroki, 'enabled', false);
                });
                it('should render the markdown to html and return only image references', () => {
                    const expectedGraphs = [];
                    const expectedHtml = readFileSync(htmlFile, 'utf8');
                    const { html, images, graphs } = md2html.render(mdFile, pageRefs);
                    html.should.equal(expectedHtml);
                    images.should.eql(expectedImages);
                    graphs.should.eql(expectedGraphs);
                    existsSync(mmdFile).should.be.false;
                });
            });
        });
    });
});
