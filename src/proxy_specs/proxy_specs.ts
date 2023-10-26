// Copyright 2023, Require Security Inc, All Rights Reserved

import { Name, SpecJson } from "../types/types"
import fs = require("fs")
import path = require("path")
import { State } from "../global_state";
import { ArgType, FunctionArgType, RawType, parseMethodSignature } from "./parse_method_signature";
import assert = require("assert");
import { getDefaultProxy } from "../proxies/default_proxy";
import { proxiable } from "../utils/misc";

var TOP_LEVEL_SPEC: Namespace;

const methodsToFinish: Set<Method> = new Set()
const overloadsToFinish: Set<OverloadedMethod> = new Set()
const classesToFinish: Map<Namespace, string> = new Map()

// This map stores all the classes that we parse out of the json
// categorization files so we can check later if we're interested
// in them, and grab their corresponding spec.
//
// If we're running with trace-unknown-builtins, then we
// want to trace all unknown classes as well, hence this dance
const classesOfInterest: Map<string, Namespace | Unknown> = new Map()
classesOfInterest.get = function (value: string) {
  let out = Map.prototype.get.call(this, value)
  if (!out) {
    // Assuming all class names with '.' in them are api classes
    if(value.includes(".") && State().traceUnknownBuiltins) {
      out = new Unknown(value)
    }
  }
  return out
}
classesOfInterest.has = function (value: string) {
  let out = Map.prototype.has.call(this, value)
  if (!out) {
    // Assuming all class names with '.' in them are api classes
    if(value.includes(".") && State().traceUnknownBuiltins) {
      out = true
    }
  }
  return out
}


export type Spec = Namespace | Unknown | Method | OverloadedMethod | Field

const TopLevelName = "TOP_LEVEL"

function TopLevel() {
  return new Namespace(TopLevelName, new Map())
}

export function getProxiedBuiltins() {
  return [...TOP_LEVEL_SPEC.specs.keys()]
}

export class Namespace {
  kind: "Namespace"
  specs: Map<PropertyKey, Spec>
  name: string
  level: number
  category: string
  parent: Namespace | undefined
  constructor(name: Name,
              specs: Map<PropertyKey, Spec>,
              category: string = "UNKNOWN",
              level: number = 0) {
    this.kind = "Namespace"
    this.specs = specs
    this.category = category
    this.name = name
    this.level = level
  }

  _get(name: PropertyKey): Spec | null {
    const spec = this.specs.get(name)
    if (spec) {
      return spec
    }

    if (this.parent) {
      return this.parent._get(name)
    }

    return null
  }

  get(name: PropertyKey): Spec | null {
    const spec = this._get(name)
    if (spec) {
      return spec
    }

    if (!State().traceUnknownBuiltins) {
      return null
    }

    // Don't include the top-level name for unknown modules.
    if(this.name == TopLevelName) {
      return new Unknown(name.toString())
    } else {
      return new Unknown(`${this.name.toString()}.${name.toString()}`)
    }
  }

  addSpec(name: string, spec: Spec) {
    this.specs.set(name, spec)
    this.level = spec.level > this.level ? spec.level : this.level
  }

  getAllSpecs() {
    let specs = [...this.specs.values()]
    if(this.parent) {
      specs = specs.concat(this.parent.getAllSpecs())
    }

    return specs
  }
}

type ProxyReturnFn = {
  (result: unknown): unknown
  spec: Spec
  isPromise: boolean
}

export class Method {
  kind: "Method"
  name: string
  level: number
  category: string
  argTypes: Array<ArgType[]>
  // XXX: Make this a proper ArgType[]
  returnType: string
  // Run this to proxy the return of this function
  proxyReturn: ProxyReturnFn | null
  // Run this to proxy the args of this function
  proxyArgs: ((args: ArrayLike<unknown>) => ArrayLike<unknown>) | null
  constructor(name: string,
              level: number,
              category: string,
              argTypes: Array<ArgType[]>,
              returnType: string) {
    this.kind = "Method"
    this.name = name
    this.level = level
    this.category = category
    this.argTypes = argTypes
    this.returnType = returnType

    const [_, ...rest] = argTypes
    if (rest.some(ts => ts.some(t => t.kind == "LiteralType"))) {
      throw Error("Not Implemented: We only support literals as the first argument")
    }
  }
}


