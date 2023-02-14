import { expect } from 'chai';

import BaseSdk from '../../lib/base-sdk.js';
describe('base-sdk', () => {
    let instance;
    const baseUrl = 'https://kroki.io';
    beforeEach(() => {
        instance = new BaseSdk(baseUrl);
    });
    describe('supportedTypes', () => {
        it('should throw Unimplemented', () => {
            expect(() => instance.supportedTypes).to.throw('Unimplemented');
        });
    });
    describe('request', () => {
        it('should throw Unimplemented', () => {
            expect(() => instance.request()).to.throw('Unimplemented');
        });
    });
});
