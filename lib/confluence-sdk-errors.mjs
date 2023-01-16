export class RequestError extends Error {
    constructor(status, statusText, message = null) {
        super(`Request failed with: ${status} - ${message || statusText}`);
    }
}

