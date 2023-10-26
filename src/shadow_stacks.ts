// Copyright 2023, Require Security Inc, All Rights Reserved
import { createHook, executionAsyncId } from "async_hooks"
import { State } from "./global_state"

// Each call stack is an array of stackTraces, each of which is an array of
// strings
const callStacks: Map<number, Error[]> = new Map()

export function initShadowStacks() {
  const id = executionAsyncId()
  callStacks.set(0, [])
  callStacks.set(1, [])
  callStacks.set(2, [])
  callStacks.set(id, [])

  const missingParents: Set<number> = new Set()

  function onThreadInit(id: number, {}, triggerId: number, {}) {
    // We don't find the parents for some things (WRITEWRAP) because they
    // are initialized long before we enter this code. If we're missing a parent
    // and then we later find it, something is horribly wrong
    if (missingParents.has(id)) {
      throw Error("Found missing parent. Parellelism nondeterminism?")
    }

    const parentStack = callStacks.get(triggerId)
    if(!parentStack) {
      callStacks.set(id, [])
      missingParents.add(id)
    } else {
      callStacks.set(id, [...parentStack])
    }
  }

  function onThreadDestory(id: number) {
    callStacks.delete(id)
  }

  const hook = createHook({init: onThreadInit, destroy: onThreadDestory})
  hook.enable()
}

export function getCallStack() {
  if(!State().usingShadowStack) {
    return []
  }

  const id = executionAsyncId()
  const stack = callStacks.get(id)
  if(!stack) { throw Error(`No stack for id ${id}`)}
  return stack
}
