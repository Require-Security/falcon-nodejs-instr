class Beautifier {
  constructor(src, js_beautify) {
    this.src = src;
    this.js_beautify = js_beautify;
  }

  beautify() {
    throw new Error('Required the wrong beautifier.js file!');
  }
}

module.exports = Beautifier;
