const lib2 = require("./lib2")

const _o = lib2.openForWriting

function openPathToVoid(cb) {
  return _o("/dev/null", cb)
}

module.exports.openPathToVoid = openPathToVoid