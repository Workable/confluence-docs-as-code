/**
 * @module retry-policy
 */
import axiosRetry from 'axios-retry';

/**
 * Apply the retry policy to Axios instance
 *
 * @param {Axios} axios - Axios instance
 */
function retryPolicy(axios) {
    axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });
}

export default retryPolicy;