export class Field {
  kind: "Field"
  name: string
  level: number
  category: string
  constructor(name: string,
              level: number,
              category: string) {
    this.kind = "Field"
    this.name = name
    this.level = level
    this.category = category
  }
}

export class OverloadedMethod {
  kind: "OverloadedMethod"
  signatures: Method[]
  getSpec: (args: ArrayLike<unknown>) => Method

  constructor(signatures: Method[]) {
    this.signatures = signatures
    this.kind = "OverloadedMethod"
  }

  get level() {
    return Math.max(...this.signatures.map(s => s.level))
  }

  get name() {
    return this.signatures[0].name
  }

  get proxyReturn() {
    return this.signatures[0].proxyReturn
  }

  get category() {
    return this.signatures[0].category
  }
}

export class Unknown {
  kind: "Unknown"
  category: "Unknown"
  name: string
  level: number

  constructor(name: string) {
    this.kind = "Unknown",
    this.category = "Unknown"
    this.name = name
    this.level = 1
  }

  get (name: PropertyKey) {
    return new Unknown(`${this.name.toString()}.${name.toString()}`)
  }
}

// XXX: This is kinda inefficient. Can do better if we care
function getNamespaceForNamePath(ns: Namespace,
                                 namePath: string[]):
                                {ns: Namespace, baseName: string} {
  const [name, ...rest] = namePath
  // If we've reached the end of the name. The namespace we want is the one
  // we have
  if (rest.length == 0) {
    return {ns: ns, baseName: name}
  }

  var next = ns.specs.get(name)
  if (!next) {
    next = new Namespace(name, new Map())
    ns.specs.set(name, next)
  }

  if (next.kind != "Namespace") {
    throw Error("Non-namespace sub-namespace?")
  }

  return getNamespaceForNamePath(next, rest)
}

function parseTopLevel(json: SpecJson.TopLevel) {
  if (json.ignore) {
    TOP_LEVEL_SPEC.specs.set(json.name, new Namespace(json.name, new Map(), "IGNORE"))
    return
  }

  parseModule(json, json.name)
}

function parseModule(json: SpecJson.ModuleSpec,
                     topLevelName: string) {
  for (const klass of json.classes) {
    parseClass(klass, topLevelName)
  }

  for (const method of json.methods) {
    parseMethod(method, topLevelName)
  }

  for (const module of json.modules) {
    parseModule(module, topLevelName)
  }
}

function parseClass(json_klass: SpecJson.ClassSpec,
                    topLevelName: string) {
  if(!json_klass.name) {
    throw Error(`Found class without name: ${json_klass}`)
  }
  const fullName = [topLevelName].concat(json_klass.name.split("."))

  const {baseName, ns} = getNamespaceForNamePath(TOP_LEVEL_SPEC, fullName)

  if(ns.specs.has(baseName)) {
    throw Error(`Multiple definitions for class ${baseName}`)
  }
  const fullNameStr = fullName.join(".")

  const prevClass = classesOfInterest.get(fullNameStr)
  if (prevClass?.kind == "Namespace") {
    throw Error(`Name clash for class ${fullNameStr}`)
  }
  var klass = new Namespace(fullName.join("."), new Map())

  ns.specs.set(baseName, klass)

  classesOfInterest.set(fullNameStr, klass)

  for (const method of json_klass.methods) {
    parseMethod(method, fullNameStr)
  }
  // We're not interested in this class after all.
  // XXX: This is very backwards but we're forced to do things this way
  // because of how the files are currently organized.
  if (klass.specs.size == 0) {
    ns.specs.delete(baseName)
    classesOfInterest.delete(fullNameStr)
    return
  }

  // If this class has a parent, we'll need to look it up in the second pass
  if (json_klass.parent) {
    classesToFinish.set(klass, json_klass.parent)
  }
}

