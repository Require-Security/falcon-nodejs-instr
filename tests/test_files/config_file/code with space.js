// BANANAS

const fs = require('fs')
const [node, filename, name, target] = process.argv

const fn = fs[name]
const txt = fn(target, {encoding: "utf-8"})
if(!txt.startsWith("// BANANAS")) {
  console.error(txt)
  throw Error("Should have read this file?")
}
