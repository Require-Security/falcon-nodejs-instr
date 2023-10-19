var stealthyRequire = require('stealthy-require');

var requestFresh = stealthyRequire(require.cache, function () {
  return require('./stealthy.js');
});
