import { unlinkSync, existsSync, createReadStream } from 'node:fs';
import nock from 'nock';
import KrokiSdk from '../../lib/kroki-sdk.mjs';

describe('kroki-sdk', () => {
    let sdk;
    const sdkOpts = {
        host: 'https://kroki.io',
        supportedTypes: {
            '.mmd': 'mermaid',
            '.puml': 'plantuml'
        }
    };
    beforeEach(() => {
        sdk = new KrokiSdk(sdkOpts);
    });
    describe('toPng', () => {
        describe('when input file has extension other that .mmd', () => {
            it('should throw error', () => {
                return sdk.toPng('file.txt')
                    .should.be.rejectedWith('File extension .txt is not one of supported types [".mmd", ".puml"]');
            });
        });
        describe('when input file does not exist', () => {
            it('should throw error', () => {
                return sdk.toPng('not_existent_file.mmd')
                    .should.be.rejectedWith('File not_existent_file.mmd not found');
            });
        });
        describe('when input file exists has .mmd extension', () => {
            const src = 'test/fixtures/graphs/mermaid.mmd';
            describe('when the request is not successful', () => {
                beforeEach(() => {
                    nock(sdk.host).post('/mermaid/png').reply(400);
                });
                it('should return undefined', () => {
                    return sdk.toPng(src).should.eventually.be.undefined;
                });
            });
            describe('when the request is successful', () => {
                const samplePng = 'test/fixtures/images/img-1.png';
                const dest = 'test/fixtures/graphs/mermaid.png';
                beforeEach(() => {
                    nock(sdk.host).post('/mermaid/png').reply(200, createReadStream(samplePng));
                });
                afterEach(() => {
                    if (existsSync(dest)) {
                        unlinkSync(dest);
                    }
                });
                it('should write the png response to file and return the path', () => {
                    return sdk.toPng(src).should.eventually.be.equal(dest);
                });
            });
        });
        describe('when input file exists has .puml extension', () => {
            const src = 'test/fixtures/graphs/plantuml.puml';
            describe('when the request is not successful', () => {
                beforeEach(() => {
                    nock(sdk.host).post('/plantuml/png').reply(400);
                });
                it('should return undefined', () => {
                    return sdk.toPng(src).should.eventually.be.undefined;
                });
            });
            describe('when the request is successful', () => {
                const samplePng = 'test/fixtures/images/img-1.png';
                const dest = 'test/fixtures/graphs/plantuml.png';
                beforeEach(() => {
                    nock(sdk.host).post('/plantuml/png').reply(200, createReadStream(samplePng));
                });
                afterEach(() => {
                    if (existsSync(dest)) {
                        unlinkSync(dest);
                    }
                });
                it('should write the png response to file and return the path', () => {
                    return sdk.toPng(src).should.eventually.be.equal(dest);
                });
            });
        });
    });
});
