const fs = require("fs")

function doOpen(path, perm, cb) {
  fs.open(path, perm, cb)
}
function openForWriting(path, cb) {
  doOpen(path, 'w', cb)
}

module.exports.openForWriting = openForWriting