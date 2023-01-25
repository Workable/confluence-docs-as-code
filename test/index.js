import dotenv from 'dotenv';
import path from 'node:path';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';

// extends Chai with a fluent language for asserting facts about promises.
chai.use(chaiAsPromised);

// add should style assertions to global scope
chai.should();
chai.expect();

// load env variables from fixtures 
dotenv.config({ path: path.resolve('test/fixtures/.env.test') });

// disable real HTTP request
nock.disableNetConnect();
