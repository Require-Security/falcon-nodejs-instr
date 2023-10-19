import { createHook, executionAsyncId } from "async_hooks"
import { State } from "./global_state"

// Each call stack is an array of stackTraces, each of which is an array of
// strings
const callStacks: Map<number, Error[]> = new Map()

export function initShadowStacks() {
  // XXX: It's not clear from the documentation what the executionAsyncId()'s
  //      return value will be at initialization time.  According to basically
  //      every example of Workers that I have seen, this id will be initially
  //      1 for the main worker and 2 for the child workers.  So, we also check
  //      for when id is 2, but is this complete??
  const id = executionAsyncId()
  if(id != 0 && id != 1 && id != 2) {
    throw Error(`Initial ID should always be 0, 1, or 2, right??? Was ${id}`)
  }
  callStacks.set(0, [])
  callStacks.set(1, [])
  callStacks.set(2, [])

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
