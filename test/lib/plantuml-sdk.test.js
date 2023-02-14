import { unlinkSync, existsSync, createReadStream } from 'node:fs';
import nock from 'nock';
import sinon from 'sinon';
import PlantUmlSdk from '../../lib/plantuml-sdk.js';
import plantumlEncoder from 'plantuml-encoder';

const sandbox = sinon.createSandbox();

describe('plantuml-sdk', () => {
    let sdk;
    const baseUrl = 'https://www.plantuml.com/plantuml/img';
    beforeEach(() => {
        sdk = new PlantUmlSdk(baseUrl);
    });
    afterEach(() => {
        sandbox.restore();
    });
    describe('toPng', () => {
        describe('when input type is not supported', () => {
            const type = 'mermaid';
            it('should throw error', () => {
                return sdk.toPng({ type })
                    .should.be.rejectedWith(`Graph type ${type} is not one of supported ["plantuml"]`);
            });
        });
        describe('when input file does not exist', () => {
            const file = 'not_existent_file.puml';
            it('should throw error', () => {
                return sdk.toPng({ path: file, type: 'plantuml' })
                    .should.be.rejectedWith(`File ${file} not found`);
            });
        });
        describe('when input type is supported', () => {
            const encodedData = 'LP1D2eD034RtSueixS8Um';
            beforeEach(() => {
                sandbox.stub(plantumlEncoder, 'encode').returns(encodedData);
            });
            describe('and input file exists', () => {
                const src = 'test/fixtures/graphs/plantuml.puml';
                describe('when the request is not successful', () => {
                    beforeEach(() => {
                        nock(baseUrl).get(`/${encodedData}`).reply(400);
                    });
                    it('should return undefined', () => {
                        return sdk.toPng({ path: src, type: 'plantuml' }).should.eventually.be.undefined;
                    });
                });
                describe('when the request is successful', () => {
                    const samplePng = 'test/fixtures/images/img-1.png';
                    const dest = 'test/fixtures/graphs/plantuml.png';
                    beforeEach(() => {
                        nock(baseUrl).get(`/${encodedData}`).reply(200, createReadStream(samplePng));
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
});