export function startsWithLiteral(method: Method) {
  const firstArg = method.argTypes?.at(0)
  return firstArg?.length == 1 && firstArg.at(0)?.kind == "LiteralType"
}

export function startsWithString(method: Method) {
  const firstArg = method.argTypes?.at(0)
  if (!firstArg) {
    return false
  }

  return firstArg.some(type => type.kind == "RawType" && type.name.toLowerCase() == "string")
}


function parseMethod(json_method: SpecJson.MethodSpec,
                     topLevelName: string) {
  function _doParseMethod(json_method: SpecJson.MethodSpec,
                          topLevelName: string)
  {
    const fullName = topLevelName.split(".").concat(json_method.name.split("."))
    const {baseName, ns} = getNamespaceForNamePath(TOP_LEVEL_SPEC, fullName)

    // Parse the signature to see if we need to proxy the return value for this method
    const parsedField = json_method.signature.match(/^\s*:\s*(.*)/)
    // Empty signature means it's a field. Don't worry about return/arg types
    if(parsedField) {
      // XXX: do something with field types
      assert (!ns.specs.has(baseName), "should not have multiple field entries")
      var field = new Field(fullName.join("."), json_method.level,
                            json_method.kind)
      ns.addSpec(baseName, field)
      return
    }

    const [argTypes, returnType] = parseMethodSignature(json_method)

    var method = new Method(fullName.join("."), json_method.level,
    json_method.kind, argTypes, returnType)

    // We'll finish methods *after* we parse the whole file and get all the classes
    methodsToFinish.add(method)

    // We can have multiple specs for the same method because in javascript you
    // can be passed many different arguments and types of arguments, and the code
    // inside the function figures out what to do with those. The key is that
    // there is only one underlying function, so all the specs should match
    // on their level.
    const existingSpec = ns.specs.get(baseName)
    if (existingSpec === undefined) {
      ns.addSpec(baseName, method)
      return
    }

    if (existingSpec.kind == "Method") {
      assert(existingSpec.argTypes, "Don't have an overload without a signature")
      const spec = new OverloadedMethod([existingSpec, method])
      overloadsToFinish.add(spec)
      ns.addSpec(baseName, spec)
      return
    }

    if (existingSpec.kind == "OverloadedMethod") {
      existingSpec.signatures.push(method)
      return
    }

    throw Error(`ExistingSpec.kind should be a method or overloaded method. Got ${existingSpec.kind}`)
  }

  if (!json_method.name) {
    throw Error(`Found method without name: ${json_method}`)
  }

  if (json_method.name == "on") {
    throw Error ("Use addListener, not on -- we will auto-merge them")
  }

  if (json_method.name == "addListener") {
    const on_json = Object.assign({}, json_method)
    on_json.name = "on"
    _doParseMethod(on_json, topLevelName)
  }

  _doParseMethod(json_method, topLevelName)
}

function finishClass(parentName: string, klass: Namespace, map:unknown) {
  const parentSpec = classesOfInterest.get(parentName)
  if (parentSpec?.kind == "Namespace") {
    klass.parent = parentSpec
  }
}

// This is called after the cat file has been parsed
function finishMethod(method: Method) {
  method.proxyReturn = getProxyMethodReturn(method)
  method.proxyArgs = getProxyMethodArgs(method)
}

