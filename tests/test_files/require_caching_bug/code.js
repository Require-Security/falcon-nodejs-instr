const js_beautify = require("./javascript/index");
const html_beautify = require("./html/index");
const assert = require('assert');

const src = "<html>...</html>";
// FIXME: This call should throw an exception due to calling the wrong
//        unberlying beutifieret
const str = html_beautify(src, js_beautify);
console.log(src);
