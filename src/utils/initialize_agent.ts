import path from "path"
import { State, makeGlobalState } from "../global_state"
import { initAccessOutcomes } from "../privilege_mode"
import { setupSetTimeoutProxies } from "../proxies/event_handlers"
import { setupLoaderProxy } from "../proxies/loader_proxy"
import { sendStartMessage } from "../start_message"
import { AgentConfig } from "./config"

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
}