const proxyquire = require('proxyquire').noCallThru();

res = proxyquire('./extensions', {
  fs: 'fs.export'
});

console.log(res);
