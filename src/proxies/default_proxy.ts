// Copyright 2023, Require Security Inc, All Rights Reserved
import {
  getFunctionSpec,
  getOriginalObject, isProxy, lookupProxy, registerFunctionSpec, State
} from "../global_state"
import {
  Spec, Method, Unknown, Namespace, OverloadedMethod
} from "../proxy_specs/proxy_specs"
import { noteAccess } from "../privilege_data"
import { DO_NOT_PROXY_PROPERTIES, DO_NOT_PROXY_OBJECTS } from "../utils/constants"
import { getUnproxyProxy } from "./unproxy_proxy"
import { proxiable } from "../utils/misc"

function doGetNotMethod(proxySpec: Namespace | Unknown,
                        overwrittenProperties: Set<PropertyKey>,
                       ) {
  return function(target: object, property: PropertyKey, receiver?: unknown) {
    // Unwrap the target and receiver to avoid compatiblity issues.
    target = getOriginalObject(target)
    receiver = getOriginalObject(receiver)
    const out = Reflect.get(target, property, receiver) as any

    // Don't proxy a non-proxy or non-proxiable value
    if(!proxiable(out)
       || DO_NOT_PROXY_PROPERTIES.has(property)
       || DO_NOT_PROXY_OBJECTS.has(out)) {
      return out
    }

    // Don't proxy a property that has been overwritten
    if(overwrittenProperties.has(property)) { return out }

    // Do not proxy frozen properties
    const desc = Object.getOwnPropertyDescriptor(target, property)
    if (desc && !(desc.writable || desc.configurable)) {
      return out
    }

    var spec = proxySpec.get(property)

    if (!spec) {
      if (typeof out == "function") {
        return getUnproxyProxy(out)
      } else {
        return out
      }
    }

    if(spec.kind == "Unknown" || spec.level >= State().eventThreshold) {
      // XXX: should be receiver, maybe?
      if(spec.kind == "Method" || spec.kind == "OverloadedMethod") {
        registerFunctionSpec(out, target, spec)
      }
      return getDefaultProxy({ obj: out, proxySpec: spec })
    }

    if (typeof out == "function") {
      return getUnproxyProxy(out)
    }

    return out
  }
}

function doSet(overwrittenProperties: Set<PropertyKey>) {
  return function(target: object, property: PropertyKey, newValue: any, receiver?: unknown) {
    // If they're setting this to be a should-be-proxied property, the copy they have
    // will be proxied, so we won't need to re-proxy it
    overwrittenProperties.add(property)
    // Only unwrap the target and receiver. We don't want to unwrap newValue because
    // that can create security holes:
    //   fs.foo = fs.open
    //   fs.foo()
    // And we don't want to unwrap the property because that's just a string which
    // cannot be proxied.
    target = getOriginalObject(target)
    receiver = getOriginalObject(receiver)
    return Reflect.set(target, property, newValue, receiver)
  }
}

function doDefineProperty(overwrittenProperties: Set<PropertyKey>) {
  return function(base: object, property: PropertyKey, descriptor: PropertyDescriptor & ThisType<any>) {
    overwrittenProperties.add(property)
    return Reflect.defineProperty(base, property, descriptor)
  }
}

function doConstruct(proxySpec: Spec) {
  return function(target: object, args: unknown[], newTarget?: Function) {
    // XXX: We shouldn't need these checks but removing them makes typescript
    // hard. Leaving as-is for now, we can revisit later if we construct to
    // be speedy gonzales.
    if (typeof target != "function") {
      throw Error("Calling a non-function???")
    }
    if (isProxy(target)) {
      throw Error("Target of construct() should not be proxied???")
    }

    // Unwrap the call but not the arguments. If you pass a proxied value as an argument,
    // it needs to stay proxied or else that's a security hole, e.g.
    //    const f = fs.open
    //    E = new Error(f)
    //    E.msg()
    newTarget = getOriginalObject(newTarget)

    noteAccess(proxySpec, args)
    const out = Reflect.construct(target, args, newTarget)
    return getDefaultProxy({obj: out, proxySpec: proxySpec})
  }
}

