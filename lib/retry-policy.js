import axiosRetry from 'axios-retry';

export default function retryPolicy(axios) {
    axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });
}
