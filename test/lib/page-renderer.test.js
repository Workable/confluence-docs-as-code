import path from 'node:path';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import sinon from 'sinon';
import config from '../../lib/config.js';
import { Image, Graph, Page, Meta } from '../../lib/models/index.js';
import PageRenderer from '../../lib/page-renderer.js';

const sandbox = sinon.createSandbox();

describe('page-render', () => {
    afterEach(() => {
        sandbox.restore();
    });
    describe('render', () => {
        describe('when a markdown file is given', async () => {
            const repo = 'https://github.com/account/repo';
            const fixturesPath = 'test/fixtures/markdown';
            const mdFile = fixturesPath + '/full.md';
            const imageFile = 'test/fixtures/images/img-1.png';
            const mmdFile = 'test/fixtures/markdown/full_graph_2.mmd';
            const pumlFile = 'test/fixtures/markdown/full_graph_3.puml';
            const pageRefs = { 'test/fixtures/markdown/other-page.md': 'Other Page' };
            let page;
            beforeEach(() => {
                page = new Page('Title', new Meta(repo, mdFile));
            });
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
                let renderer;
                beforeEach(() => {
                    sandbox.replace(config.graphs.mermaid, 'renderer', 'kroki');
                    sandbox.replace(config.graphs.plantuml, 'renderer', 'kroki');
                    renderer = new PageRenderer(config, pageRefs);
                });
                it('should render the markdown, save mermaid graph to file, return image and graph references', () => {
                    const expectedAttachments = [
                        new Image(imageFile, 'img1'),
                        new Graph(mmdFile, 'mermaid', 'kroki', 'graph_2'),
                        new Graph(pumlFile, 'plantuml', 'kroki', 'graph_3'),
                    ];
                    const expectedHtml = readFileSync(htmlFile, 'utf8');
                    renderer.render(page);
                    page.html.should.equal(expectedHtml);
                    page.attachments.should.eql(expectedAttachments);
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
                    let renderer;
                    beforeEach(() => {
                        sandbox.replace(config.graphs.plantuml, 'renderer', 'plantuml');
                        renderer = new PageRenderer(config, pageRefs);
                    });
                    it('should render the markdown, save mermaid graph to file, return image and graph references', () => {
                        const expectedAttachments = [
                            new Image(imageFile, 'img1'),
                            new Graph(mmdFile, 'mermaid', 'mermaid-plugin', 'graph_2'),
                            new Graph(pumlFile, 'plantuml', 'plantuml', 'graph_3'),
                        ];
                        const expectedHtml = readFileSync(htmlFile, 'utf8');
                        renderer.render(page);
                        page.html.should.equal(expectedHtml);
                        page.attachments.should.eql(expectedAttachments);
                        existsSync(mmdFile).should.be.true;
                        existsSync(pumlFile).should.be.true;
                    });
                });
            });
            describe('when no renderer configured for neither mermaid or plantuml', () => {
                let renderer;
                beforeEach(() => {
                    sandbox.replace(config.graphs.mermaid, 'renderer', 'none');
                    sandbox.replace(config.graphs.plantuml, 'renderer', 'none');
                    renderer = new PageRenderer(config, pageRefs);
                });
                const htmlFile = path.resolve(fixturesPath, 'kroki-disabled.html');
                it('should render the markdown to html and return only image references', () => {
                    const expectedAttachments = [
                        new Image(imageFile, 'img1')
                    ];
                    const expectedHtml = readFileSync(htmlFile, 'utf8');
                    renderer.render(page);
                    page.html.should.equal(expectedHtml);
                    page.attachments.should.eql(expectedAttachments);
                    existsSync(mmdFile).should.be.false;
                    existsSync(pumlFile).should.be.false;
                });
            });
        });
    });
});