function doApply(proxySpec: Method | OverloadedMethod) {
  return function apply(target: object, proxiedSelf: unknown, args: ArrayLike<unknown>) {
    // Unwrap self to avoid issues with native calls expecting a native
    // object as `this`. We don't want to unwrap the arguments as
    // that could open a security hole.
    let self = getOriginalObject(proxiedSelf)
    let spec = proxySpec
    const overrideSpec = getFunctionSpec(target, self)
    if(overrideSpec && overrideSpec.kind != "Unknown") {
      spec = overrideSpec
    }

    if (spec.kind == "OverloadedMethod") {
      spec = spec.getSpec(args)
    }

    if (spec.proxyArgs != null) {
      args = spec.proxyArgs(args)
    }

    noteAccess(spec, args)
    let result = Reflect.apply(target as Function, self, args)

    if(spec.proxyReturn != null) {
      result = spec.proxyReturn(result)
    }

    // It's very common for js api calls to return `this` and not document that,
    // so worth checking
    if (result === self) {
      result = proxiedSelf
    }

    return result
  }
}

function doApplyUnknown(proxySpec: Unknown) {
  return function(target: object, self: unknown, args: ArrayLike<unknown>) {
    if (typeof target != "function") {
      throw Error("Calling a non-function???")
    }
    if (isProxy(target)) {
      throw Error("Target of apply() should not be proxied???")
    }

    // Unwrap self. We don't want to unwrap the arguments as
    // that could open a security hole
    self = getOriginalObject(self)

    noteAccess(proxySpec, args)
    return Reflect.apply(target, self, args)
  }
}

function proxyExoticUnknown<T extends object>(obj: T, proxySpec: Spec ): T {
  for (const key in obj) {
    const value = obj[key]
    if(!proxiable(value)) {
      continue
    }
    const spec = new Unknown(`${proxySpec.name}.${key}`)
    const proxy = getDefaultProxy({obj: value, proxySpec: spec})
    registerFunctionSpec(value, obj, spec)
    obj[key] = proxy
  }

  return obj
}

// If we try to proxy non-base object objects, it leads to nothing
// but pain and suffering. Instead, we monkey-patch
function proxyExoticObject<T extends object>(obj: T, proxySpec: Spec ): T {
  // XXX: maybe deal with this?
  if(proxySpec.kind == "Unknown") {
    return proxyExoticUnknown(obj, proxySpec)
  }

  // XXX: This
  if(proxySpec.kind != "Namespace") {
    return obj
  }

  let toProxy: Spec[] = []

  for (const spec of proxySpec.getAllSpecs()) {
    if (spec.level >= State().eventThreshold) {
      // If we're proxying an object, it's already been constructed
      if(spec.name.endsWith("constructor")) {
        continue
      }
      toProxy.push(spec)
    }
  }

  for (const spec of toProxy) {
    const name = spec.name.split(".").at(-1) as string
    // @ts-ignore
    const value = obj[name]
    const proxy = getDefaultProxy({obj: value, proxySpec: spec})
    // @ts-ignore
    obj[name] = proxy

    if (spec.kind == "Method" || spec.kind == "OverloadedMethod") {
      registerFunctionSpec(value, obj, spec)
    }
  }

  return obj
}

// Based on the kind of spec we're given this builds the correct Proxy
// object
// XXX: handle get/set prototype?
export function getDefaultProxy<T extends object>({ obj, proxySpec }: { obj: T; proxySpec: Spec }): T {
  if (obj && typeof obj != "function" && obj.constructor != Object) {
    return proxyExoticObject(obj, proxySpec)
  }
  const overwrittenProperties: Set<PropertyKey> = new Set()
  switch(proxySpec.kind) {
    case "Method":
    case "OverloadedMethod": {
      let handler: ProxyHandler<T> =  {
        // We don't do gets with method
        set: doSet(overwrittenProperties),
        defineProperty: doDefineProperty(overwrittenProperties),
        construct: doConstruct(proxySpec),
        apply: doApply(proxySpec)
      }
      return lookupProxy(obj, handler)
    }
    case "Unknown": {
      if (!State().traceUnknownBuiltins) {
        // XXX: Improve this error message
        throw Error(`Shouldn't have unknowns: ${JSON.stringify(proxySpec)}`)
      }

      const handler: ProxyHandler<T> =  {
        get: doGetNotMethod(proxySpec, overwrittenProperties),
        set: doSet(overwrittenProperties),
        defineProperty: doDefineProperty(overwrittenProperties),
        construct: doConstruct(proxySpec),
        apply: doApplyUnknown(proxySpec),
      }
      return lookupProxy(obj, handler)
    }
    case "Namespace": {
      const handler: ProxyHandler<T> =  {
        // No apply for Namespace/Classes
        get: doGetNotMethod(proxySpec, overwrittenProperties),
        set: doSet(overwrittenProperties),
        defineProperty: doDefineProperty(overwrittenProperties),
        construct: doConstruct(proxySpec)
      }
      return lookupProxy(obj, handler)
    }
    case "Field": {
      // XXX: proxy something here?
      return obj
    }
  }
}