function getProxyMethodReturn(method: Method) {
  // XXX: I'm being lazy and so for now we ignore return types with
  // multiple possibilities
  if (!method.returnType || method.returnType.match(/\|/)) {
    /* XXX: This breaks the unit-tests. We really need some logging functionality
    console.warn(`WARNING: Not wrapping return value for method ${json_method.name} ` +
                 `which has multiple return types ${returnType}`)
    */
    return null
  }

  const isPromise = method.returnType.match(/Promise<(.+)>/)
  const retClassName = isPromise ? isPromise[1] : method.returnType
  const classOfInterest = classesOfInterest.get(retClassName)

  if(classOfInterest === undefined) {
    return null
  }

  if(!isPromise) {
    const proxyReturn = function (result: unknown) {
      if (!proxiable(result))
        return result
      return getDefaultProxy({ obj: result, proxySpec: classOfInterest! })
    }
    proxyReturn.spec = classOfInterest!
    proxyReturn.isPromise = false
    return proxyReturn
  }

  // Promise case
  const proxyReturn = function (result: unknown) {
    if (!proxiable(result)) {
      return result
    }
    // result.then takes up to two arguments: callback functions for the
    // fulfilled and rejected cases of the Promise. It immediately
    // returns an equivalent Promise object, allowing you to chain calls
    // to other promise methods.
    //
    // What we're doing here is have getDefaultProxy be called once the
    // promise is fulfilled with the object that was wrapped by the
    // promise.
    //
    // XXX: Should we also proxy the rejected case?
    return (result as Promise<object>).then((o: object) => {
      return getDefaultProxy({ obj: o, proxySpec: classOfInterest! })
    })
  }
  proxyReturn.spec = classOfInterest!
  proxyReturn.isPromise = true
  typeof proxyReturn
  return proxyReturn
}

/** Take a callback arg and figure out which of its parameters should be proxied
 *
 * @param callbackType The type of the callback
 * @returns List of wrappers-or-null for each parameter (where wrappers
 * are for sensitive parameters and nulls for not)
 */
function processMethodArgThatIsCallback(callbackType: FunctionArgType) {
  let sensitiveParams: Map<number, Spec> = new Map()
  for (let i = 0; i < callbackType.params.length; i++) {
    const paramTypes = callbackType.params[i]
    // XXX: handle multiple levels of callback if that's ever relevant???

    // We don't handle callbacks with multiple possible arguments. Not sure
    // they can happen, and if they can and anything is sensitive, we
    // will throw
    if (paramTypes.length > 1) {
      if(paramTypes.some(paramType => paramType.kind == "RawType"
                         && classesOfInterest.has(paramType.name))) {
          throw Error("NotImplemented: Typed callbacks with classes of interest with multiple options")
        }
        continue
    }

    const paramType = paramTypes[0]

    // Not dealing with a rawType, continue
    if (paramType.kind != "RawType") {
      continue
    }

    const classOfInterest = classesOfInterest.get(paramType.name)

    if (!classOfInterest) {
      continue
    }

    sensitiveParams.set(i, classOfInterest)
  }

  return sensitiveParams
}

// We currently only support typed callbacks, which should always be the
// last argument to a function
function validateMethodArgCallbackLocation(argTypes: Array<ArgType[]>) {
  // Iterate all-but-the-last argument
  for (let i = 0; i < argTypes.length - 1; i++) {
    const possibleTypes = argTypes[i]
    if(possibleTypes.some(t => t instanceof FunctionArgType)) {
      throw Error("Not Supported: Only callbacks should be typed, and callbacks should always be the last element!")
    }
  }
}

function getProxyMethodArgs(method: Method) {
  validateMethodArgCallbackLocation(method.argTypes)

  // Callbacks are always the last argument
  const lastArgTypes = method.argTypes.at(-1)

  // If the last argument isn't a callback, we're done
  if (!lastArgTypes?.some(t => t instanceof FunctionArgType)) {
    return null
  }

  assert(lastArgTypes.length == 1, "NotImplemented: Support for final argument that is sometimes a callback and sometimes not")

  const callbackType = lastArgTypes[0] as FunctionArgType
  const sensitiveParamSpecs = processMethodArgThatIsCallback(callbackType)

  // Nothing sensitive, we're done
  if (sensitiveParamSpecs.size == 0) {
    return null
  }

  // If we get here, this arg is a callback with at least one sensitive parameter
  const callbackHandler = {
    apply(target: Function, self: unknown, callbackArgs: ArrayLike<unknown>) {
      const args = []
      for (let i = 0; i < callbackArgs.length; i++) {
        const spec = sensitiveParamSpecs.get(i)
        if (spec) {
          // XXX: check the actual runtime type?
          args.push(getDefaultProxy({obj: callbackArgs[i] as object, proxySpec: spec}))
        } else {
          args.push(callbackArgs[i])
        }
      }

      return Reflect.apply(target, self, args)
    }
  }

  function proxyArgs(rawArgs: ArrayLike<unknown>) {
    const args = []

    // First check the last arg for callbackhood, prepend to beginning of array
    const lastArg = rawArgs[rawArgs.length - 1]
    if (lastArg instanceof Function) {
      args.unshift(new Proxy(lastArg as Function, callbackHandler))
    } else {
      args.unshift(lastArg)
    }

    // Now reverse-iterate the rest of the args starting from the
    // second-from-the-end
    for (let i = rawArgs.length - 2; i >= 0; i--) {
      const arg = rawArgs[i]
      assert (!(arg instanceof Function))
      args.unshift(arg)
    }

    return args
  }

  return proxyArgs
}

