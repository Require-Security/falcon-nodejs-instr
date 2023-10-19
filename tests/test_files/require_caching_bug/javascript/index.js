var Beautifier = require('./beautifier');

function js_beautify(src, js_beautify) {
  const beautifier = new Beautifier(src, js_beautify);
  return beautifier.beautify();
}

module.exports = js_beautify;
