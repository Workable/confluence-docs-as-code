import sinon from 'sinon';
import core from '@actions/core';
import logger from '../../lib/logger.js';

const sandbox = sinon.createSandbox();

describe('logger', () => {
    let coreSpy;
    beforeEach(() => {
        coreSpy = {
            info: sandbox.stub(core, 'info'),
            error: sandbox.stub(core, 'error'),
            warning: sandbox.stub(core, 'warning'),
            notice: sandbox.stub(core, 'notice'),
            debug: sandbox.stub(core, 'debug'),
            isDebug: sandbox.stub(core, 'isDebug'),
            setFailed: sandbox.stub(core, 'setFailed')
        };
    });
    afterEach(() => {
        sandbox.restore();
    });
    describe('info', () => {
        it('log an info message via actions core', () => {
            const message = 'my message';
            logger.info(message);
            sandbox.assert.calledOnceWithExactly(coreSpy.info, message);
        });
    });
    describe('notice', () => {
        it('log a notice message via actions core', () => {
            const message = 'my message';
            logger.notice(message);
            sandbox.assert.calledOnceWithExactly(coreSpy.notice, message);
        });
    });
    describe('error', () => {
        it('log an error message via actions core', () => {
            const message = 'my message';
            logger.error(message);
            sandbox.assert.calledOnceWithExactly(coreSpy.error, message);
        });
    });
    describe('warning', () => {
        it('log a warning message via actions core', () => {
            const message = 'my message';
            logger.warn(message);
            sandbox.assert.calledOnceWithExactly(coreSpy.warning, message);
        });
    });
    describe('debug', () => {
        it('log a debug message via actions core', () => {
            const message = 'my message';
            logger.debug(message);
            sandbox.assert.calledOnceWithExactly(coreSpy.debug, message);
        });
    });
    describe('fail', () => {
        it('log a failure message via actions core', () => {
            const message = 'my message';
            logger.fail(message);
            sandbox.assert.calledOnceWithExactly(coreSpy.setFailed, message);
        });
    });
    describe('isDebug', () => {
        it('isDebug is delegated to core.isDebug', () => {
            logger.isDebug();
            sandbox.assert.calledOnce(coreSpy.isDebug);
        });
    });
});
