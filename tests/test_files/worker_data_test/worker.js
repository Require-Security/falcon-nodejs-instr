const { workerData } = require('worker_threads');
const assert = require('assert');

console.log(`In Worker Thread [pid=${process.pid}]`);

assert.notEqual(workerData, null);
assert.notEqual(workerData.dataBuf, null);

// This call should not break!
const buf = Buffer.from(workerData.dataBuf);
