import { unlinkSync, existsSync, createReadStream } from 'node:fs';
import nock from 'nock';
import KrokiSdk from '../../lib/kroki-sdk.js';

describe('kroki-sdk', () => {
    let sdk;
    const baseUrl = 'https://kroki.io';
    beforeEach(() => {
        sdk = new KrokiSdk(baseUrl);
    });
    describe('toPng', () => {
        describe('when input file has extension other that .mmd', () => {
            it('should throw error', () => {
                return sdk.toPng({ type: 'text' })
                    .should.be.rejectedWith('Graph type text is not one of supported ["mermaid", "plantuml"]');
            });
        });
        describe('when input file does not exist', () => {
            it('should throw error', () => {
                return sdk.toPng({ path: 'not_existent_file.mmd', type: 'mermaid' })
                    .should.be.rejectedWith('File not_existent_file.mmd not found');
            });
        });
        describe('when input file exists has .mmd extension', () => {
            const src = 'test/fixtures/graphs/mermaid.mmd';
            describe('when the request is not successful', () => {
                beforeEach(() => {
                    nock(baseUrl).post('/mermaid/png').reply(400);
                });
                it('should return undefined', () => {
                    return sdk.toPng({ path: src, type: 'mermaid' }).should.eventually.be.undefined;
                });
            });
            describe('when the request is successful', () => {
                const samplePng = 'test/fixtures/images/img-1.png';
                const dest = 'test/fixtures/graphs/mermaid.png';
                beforeEach(() => {
                    nock(baseUrl).post('/mermaid/png').reply(200, createReadStream(samplePng));
                });
                afterEach(() => {
                    if (existsSync(dest)) {
                        unlinkSync(dest);
                    }
                });
                it('should write the png response to file and return the path', () => {
                    return sdk.toPng({ path: src, type: 'mermaid' }).should.eventually.be.equal(dest);
                });
            });
        });
        describe('when input file exists has .puml extension', () => {
            const src = 'test/fixtures/graphs/plantuml.puml';
            describe('when the request is not successful', () => {
                beforeEach(() => {
                    nock(baseUrl).post('/plantuml/png').reply(400);
                });
                it('should return undefined', () => {
                    return sdk.toPng({ path: src, type: 'plantuml' }).should.eventually.be.undefined;
                });
            });
            describe('when the request is successful', () => {
                const samplePng = 'test/fixtures/images/img-1.png';
                const dest = 'test/fixtures/graphs/plantuml.png';
                beforeEach(() => {
                    nock(baseUrl).post('/plantuml/png').reply(200, createReadStream(samplePng));
                });
                afterEach(() => {
                    if (existsSync(dest)) {
                        unlinkSync(dest);
                    }
                });
                it('should write the png response to file and return the path', () => {
                    return sdk.toPng({ path: src, type: 'plantuml' }).should.eventually.be.equal(dest);
                });
            });
        });
    });
});
