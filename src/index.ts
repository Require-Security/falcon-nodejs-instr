// Copyright 2023, Require Security Inc, All Rights Reserved
import { isMainThread } from "worker_threads";
import { logModuleLoad } from "./proxies/loader_proxy";
import { AgentConfig, loadFromConfigFile } from "./utils/config";
import { initializeAgent } from "./utils/initialize_agent";
import { register } from "node:module"
import { pathToFileURL } from "url";
import assert from "assert";
import { MessageChannel } from "worker_threads";

const matchES6Entry = /\s*at file:\/\/(\/[^:]+):\d+:\d+/
exports.init = function(config: Partial<AgentConfig> = {}) {
  if(!isMainThread) {
    return
  }

  const targetCmd = process.argv.slice(1)

  const manualConfig = config
  config = loadFromConfigFile(targetCmd)
  if(manualConfig) {
    for (const [key, value] of Object.entries(manualConfig)) {
      //@ts-ignore
      config[key] = value
    }
  }

  initializeAgent(config as AgentConfig, true, targetCmd)
  if(require.main) {
    logModuleLoad(require.main.filename, "TOP_LEVEL", true)
  } else {
    // We were called from an es6 module, probably?
    const stack = Error().stack!.split("\n")
    let entry = stack.at(-1)
    assert(entry, "Should have a stack???")
    const m = entry.match(matchES6Entry)
    console.log(entry)
    assert(m, "Regex failed to match?")
    entry = m[1]
    logModuleLoad(entry, "TOP_LEVEL", true)
  }

  if(register !== undefined) {
    const { port1, port2 } = new MessageChannel();

    register("./import_loader.mjs", {
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
