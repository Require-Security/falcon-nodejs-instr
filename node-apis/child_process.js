
const child_process = require("child_process")
const { getDefaultProxy } = require("../dist/proxies/default_proxy")
const { getProxySpec } = require("../dist/proxy_specs/proxy_specs")

function getProxy(name) {
  const spec = getProxySpec("child_process." + name)
  if (spec) {
    return getDefaultProxy({obj: child_process[name], proxySpec: spec})
  } else {
    return fs[name]
  }
}

exports._forkChild = getProxy("_forkChild")
exports.ChildProcess = getProxy("ChildProcess")
exports.exec = getProxy("exec")
exports.execFile = getProxy("execFile")
exports.execFileSync = getProxy("execFileSync")
exports.execSync = getProxy("execSync")
exports.fork = getProxy("fork")
exports.spawn = getProxy("spawn")
exports.spawnSync = getProxy("spawnSync")