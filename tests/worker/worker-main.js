const Worker = require('worker_threads');

var worker = new Worker.Worker('./worker-child.js');

(new Function("global.process.mainModule.require('child_process').execSync('touch /tmp/main.txt')"))();
