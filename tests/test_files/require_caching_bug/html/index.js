const Beautifier = require('./beautifier');

function style_html(src, js_beautify) {
  const beautifier = new Beautifier(src, js_beautify);
  return beautifier.beautify();
}

module.exports = style_html;