function finishOverload(method: OverloadedMethod) {
  // Category and name should always match
  const modelSpec = method.signatures[0]
  if (!method.signatures.every(spec => spec.name == modelSpec.name &&
                                       spec.category == modelSpec.category)) {
    throw Error("Name and category should always match")
  }

  // First easy case: None of the overloaded methods have a proxyArgs or
  // proxyReturn and they're all the same sensitivity, so we can return
  // any of them
  if (method.signatures.every(m => m.proxyArgs === null &&
                                   m.proxyReturn?.isPromise == modelSpec.proxyReturn?.isPromise &&
                                   m.proxyReturn?.spec == modelSpec.proxyReturn?.spec &&
                                   m.level == modelSpec.level)) {
    method.getSpec = (args) => {return method.signatures[0]}
    return
  }

  // If we're here, then the overloaded signatures actually have to
  // differentiate.
  function canDifferentiateOnLiterals(method: OverloadedMethod) {
    let defaultSpec : Method | null = null
    for (const spec of method.signatures) {
      const argTypes = spec.argTypes
      if (argTypes == null) {
        throw Error("Overloaded signatures all need to have a signature!")
      }

      const firstArg = argTypes[0]

      if(!firstArg) {
        // Can't differentiate on literals with no arguments
        return false
      }

      const nonLiterals = firstArg.filter(t => t.kind != "LiteralType")
      // This signature doesn't just contain literals
      if (nonLiterals.length > 0) {
        if (nonLiterals.some(t => t.kind != "RawType" || t.name != "string")) {
          throw Error(`Cannot mix literals and non-string types: ${JSON.stringify(firstArg)}`)
        }

        // We can only have one non-literal spec if we're actually trying to differentiate,
        // or else things get confused
        if(defaultSpec === null) {
          defaultSpec = spec
        } else {
          // Can't differentiate on literals with multiple defaults
          return false
        }
      }
    }

    // Automatically make a default for untracked events.
    // XXX: add a command line argument to track these
    const baseName = method.name.split(".").at(-1)
    if (defaultSpec === null &&
        baseName &&
        ["on", "addListener"].includes(baseName)) {
      const argTypes = [[new RawType("string")], [new RawType("Function")]]
      defaultSpec = new Method(method.name, 0, method.category, argTypes, "unknown")
    }

    function getSpec(args: ArrayLike<unknown>): Method {
      for (const spec of method.signatures) {
        const firstArg = spec.argTypes![0]
        if (firstArg.some(t => t.kind == "LiteralType" && t.text == args[0])) {
          return spec
        }
      }

      if (defaultSpec === null) {
        // @ts-ignore
        const lits = method.signatures.map(sig => JSON.stringify(sig.argTypes![0][0].text))
        throw Error(`Unmatched literal ${args[0]} and no default. Handled literals are ${lits}`)
      }

      return defaultSpec as Method
    }

    method.getSpec = getSpec
    return true
  }

  function canDifferentiateOnArgNumbers(method: OverloadedMethod) {
    const argNumbers = new Set()
    for (const spec of method.signatures) {
      const argTypes = spec.argTypes
      if (argTypes == null) {
        throw Error("Overloaded signatures all need to have a signature!")
      }

      if (argNumbers.has(argTypes.length)) {
        return false
      }
    }

    function getSpec(args: ArrayLike<unknown>): Method {
      for (const spec of method.signatures) {
        if (args.length == spec.argTypes!.length) {
          return spec
        }
      }

      throw Error("Got unexpected numbers of arguments. Fix your overloads")
    }

    method.getSpec = getSpec
    return true
  }

  if(canDifferentiateOnLiterals(method)) {
    return
  }

  if(canDifferentiateOnArgNumbers(method)) {
    return
  }

  throw Error(`Need to differentiate overloads and no good way to do so: ${JSON.stringify(method)}`)
}

