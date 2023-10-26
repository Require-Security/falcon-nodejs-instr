// Copyright 2023, Require Security Inc, All Rights Reserved
import { appendFileSync, writeFileSync } from "fs"
import { dirname } from "path"

export function toArray<T>(xs: ArrayLike<T>): T[] {
  // Args can be any arraylike, and we want to be able to treat it like an array
  if(Array.isArray(xs)) {
    return xs
  }

  var out = []
  for (var i = 0; i < xs.length; i++) {
    out.push(xs[i])
  }
  return out
}

export function map<T, U>(xs: ArrayLike<T>, func: (elt: T, n: number) => U): U[] {
  var out = []
  for(var i = 0; i < xs.length; i++) {
    out.push(func(xs[i], i))
  }
  return out
}

// See https://fettblog.eu/typescript-hasownproperty/
export function has<X extends {}, Y extends PropertyKey>
                   (obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return prop in obj
}

// Give it a constructor, and it will use that when getting uninitialized
// fields
export class DefaultDict<K, V> extends Map<K, V> {
  defaultConstructor: new () => V;

  constructor(defaultConstructor: new () => V, ...args: ConstructorParameters<typeof Map<K, V>>) {
    super(...args)
    this.defaultConstructor = defaultConstructor
  }

  get(key: K): V {
    var out = super.get(key)
    if(!out) {
      out = new this.defaultConstructor()
      super.set(key, out)
    }
    return out
  }
}

export class WeakDefaultDict<K extends object, V> extends WeakMap<K, V> {
  defaultConstructor: new () => V;

  constructor(defaultConstructor: new () => V, ...args: ConstructorParameters<typeof Map<K, V>>) {
    // @ts-ignore: Object is possibly 'null'.
    super(...args);
    this.defaultConstructor = defaultConstructor
  }

  get(key: K): V {
    var out = super.get(key)
    if(!out) {
      out = new this.defaultConstructor()
      super.set(key, out)
    }
    return out
  }
}

export function getParentDirectory(dir: string) {
  const parentDir = dirname(dir);

  // If we've hit root, dirname(dir) == dir, so stop
  return parentDir === dir ? null : parentDir;
}

/**
 * Calculate the number of minutes between two dates, rounding down.
 *
 * @param newer The newer date
 * @param older The older data
 * @returns The number of minutes between the two dates
 */
export function getSecsBetween(newer: Date, older: Date) {
  const timeDifferenceMs = newer.getTime() - older.getTime()
  const secsDifference =  Math.floor((timeDifferenceMs/1000))
  return secsDifference
}

/** Will JS explode if we try to proxy this?
 */
export function proxiable(obj: unknown) : obj is object {
  if (obj === null || obj === undefined) {
    return false
  }

  if (typeof obj != 'object' && typeof obj != 'function') {
    return false
  }

  return true
}

const NATIVE_MODULES = new Set(Object.keys(process.binding('natives')))
export function isBuiltin(module: string) {
  return NATIVE_MODULES.has(module)
}

export function writeToFile(msg: string) {
  appendFileSync("/tmp/log", msg + "\n")
}
