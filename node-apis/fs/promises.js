
const fs = require("fs")
const { getDefaultProxy } = require("../../dist/proxies/default_proxy")
const { getProxySpec } = require("../../dist/proxy_specs/proxy_specs")

function getProxy(name) {
  const spec = getProxySpec("fs.promises." + name)
  if (spec) {
    return getDefaultProxy({obj: fs.promises[name], proxySpec: spec})
  } else {
    return fs.promises[name]
  }
}

exports.access = getProxy("access")
exports.copyFile = getProxy("copyFile")
exports.cp = getProxy("cp")
exports.open = getProxy("open")
exports.opendir = getProxy("opendir")
exports.rename = getProxy("rename")
exports.truncate = getProxy("truncate")
exports.rm = getProxy("rm")
exports.rmdir = getProxy("rmdir")
exports.mkdir = getProxy("mkdir")
exports.readdir = getProxy("readdir")
exports.readlink = getProxy("readlink")
exports.symlink = getProxy("symlink")
exports.lstat = getProxy("lstat")
exports.stat = getProxy("stat")
exports.statfs = getProxy("statfs")
exports.link = getProxy("link")
exports.unlink = getProxy("unlink")
exports.chmod = getProxy("chmod")
exports.lchmod = getProxy("lchmod")
exports.lchown = getProxy("lchown")
exports.chown = getProxy("chown")
exports.utimes = getProxy("utimes")
exports.lutimes = getProxy("lutimes")
exports.realpath = getProxy("realpath")
exports.mkdtemp = getProxy("mkdtemp")
exports.writeFile = getProxy("writeFile")
exports.appendFile = getProxy("appendFile")
exports.readFile = getProxy("readFile")
exports.watch = getProxy("watch")
exports.constants = getProxy("constants")