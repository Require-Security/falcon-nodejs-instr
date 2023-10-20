import { isMainThread } from "worker_threads";
import { logModuleLoad } from "./proxies/loader_proxy";
import { AgentConfig, loadFromConfigFile } from "./utils/config";
import { initializeAgent } from "./utils/initialize_agent";

exports = module.exports = function(config: Partial<AgentConfig> = {}) {
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
    logModuleLoad(require.main.filename, null, true)
  }
}
