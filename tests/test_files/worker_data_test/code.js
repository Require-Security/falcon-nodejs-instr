const { Worker } = require('worker_threads');
const { join } = require('path');

console.log(`In main thread [pid=${process.pid}`);
var worker = new Worker(join(__dirname, './worker.js'), {
  workerData: {
    dataBuf: new SharedArrayBuffer(512)
  }
});