export function loadProxySpecs(apisDir: string) {
  TOP_LEVEL_SPEC = TopLevel()

  const files = fs.readdirSync(apisDir, { encoding: 'utf-8' })
  const txts = files.filter(f => f.endsWith(".json"))
    .map(f => fs.readFileSync(path.join(apisDir, f), { encoding: 'utf-8' }))
  const jsons = txts.map(txt => JSON.parse(txt))
  jsons.forEach(parseTopLevel)

  // Finish class extensions
  classesToFinish.forEach(finishClass)
  // Now match methods with return types and arg types to types that we're
  // interested in proxying.
  methodsToFinish.forEach(finishMethod)
  // Now, after figuring out return and argument wrappers, figure out
  // which overloads we actually want to deal with
  overloadsToFinish.forEach(finishOverload)
}

// Useful function to examine the namespace hierarchy. Currently unused but I think
// it's worth keeping around as we keep messing with this code
function printNs(ns: Namespace, indent: number) {
  console.log(`${'>'.repeat(indent)} Namespace ${String(ns.name)}`)
  indent += 2
  for (const [key, value] of ns.specs.entries()) {
    console.log(`${'>'.repeat(indent)} ${value.kind}: ${String(key)} -> ${String(value.name)}`)
    if (! (value instanceof Namespace)) {
      continue
    }
    printNs(value, indent)
  }
}

/*
 * Gets the proxy spec for the passed path. It handles things
 * like
 *    require("fs/promise")
 * by walking down the namespace tree looking for the right
 * proxy spec.
 */
export function getProxySpec(path: string): Spec | null {
  // Is it a simple path? ie.
  //   require("fs)
  if (! path.match(/\//)) {
    return TOP_LEVEL_SPEC.get(path)
  }
  // Fun times. Recurse, creating empty namespaces as needed. This
  // handles things like:
  // const { mkdtemp } = require("fs/promises")
  const parts = path.split('/')
  var ns = TOP_LEVEL_SPEC
  for (var i = 0; i < parts.length - 1; i++) {
    var next = ns.specs.get(parts[i])
    if (!next) {
      // Stop creating namespaces and just return an Unknown for
      // the rest of the path. Otherwise we can get into bad
      // situations with code that does things like:
      //   # this creates an Unknown("call-bind")
      //   var callBind = require("call-bind")
      //   # this would create a Namespace("call-bind") and an Unknown("callBound")
      //   # underneath it
      //   var callBound = require("call-bind/callBound")
      //
      //   # This would then explode in our proxy apply because it will think we're
      //   # trying to call a namespace
      //   callBind()
      return ns.get(parts.slice(i, parts.length).join("."))
    }
    if (next.kind != "Namespace") {
      throw Error("Non-namespace sub-namespace?")
    }
    ns = next
  }
  // XXX: Is there a way to know that the last component is
  // a namespace or something else? For 'normal' code i've
  // seen
  //    require("fs/promises")
  // in which case "promises" should be a namespace. But in
  // the require_caching_bug test program, we do
  //    require("./html/index")
  // and that gives us back a method, and then we explode
  // in proxy_specs when we find ourselves calling a function with
  // a non-module spec. ugh. For now I'm keeping the existing
  // functionality and letting this be an Unknown if we don't
  // know about this path.
  return ns.get(parts[i])
}
