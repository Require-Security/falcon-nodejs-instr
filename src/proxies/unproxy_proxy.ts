// Copyright 2023, Require Security Inc, All Rights Reserved
import {
  getOriginalObject, lookupProxy
} from "../global_state"

/** Get a proxy which unproxies self in function calls
 *
 * This proxy will do nothing except getOriginalObject for things when called
 *
 * It's the unproxy proxy!
 *
 * We need this because we need to proxy objects which will explode if we pass
 * their proxied self into their methods. If we run with trace-unknown-builtins
 * turned on and proxy threshold = 0, this is fine -- all methods are proxied,
 * so their self arguments are correctly unproxied. However, if we're not
 * running with trace-unknown-builtins (or just not logging everything), then
 * anything without a proxy spec (or that's below the threshold for proxying) is
 * unproxied, and thus will not unwrap its self object, which can cause
 * explosions
 */
export function getUnproxyProxy<T extends object>(obj: T): T {
  const handler: ProxyHandler<T>  = {
    construct(target: object, args: unknown[], newTarget?: Function) {
      newTarget = getOriginalObject(newTarget)
      target = getOriginalObject(target)
      return Reflect.construct(target as Function, args, newTarget)
    },
    apply(target: object, self: unknown, args: ArrayLike<unknown>) {
      self = getOriginalObject(self)
      return Reflect.apply(target as Function, self, args)
    }
    // XXX: handle getOwnPropertyDescriptor?
  }

  // This could have problems if something is proxied one way and not another,
  // but no more problems than that already causes
  return lookupProxy(obj, handler)
}
