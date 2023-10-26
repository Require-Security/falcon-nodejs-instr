// Copyright 2023, Require Security Inc, All Rights Reserved
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path, { dirname, join } from "path";
import { Options } from "./args";
import { getParentDirectory, writeToFile } from "./misc";
import { TraceGranularities } from "../types/types";
import { defaultConfigName } from "./constants";
import { CommandModeType } from "../types/types";

export type AgentConfig = {
  mode: CommandModeType

  eventFile: string
  privsFile: string
  shadowStack: boolean
  eventThreshold: number
  proxySpecsDir: string
  blockSensitivity: number
  traceUnknownBuiltins: boolean
  logDuplicateEvents: boolean
  configPath: string
  traceGranularity: TraceGranularities
  dashboardPort: number
}

export function findConfigFile() {
  var dir: string | null = process.cwd()
  do {
    const files = readdirSync(dir)
    for (const file of files) {
      if(path.basename(file) == "config.reqsec") {
        return file
      }
    }
  } while (dir = getParentDirectory(dir))

  return null
}

export function loadFromConfigFile(targetCmd: string[]) {
  const config_loc = process.env.REQSEC_AGENT_CONFIG
                     ? process.env.REQSEC_AGENT_CONFIG
                     : path.join(__dirname, "../../config.reqsec")
  return parseConfigFile(config_loc, targetCmd[0])
}

function parseField(type: string | undefined, rawValue: string, targetCmd: string) {
  const targetDir = path.dirname(targetCmd)
  const runtimeDir = process.cwd()
  if(rawValue.toLowerCase().trim() == "null") {
    return null
  }

  switch(type?.toLowerCase().trim()) {
    case 'boolean':
      if(rawValue.toLowerCase() === 'true') {
        return true
      }

      if(rawValue.toLowerCase() === 'false') {
        return false
      }

      throw Error(`Found 'boolean' with value ${rawValue}`)
    case 'number':
      const n = Number(rawValue)
      if(Number.isNaN(n)) {
        throw Error(`Found 'number' with value ${rawValue}`)
      }
      return n
    case 'string':
      const out = rawValue
                  .replace("$TARGET_DIR", targetDir)
                  .replace("$TARGET_PATH", targetCmd)
                  .replace("$RUNTIME_DIR", runtimeDir)
                  .replace("$TIMESTAMP", `${Date.now()}`)
      if(out.includes("$")) {
        throw Error(`Unknown magic name in ${out}`)
      }
      return out
    default:
      throw Error(`Unsupported arg type ${type}`)
  }
}

function getDefaultValue(type: string | undefined) {
  switch(type) {
    case 'boolean':
      return false
    case 'number':
      return 0
    case 'string':
      return ''
    default:
      throw Error(`Unsupported arg type ${type}`)
  }
}

/** Initialize a config from a record
 *
 * @param uninitialized Record to initialize from
 * @param targetPath Path to the target program
 */
export function initializeConfig(uninitialized: Partial<AgentConfig>,
                                 configPath: string,
                                 targetPath: string): AgentConfig {
  const m = new Map()
  for (const [name, value] of Object.entries(uninitialized)) {
    m.set(name, value)
  }

  return _initializeConfig(m, configPath, targetPath)
}

function _initializeConfig(uninitialized: Map<string, string>, configPath: string, targetPath: string): AgentConfig {
// Now loop over all our defined options. If we have a setting
  // in the config file, use that. Otherwise use default. If there are
  // any leftover options, (or we fail to find a mandatory option)
  // then something is wrong, so we throw
  const config: any = Object.create(null)
  for (const [name, [flag, spec]] of Object.entries(Options)) {
    const rawConfigValue = uninitialized.get(name)
    if(rawConfigValue != undefined) {
      config[name] = parseField(spec.type, rawConfigValue, targetPath)
      uninitialized.delete(name)
    } else if (spec.demandOption) {
      throw Error(`Unspecified config value '${name}' is required`)
    } else if (spec.hasOwnProperty('default')) {
      config[name] = spec.default
    } else {
      config[name] = getDefaultValue(spec.type)
    }
  }

  // Mode isn't in the Options list, so we handle it seperately
  const mode = uninitialized.get('mode')
  uninitialized.delete('mode')
  if(mode != 'learn' && mode != 'enforce') {
    if(mode == undefined) {
      throw Error(`Unspecified config value 'mode' is required`)
    }
    throw Error(`Invalid mode: '${mode}'`)
  }
  config.mode = mode

  // And log config file path (this will end up in start message)
  config.configPath = configPath
  uninitialized.delete('configPath')

  if(uninitialized.size > 0) {
    throw Error(`Unconsumed config option(s) '${[...uninitialized.keys()].join(", ")}'`)
  }

  return config
}

function parseConfigFile(path: string, targetPath: string): AgentConfig {
  // First loop over the config file and get all the names with
  // unparsed values
  const unparsed: Map<string, string> = new Map()
  var lines = readFileSync(path, {encoding: "utf-8"}).split("\n")
  for (let line of lines) {
    line = line.trim()
    // Ignore blank lines
    if(!line) {
      continue
    }

    // Ignore comments
    if(line.startsWith("#")) {
      continue
    }

    // We only split on the first `:`, so we don't cause problems
    // with kafka ports etc...
    const [name, ...values] = line.split(":")
    unparsed.set(name.trim(), values.join(":").trim())
  }

  return _initializeConfig(unparsed, path, targetPath)
}

function generateWorkerConfigFile(config: Partial<AgentConfig>) {
  const configKeys = new Set(Object.keys(Options))
  configKeys.add("mode")

  return Object.entries(config)
    .filter(elt => configKeys.has(elt[0]))
    .map(elt => `${elt[0]}:${elt[1]}`)
    .join("\n")
}
