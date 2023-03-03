/**
 * @module confluence-sdk-errors
 */

/**
 * An error thrown when a request to confluence api fails
 */
export class RequestError extends Error {
    constructor(status, statusText, message = null) {
        super(`Request failed with: ${status} - ${message || statusText}`);
    }
}
