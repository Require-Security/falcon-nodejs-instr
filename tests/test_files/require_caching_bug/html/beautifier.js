class Beautifier {
  constructor(src, js_beautify) {
    this.src = src;
    this.js_beautify = js_beautify;
  }

  beautify() {
    return this.src;
  }
}

module.exports = Beautifier;
