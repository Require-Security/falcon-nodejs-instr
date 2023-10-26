
const http = require("http")
const { getDefaultProxy } = require("../dist/proxies/default_proxy")
const { getProxySpec } = require("../dist/proxy_specs/proxy_specs")

function getProxy(name) {
  const spec = getProxySpec("http." + name)
  if (spec) {
    return getDefaultProxy({obj: http[name], proxySpec: spec})
  } else {
    return fs[name]
  }
}

exports._connectionListener = getProxy("_connectionListener")
exports.METHODS = getProxy("METHODS")
exports.STATUS_CODES = getProxy("STATUS_CODES")
exports.Agent = getProxy("Agent")
exports.ClientRequest = getProxy("ClientRequest")
exports.IncomingMessage = getProxy("IncomingMessage")
exports.OutgoingMessage = getProxy("OutgoingMessage")
exports.Server = getProxy("Server")
exports.ServerResponse = getProxy("ServerResponse")
exports.createServer = getProxy("createServer")
exports.validateHeaderName = getProxy("validateHeaderName")
exports.validateHeaderValue = getProxy("validateHeaderValue")
exports.get = getProxy("get")
exports.request = getProxy("request")
exports.setMaxIdleHTTPParsers = getProxy("setMaxIdleHTTPParsers")
exports.maxHeaderSize = getProxy("maxHeaderSize")
exports.globalAgent = getProxy("globalAgent")