
const https = require("https")
const { getDefaultProxy } = require("../dist/proxies/default_proxy")
const { getProxySpec } = require("../dist/proxy_specs/proxy_specs")

function getProxy(name) {
  const spec = getProxySpec("https." + name)
  if (spec) {
    return getDefaultProxy({obj: https[name], proxySpec: spec})
  } else {
    return https[name]
  }
}

exports.Agent = getProxy("Agent")
exports.globalAgent = getProxy("globalAgent")
exports.Server = getProxy("Server")
exports.createServer = getProxy("createServer")
exports.get = getProxy("get")
exports.request = getProxy("request")