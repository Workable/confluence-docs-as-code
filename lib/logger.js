/**
 * @module logger
 */
import core from '@actions/core';

/**
 * debug log
 * @param {string} message - Log message
 */
function debug(message) {
    core.debug(message);
}

/**
 * error log
 * @param {string} message - Log message
 */
function error(error) {
    core.error(error);
}

/**
 * warn log
 * @param {string} message - Log message
 */
function warn(error) {
    core.warning(error);
}

/**
 * info log
 * @param {string} message - Log message
 */
function info(message) {
    core.info(message);
}

/**
 * @returns {boolean} True if debug is enabled
 */
function isDebug() {
    return core.isDebug();
}

/**
 * notice log
 * @param {string} message - Log message
 */
function notice(message) {
    core.notice(message);
}

/**
 * fail log
 * @param {string} message - Log message
 */
function fail(message) {
    core.setFailed(message);
}

export default {
    debug, warn, info, notice, error, isDebug, fail, summary: core.summary
};
