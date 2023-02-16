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
                expect(() => md2html.render()).to.throw('path parameter is required');
            });
        });
        describe('when file is not md', () => {
            it('should throw error', () => {
                expect(() => md2html.render({ path: 'foo.txt' })).to.throw('foo.txt is not a markdown (.md) file');
            });
        });
        describe('when a markdown file is given', async () => {
            const fixturesPath = 'test/fixtures/markdown';
            const mdFile = path.resolve(fixturesPath, 'full.md');
            const mmdFile = 'test/fixtures/markdown/full_graph_2.mmd';
            const pumlFile = 'test/fixtures/markdown/full_graph_3.puml';
            const pageRefs = { pages: { 'test/fixtures/markdown/other-page.md': { title: 'Other Page', exists: true } } };
            afterEach(() => {
                const graphs = [mmdFile, pumlFile];
                graphs.forEach((graph) => {
                    if (existsSync(graph)) {
                        unlinkSync(graph);
                    }
                });
            });

            describe('when both mermaid and plantuml renderer is kroki', () => {
                const htmlFile = path.resolve(fixturesPath, 'full.html');
                beforeEach(() => {
                    sandbox.replace(config.graphs.mermaid, 'renderer', 'kroki');
                    sandbox.replace(config.graphs.plantuml, 'renderer', 'kroki');
                });
                it('should render the markdown, save mermaid graph to file, return image and graph references', () => {
                    const expectedAttachments = [
                        { type: 'image', path: 'test/fixtures/images/img-1.png' },
                        { type: 'mermaid', path: mmdFile, renderer: 'kroki' },
                        { type: 'plantuml', path: pumlFile, renderer: 'kroki' }
                    ];
                    const expectedHtml = readFileSync(htmlFile, 'utf8');
                    const { html, attachments } = md2html.render({ path: mdFile }, pageRefs);
                    html.should.equal(expectedHtml);
                    attachments.should.eql(expectedAttachments);
                    existsSync(mmdFile).should.be.true;
                    existsSync(pumlFile).should.be.true;
                });
            });
            describe('when mermaid renderer is mermaid-plugin', () => {
                beforeEach(() => {
                    sandbox.replace(config.graphs.mermaid, 'renderer', 'mermaid-plugin');
                });
                describe('and plantuml renderer is plantuml', () => {
                    const htmlFile = path.resolve(fixturesPath, 'kroki-and-mermaid-plugin.html');
                    beforeEach(() => {
                        sandbox.replace(config.graphs.plantuml, 'renderer', 'plantuml');
                    });
                    it('should render the markdown, save mermaid graph to file, return image and graph references', () => {
                        const expectedAttachments = [
                            { type: 'image', path: 'test/fixtures/images/img-1.png' },
                            { type: 'mermaid', path: mmdFile, renderer: 'mermaid-plugin' },
                            { type: 'plantuml', path: pumlFile, renderer: 'plantuml' }
                        ];
                        const expectedHtml = readFileSync(htmlFile, 'utf8');
                        const { html, attachments } = md2html.render({ path: mdFile }, pageRefs);
                        html.should.equal(expectedHtml);
                        attachments.should.eql(expectedAttachments);
                        existsSync(mmdFile).should.be.true;
                        existsSync(pumlFile).should.be.true;
                    });
                });
            });
            describe('when no rendered configured for neither mermaid or plantuml', () => {
                beforeEach(() => {
                    sandbox.replace(config.graphs.mermaid, 'renderer', 'none');
                    sandbox.replace(config.graphs.plantuml, 'renderer', 'none');
                });
                const htmlFile = path.resolve(fixturesPath, 'kroki-disabled.html');
                it('should render the markdown to html and return only image references', () => {
                    const expectedAttachments = [
                        { type: 'image', path: 'test/fixtures/images/img-1.png' }
                    ];
                    const expectedHtml = readFileSync(htmlFile, 'utf8');
                    const { html, attachments } = md2html.render({ path: mdFile }, pageRefs);
                    html.should.equal(expectedHtml);
                    attachments.should.eql(expectedAttachments);
                    existsSync(mmdFile).should.be.false;
                    existsSync(pumlFile).should.be.false;
                });
                describe('when github url is present', () => {
                    const htmlFile = path.resolve(fixturesPath, 'with-footer.html');
                    it('should include a footer with a link to the source on github', () => {
                        const expectedAttachments = [
                            { type: 'image', path: 'test/fixtures/images/img-1.png' }
                        ];
                        const expectedHtml = readFileSync(htmlFile, 'utf8');
                        const page = {
                            path: mdFile,
                            githubUrl: 'https://github.com/account/repo/blob/branch/docs/full.md'
                        };
                        const { html, attachments } = md2html.render(page, pageRefs);
                        html.should.equal(expectedHtml);
                        attachments.should.eql(expectedAttachments);
                        existsSync(mmdFile).should.be.false;
                    });
                });
            });
        });
    });
});
