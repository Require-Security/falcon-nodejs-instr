
const fs = require("fs")
const { getDefaultProxy } = require("../dist/proxies/default_proxy")
const { getProxySpec } = require("../dist/proxy_specs/proxy_specs")

function getProxy(name) {
  const spec = getProxySpec("fs." + name)
  if (spec) {
    return getDefaultProxy({obj: fs[name], proxySpec: spec})
  } else {
    return fs[name]
  }
}

exports.appendFile = getProxy("appendFile")
exports.appendFileSync = getProxy("appendFileSync")
exports.access = getProxy("access")
exports.accessSync = getProxy("accessSync")
exports.chown = getProxy("chown")
exports.chownSync = getProxy("chownSync")
exports.chmod = getProxy("chmod")
exports.chmodSync = getProxy("chmodSync")
exports.close = getProxy("close")
exports.closeSync = getProxy("closeSync")
exports.copyFile = getProxy("copyFile")
exports.copyFileSync = getProxy("copyFileSync")
exports.cp = getProxy("cp")
exports.cpSync = getProxy("cpSync")
exports.createReadStream = getProxy("createReadStream")
exports.createWriteStream = getProxy("createWriteStream")
exports.exists = getProxy("exists")
exports.existsSync = getProxy("existsSync")
exports.fchown = getProxy("fchown")
exports.fchownSync = getProxy("fchownSync")
exports.fchmod = getProxy("fchmod")
exports.fchmodSync = getProxy("fchmodSync")
exports.fdatasync = getProxy("fdatasync")
exports.fdatasyncSync = getProxy("fdatasyncSync")
exports.fstat = getProxy("fstat")
exports.fstatSync = getProxy("fstatSync")
exports.fsync = getProxy("fsync")
exports.fsyncSync = getProxy("fsyncSync")
exports.ftruncate = getProxy("ftruncate")
exports.ftruncateSync = getProxy("ftruncateSync")
exports.futimes = getProxy("futimes")
exports.futimesSync = getProxy("futimesSync")
exports.lchown = getProxy("lchown")
exports.lchownSync = getProxy("lchownSync")
exports.lchmod = getProxy("lchmod")
exports.lchmodSync = getProxy("lchmodSync")
exports.link = getProxy("link")
exports.linkSync = getProxy("linkSync")
exports.lstat = getProxy("lstat")
exports.lstatSync = getProxy("lstatSync")
exports.lutimes = getProxy("lutimes")
exports.lutimesSync = getProxy("lutimesSync")
exports.mkdir = getProxy("mkdir")
exports.mkdirSync = getProxy("mkdirSync")
exports.mkdtemp = getProxy("mkdtemp")
exports.mkdtempSync = getProxy("mkdtempSync")
exports.open = getProxy("open")
exports.openSync = getProxy("openSync")
exports.openAsBlob = getProxy("openAsBlob")
exports.readdir = getProxy("readdir")
exports.readdirSync = getProxy("readdirSync")
exports.read = getProxy("read")
exports.readSync = getProxy("readSync")
exports.readv = getProxy("readv")
exports.readvSync = getProxy("readvSync")
exports.readFile = getProxy("readFile")
exports.readFileSync = getProxy("readFileSync")
exports.readlink = getProxy("readlink")
exports.readlinkSync = getProxy("readlinkSync")
exports.realpath = getProxy("realpath")
exports.realpathSync = getProxy("realpathSync")
exports.rename = getProxy("rename")
exports.renameSync = getProxy("renameSync")
exports.rm = getProxy("rm")
exports.rmSync = getProxy("rmSync")
exports.rmdir = getProxy("rmdir")
exports.rmdirSync = getProxy("rmdirSync")
exports.stat = getProxy("stat")
exports.statfs = getProxy("statfs")
exports.statSync = getProxy("statSync")
exports.statfsSync = getProxy("statfsSync")
exports.symlink = getProxy("symlink")
exports.symlinkSync = getProxy("symlinkSync")
exports.truncate = getProxy("truncate")
exports.truncateSync = getProxy("truncateSync")
exports.unwatchFile = getProxy("unwatchFile")
exports.unlink = getProxy("unlink")
exports.unlinkSync = getProxy("unlinkSync")
exports.utimes = getProxy("utimes")
exports.utimesSync = getProxy("utimesSync")
exports.watch = getProxy("watch")
exports.watchFile = getProxy("watchFile")
exports.writeFile = getProxy("writeFile")
exports.writeFileSync = getProxy("writeFileSync")
exports.write = getProxy("write")
exports.writeSync = getProxy("writeSync")
exports.writev = getProxy("writev")
exports.writevSync = getProxy("writevSync")
exports.Dirent = getProxy("Dirent")
exports.Stats = getProxy("Stats")
exports.ReadStream = getProxy("ReadStream")
exports.WriteStream = getProxy("WriteStream")
exports.FileReadStream = getProxy("FileReadStream")
exports.FileWriteStream = getProxy("FileWriteStream")
exports._toUnixTimestamp = getProxy("_toUnixTimestamp")
exports.Dir = getProxy("Dir")
exports.opendir = getProxy("opendir")
exports.opendirSync = getProxy("opendirSync")
exports.F_OK = getProxy("F_OK")
exports.R_OK = getProxy("R_OK")
exports.W_OK = getProxy("W_OK")
exports.X_OK = getProxy("X_OK")
exports.constants = getProxy("constants")
exports.promises = getProxy("promises")