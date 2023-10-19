const lib2 = require("./lib2")

const _o = lib2.openForWriting
const _rm = lib2.rm

function openPath(path) {
  return _o(path)
}

function rm(path) {
  return _rm(path)
}

module.exports.openPath = openPath
module.exports.rm = rm
