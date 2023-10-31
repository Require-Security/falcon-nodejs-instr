// Copyright 2023, Require Security Inc, All Rights Reserved
import path from "path"
import { State, makeGlobalState } from "../global_state"
import { initAccessOutcomes } from "../privilege_mode"
import { setupSetTimeoutProxies } from "../proxies/event_handlers"
import { logModuleLoad, setupLoaderProxy } from "../proxies/loader_proxy"
import { sendStartMessage } from "../start_message"
import { AgentConfig } from "./config"
import { register } from "module"
import { pathToFileURL } from "url"
import { MessageChannel } from "worker_threads";
import assert from "assert";

const matchES6Entry = /\s*at file:\/\/(\/[^:]+):\d+:\d+/
const matchPreload = /s*at Module\._preloadModules/
function logEntryFile() {
  if(require.main) {
    logModuleLoad(require.main.filename, undefined, true)
    return
  }

  const stack = Error().stack!.split("\n")
  // We've been preloaded -- we don't need to log anything
  if (stack.some(line => matchPreload.test(line))) {
    return
  }

  // We're probably from an es6 module?
  let entry = stack.at(-1)
  assert(entry, "Should have a stack???")
  const m = entry.match(matchES6Entry)
  console.log(entry)
  assert(m, "Regex failed to match?")
  entry = m[1]
  logModuleLoad(entry, undefined, true)
}

export function initializeAgent(config: AgentConfig, fromRequire: boolean, targetCmd: string[]) {
  // Already initialized
  if(State() != null) {
    return
  }

  Error.stackTraceLimit = Infinity;
  const target = path.resolve(process.cwd(), targetCmd[0])


  // record the command and set up other state for outcome calculation for access events
  initAccessOutcomes(config.mode)

  makeGlobalState(config, fromRequire, target)

  setupLoaderProxy()

  setupSetTimeoutProxies()

  // create start message
  sendStartMessage(config);

  logEntryFile()

  if(register !== undefined) {
    const { port1, port2 } = new MessageChannel();

    register("./../import_loader.mjs", {
      parentURL: pathToFileURL(__filename),
      data: { number: 1, port: port2 },
      transferList: [port2],
    });

    function handleMessage(args: string[]) {
      const [cmd, ...rest] = args
      switch(cmd) {
        case "logModuleLoad":
          const [request, parent] = rest
          logModuleLoad(request, parent, false)
          return
      }
    }

    port1.on("message", handleMessage)

    // Don't keep the process alive waiting for these
    port1.unref()
    port2.unref()
  }
}