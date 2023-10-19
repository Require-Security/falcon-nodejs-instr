import path = require("path")

export const HEADER_DONE = "/* HEADER_DONE */"
export const instrumentationDirectory = path.join(__dirname, "../../dist")
export const srcDirectory = path.join(__dirname, "../../src")
export const nodeModulesDirectory = path.join(__dirname, "../../node_modules")
export const defaultConfigName = "config.reqsec"

// These are property names that we never want to proxy, regardless
// of what their values end up being
export const DO_NOT_PROXY_PROPERTIES = new Set(["prototype", Symbol.hasInstance])

export const REQSEC_AGENT_CONFIG = "REQSEC_AGENT_CONFIG"

// Iterate over all the fields direclty owned by obj's prototype
// check which ones are functions, and return those
function getFunctions(obj: any) {
  return Object.getOwnPropertyNames(obj.prototype)
         .map(name => obj.prototype[name])
         .filter(elt => typeof elt == "function")
}

// These are specific objects (functions, really, but functions are objects)
// tha we don't want to proxy, regardless of how they're accessed
export const DO_NOT_PROXY_OBJECTS = new Set([getFunctions(Array),
                                             getFunctions(Object),
                                             // Can't iterate Function.prototype because
                                             // arguments, caller, and callee are
                                             // inaccessible in strict mode
                                             Function.prototype.call,
                                             Function.prototype.apply,
                                             // XXX: if we want to specifically support bind,
                                             // remove this and handle seperately
                                             Function.prototype.bind
                                            ].flat())

export const agentEntry = path.join(instrumentationDirectory, "reqsec-nodejs.js")
