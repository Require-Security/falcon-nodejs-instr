// This is where all hell breaks loose, due to the require cache being reset on
// the stealthy require made on this file.
const assert = require('assert');

// We should never get here.
assert(true)
