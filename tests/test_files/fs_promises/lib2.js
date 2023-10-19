const fs = require("fs")

function doOpen(path) {
  return fs.promises.open(path, 'w')
}

function openForWriting(path) {
  return doOpen(path)
}

function rm(path) {
  return fs.promises.unlink(path)
}

module.exports.openForWriting = openForWriting
module.exports.rm = rm
