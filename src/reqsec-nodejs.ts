import path from "path";
import { State, UUID } from "./global_state";
import { logAgentJson } from "./loggers";
import { parseCLI } from "./utils/args";
import { AgentConfig } from "./utils/config";
import { initializeAgent } from "./utils/initialize_agent";
/* IMPORTS DONE */

export function main({config, targetCmd}: {config: AgentConfig, targetCmd: string[]}) {
  initializeAgent(config, false, targetCmd)
  const target = State().target

  if (process.mainModule !== undefined) {
    // By default, process.mainModule will point to this script. We want it to
    // point to the target for two reasons: a.) this increases transparency --
    // if you access process.mainModule.filename, you should get the original
    // script. And b.) the module's filename is what is passed in to
    // Module._load's parent field. If we leave this as-is,
    // process.mainModule.require will register as "from instrumentation", and
    // thus we will return a nonproxied version of imported libraries
    //
    // There's also require.main which has the same problem. However, since
    // require.main and process.mainModule point to the same thing, fixing it on
    // one fixes it on the other as well
    process.mainModule.filename = target
    process.mainModule.path = path.dirname(target)

    // This one is a doozy. A module contains, as its children, all imported
    // modules. This means that, without this, someone could do
    // `process.mainModule.children[0].require` to get around our
    // instrumentation.
    //
    // This stops that, but doesn't actually stop someone from importing
    // our stuff and then using the require from there.
    // XXX: stop user code from importing our code or remove module.require after
    // using it or something
    process.mainModule.children = []
  }


  process.argv = [process.argv[0], ...targetCmd]
  try {
    require(target)
  } catch (e) {
    if (e.message.includes('[ERR_REQUIRE_ESM]')) {
      import(target)
    } else {
      // create an object to log the error, since we want to know
      // about errors
      const errorObj = {
        timestamp: new Date().toString(),
        process: {
          pid: process.pid,
          uuid: UUID
        },
        message: e.message,
        exception: e.name,
        stack: e.stack
      }

      // log the exception if a logger exists
      logAgentJson("ERROR", errorObj);

      // rethrow the error
      throw (e)
    }
  }
}


main(parseCLI());
