require("../../../dist/index.js")({eventFile: __filename + ".events.json"})

const { Worker } = require('node:worker_threads');
const path = require('path')

new Worker(path.join(__dirname, "worker.js"))