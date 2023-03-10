import Graph from '../../../lib/models/graph.js';
import sinon from 'sinon';
import AssetRenderer from '../../../lib/renderers/asset-renderer.js';

const sandbox = sinon.createSandbox();

describe('models/graph', () => {
    const file = 'file.mmd';
    const imageFile = 'file.png';
    const path = `foo/bar/${file}`;
    const alt = 'Alt';
    const type = 'type';
    const renderer = 'kroki';
    let graph;

    describe('constructor', () => {
        describe('with all attributes', () => {
            beforeEach(() => {
                graph = new Graph(path, type, renderer, alt);
            });
            it('should set path, type, renderer and alt', () => {
                graph.path.should.equal(path);
                graph.type.should.equal(type);
                graph.renderer.should.equal(renderer);
                graph.alt.should.equal(alt);
            });
        });
        describe('without alt value', () => {
            beforeEach(() => {
                graph = new Graph(path, type, renderer);
            });
            it('should set generated alt', () => {
                graph.path.should.equal(path);
                graph.type.should.equal(type);
                graph.renderer.should.equal(renderer);
                graph.alt.should.equal(`${type} graph`);
            });
        });
    });
    describe('imageFilename', () => {
        beforeEach(() => {
            graph = new Graph(path, type, renderer, alt);
        });
        it('should return the base filename with .png extension', () => {
            graph.imageFilename.should.equal(imageFile);
        });
    });
    describe('markup', () => {
        const tests = [
            { renderer: 'unknown', expected: '' },
            { renderer: 'kroki', expected: `<ac:image ac:alt="${alt}"><ri:attachment ri:filename="${imageFile}" /></ac:image>` },
            { renderer: 'plantuml', expected: `<ac:image ac:alt="${alt}"><ri:attachment ri:filename="${imageFile}" /></ac:image>` },
            { renderer: 'mermaid-plugin', expected: `<ac:structured-macro ac:name="mermaid-cloud" data-layout="default" ><ac:parameter ac:name="filename">${file}</ac:parameter></ac:structured-macro>` }
        ];
        tests.forEach(test => {
            describe(`when renderer is ${test.renderer}`, () => {
                beforeEach(() => {
                    graph = new Graph(path, type, test.renderer, alt);
                });
                it('should render appropriate markup', () => {
                    graph.markup.should.equal(test.expected);
                });
            });
        });
    });
    describe('render', () => {
        let renderer;
        beforeEach(() => {
            graph = new Graph(path, type, renderer);
            renderer = sandbox.createStubInstance(AssetRenderer);
            renderer.renderGraph.callsFake(() => Promise.resolve(imageFile));
        });
        it('should use renderer.renderGraph to render this graph', () => {
            return graph.render(renderer).then((file) => {
                file.should.equal(imageFile);
                sandbox.assert.calledWith(renderer.renderGraph, graph);
            });
        });
    });
});
