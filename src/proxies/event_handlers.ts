import { getCallStack } from "../shadow_stacks"
import { lookupProxy } from "../global_state"
import { DefaultDict, WeakDefaultDict } from "../utils/misc"
import events = require("events")
import { State } from "../global_state"
import { logString } from "../loggers"
const EventEmitter = events.EventEmitter

// Original handler to all of its various wrappers
const wrappersToOriginals: WeakMap<Function, Function> = new WeakMap()

/** Metadata for an event handler
 *
 * This is a bit awkward, but as far as I can tell, it's the only way to avoid
 * breaking removeListener:
 *
 * longjohn (https://github.com/mattinsler/longjohn) sets each event's
 * `.listener` field. In the naive case, this allows removeListener to Just
 * Work, but it means that it breaks when using two different libraries that do
 * that kind of thing. Since we are aiming for maximum compatibility, we don't
 * want to do that approach.
 *
 * Instead, we carefully keep track of a mapping of events -> wrappers. We need
 * to do it per-event-name because removeListeners works on a per-event-name
 */
class EventHandlerMetadata {
  // Event name -> {original function: wrappers[]}
  m: DefaultDict<string, DefaultDict<Function, Function[]> | undefined>

  constructor() {
    this.m = new DefaultDict(DefaultDict.bind(null, Array))
  }

  registerWrapper(eventName: string,
                  wrapper: Function,
                  callback: Function,
                  prepend: boolean = false) {
    wrappersToOriginals.set(wrapper, callback)
    const wrappers = this.m.get(eventName)!.get(callback)
    if(prepend) {
      wrappers!.unshift(wrapper)
    } else {
      wrappers!.push(wrapper)
    }
  }

  getWrappers(eventName: string, callback: Function) {
    return this.m.get(eventName)!.get(callback)
  }
}
const originalsInfo: WeakMap<object, EventHandlerMetadata> = new WeakDefaultDict(EventHandlerMetadata)


// Do this via proxy instead of via wrapper so we'll play nicely with
// other libraries that might stick .listener (or something) on
// proxies
function wrapCallback(callback: Function & {listener?: Function}) : Function {
  // EventEmitter.once will wrap the original, and then wrap the 'once' wrapper
  // We don't want to double-wrap (since it will mess up our stack traces) and
  // also makes cancelling a lot harder, so we unwrap if there's a wrapped
  // listener
  const originalListener = wrappersToOriginals.get(callback.listener!)
  if (originalListener) {
    callback.listener = originalListener
  }

  // XXX: If we have perf problems because we're thrashing memory, try
  // just saving a minimal parsed version here?
  const e = Error()
  const handler = {
    apply(target: Function, self: unknown, args: unknown[]) {
      getCallStack().unshift(e)
      try {
        return Reflect.apply(target, self, args)
      } finally {
        getCallStack().shift()
      }
    }
  }

  // We want a new proxy each time we do this since the stack traces
  // will be different
  return new Proxy(callback, handler)
}

function getOriginalCallback(wrapper: Function) {
  const callback = wrappersToOriginals.get(wrapper)
  return callback ? callback : wrapper
}

function setTimeoutishProxy<T extends (...args: any) => any>(func: T): T  {
  const handler = {
    apply(target: Function, self: unknown, rawArgs: any[]) {
      const args: any[] = [...rawArgs]
      args[0] = wrapCallback(args[0])
      return Reflect.apply(target, self, args)
    }
  }
  return lookupProxy(func, handler) as T
}

function addListenerProxy<T extends (...args: any) => any>(func: T, prepend: boolean = false): T {
  const handler = {
    apply(target: Function, self: object, rawArgs: any[]) {
      const args = [...rawArgs]
      const eventName = args[0]
      const callback = args[1]
      const wrapper = wrapCallback(args[1])
      const md = originalsInfo.get(self)
      if (md) {
        md.registerWrapper(eventName, wrapper, callback, prepend)
      } else {
        logString("ERROR", `md undefined: ${eventName} ${wrapper} ${prepend}`)
      }

      args[1] = wrapper
      return Reflect.apply(target, self, args)
    }
  }

  return lookupProxy(func, handler) as T
}

function listenersProxy<T extends Function>(func: T): T {
  const handler = {
    apply(target: Function, self: unknown, args: unknown[]) {
      const ret = Reflect.apply(target, self, args)
      return ret.map(getOriginalCallback)
    }
  }

  return lookupProxy(func, handler) as T
}
const __rawListeners = EventEmitter.prototype.rawListeners
/** Remove a listener
 *
 * This is quite delicate. longjohn (https://github.com/mattinsler/longjohn),
 * which does similar things, uses `.listener`. However this will *not* play well
 * with other libraries (or indeed, two instances of itself).
 *
 * Instead, we take the passed-in callback, look up the most-recently-added
 * wrapper (sans prepend which sticks the callback at the front of the queue)
 * and remove that one
 * @param func
 */
