import MockAdapter from 'axios-mock-adapter';

export default function (axiosInstance) {
    describe('when http request fails with a retry-able error', () => {
        const requestPath = '/foo';
        let mock;
        beforeEach(() => {
            // Had to resort on axios-mock-adapter due to the issue 
            // described here: https://github.com/axios/axios/issues/5055
            mock = new MockAdapter(axiosInstance);
        });
        afterEach(() => {
            mock.reset();
        });
        it('should retry the request', () => {
            mock.onGet(requestPath).replyOnce(500)
                .onGet(requestPath).reply(200, 'OK');
            return axiosInstance.get(requestPath).then(response => {
                response.status.should.equal(200);
                response.data.should.equal('OK');
                response.config['axios-retry'].retryCount.should.equal(1);
            });
        });
    });
}
