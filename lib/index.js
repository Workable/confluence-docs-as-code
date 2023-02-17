import config from './config.js';
import { sync, cleanup } from './confluence-syncer.js';

const action = config.confluence.cleanup ? cleanup : sync;

await action();
