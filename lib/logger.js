import core from '@actions/core';

function debug(message) {
    core.debug(message);
}

function error(error) {
    core.error(error);
}

function warn(error) {
    core.warning(error);
}

function info(message) {
    core.info(message);
}

function isDebug() {
    return core.isDebug();
}

function notice(message) {
    core.notice(message);
}

function fail(message) {
    core.setFailed(message);
}


export default {
    debug, warn, info, notice, error, isDebug, fail, summary: core.summary
};