function removeListenerProxy<T extends Function>(func: T): T {
  const handler = {
    apply(target: Function, self: object, args: [string, Function]) {
      if(!["string", "symbol"].includes(typeof args[0]) || typeof args[1] != "function" || args.length != 2) {
        throw Error(`Different args than expected: ${args}`)
      }

      const [eventName, callback] = args
      const md = originalsInfo.get(self)

      // So this is a pain. We have a list of all wrappers for the callback, and
      // the wrappers *are* in order, but any given wrapper may no longer be
      // active -- if the wrapper was a 'once' and has already activated, it
      // will be gone now, and it's possible there are more esoteric ways to
      // remove a wrapper that I'm not aware of. Thus, we iterate through the
      // wrappers (back to front) looking for one that is still active If we
      // find one, we remove it. If not, we just try to remove the callback,
      // since it might be possible for an unwrapped event to sneak into the
      // queue somehow
      const wrappers = md!.getWrappers(eventName, callback)
      const livingWrappers = new Set(__rawListeners.call(self, eventName))

      while (wrappers!.length > 0) {
        const wrapper = wrappers!.pop()
        if (livingWrappers.has(wrapper)) {
          return Reflect.apply(target, self, [eventName, wrapper])
        }
      }

      return Reflect.apply(target, self, [eventName, callback])
    }
  }

  return lookupProxy(func, handler) as T
}

function removeAllListenersProxy<T extends Function>(func: T): T {
  const handler = {
    apply(target: Function, self: object, args: string[] | undefined) {
      const md = originalsInfo.get(self)

      if (!args) {
        md!.m.clear()
      } else {
        const [eventName] = args
        md!.m.get(eventName)!.clear()
      }

      return Reflect.apply(target, self, args!)
    }
  }

  return lookupProxy(func, handler) as T
}

// Also used for object constructed by eventEmitter itself
function eventEmitterObjectProxy<T extends object>(obj: T): T {
  const handler = {
    get(target: object, property: PropertyKey, reciever?: unknown) {
      const out = Reflect.get(target, property, reciever)
      switch (out) {
        case EventEmitter.prototype.on:
        case EventEmitter.prototype.once:
        case EventEmitter.prototype.addListener:
          return addListenerProxy(out)
        case EventEmitter.prototype.prependListener:
        case EventEmitter.prototype.prependOnceListener:
          return addListenerProxy(out, true)
        case EventEmitter.prototype.listeners:
        case EventEmitter.prototype.rawListeners:
          return listenersProxy(out)
        case EventEmitter.prototype.off:
        case EventEmitter.prototype.removeListener:
          return removeListenerProxy(out)
        case EventEmitter.prototype.removeAllListeners:
          return removeAllListenersProxy(out)
        case EventEmitter:
          return eventEmitterProxy()
        case EventEmitter.prototype:
          return eventEmitterObjectProxy(out)
        default:
          return out
      }
    }
  }

  return lookupProxy(obj, handler) as T
}

export function eventEmitterProxy(): typeof EventEmitter {
  const handler = {
    get(target: typeof EventEmitter, property: PropertyKey, reciever?: unknown) {
      const out = Reflect.get(target, property, reciever)
      switch(out) {
        case EventEmitter.prototype:
          return eventEmitterObjectProxy(out)
        // yeah, there is a circular reference in EventEmitter
        case EventEmitter:
          return eventEmitterProxy()
        default:
          return out
      }
    },
    construct(target: typeof EventEmitter, args: ArrayLike<unknown>, newTarget?: any) {
      const out = Reflect.construct(target, args, newTarget)
      return eventEmitterObjectProxy(out)
    }
  }

  if (State().usingShadowStack) {
    return lookupProxy(EventEmitter, handler)
  } else {
    return EventEmitter // XXX: normal-proxy this?
  }
}

export function setupSetTimeoutProxies() {
  if (State().usingShadowStack) {
    global.setTimeout = setTimeoutishProxy(global.setTimeout)
    global.setImmediate = setTimeoutishProxy(global.setImmediate)
    global.setInterval = setTimeoutishProxy(global.setInterval)
    global.queueMicrotask = setTimeoutishProxy(global.queueMicrotask)
    //process.nextTick = setTimeoutishProxy(process.nextTick)
  }
}

// Handle NodeEventEmitter and Stream? (check if stream Just Works)
