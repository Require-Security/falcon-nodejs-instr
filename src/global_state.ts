// Copyright 2023, Require Security Inc, All Rights Reserved
import crypto = require('crypto')
import fs = require("fs")
import path = require('path')
import { Appender, EventLogger, FileAppender, SocketIOAppender } from './loggers'
import { addPrivilegeFileLogger, AnalysisResults } from './privilege_data'
import { Method, OverloadedMethod, Spec, Unknown, loadProxySpecs } from './proxy_specs/proxy_specs'
import { initShadowStacks } from './shadow_stacks'
import { CommandModeType, ProxyTy, SerializedRecord, TraceGranularities } from "./types/types"
import { AgentConfig } from './utils/config'


var state: AgentState

export function makeGlobalState(config: AgentConfig, fromRequire: boolean, target: string) {
  state = new AgentState(config, fromRequire, target)
  state.init()
}

export function State(): AgentState {
  return state
}

export function loggingEvents() {
  return !!state.eventLogger
}

export class AgentState {
  mode: CommandModeType
  target: string
  eventThreshold: number
  blockSensitivity: number
  privilegeResults: AnalysisResults
  usingShadowStack: boolean
  agentOnlyArgv: string[]
  appPwd: string
  logDuplicateEvents: boolean
  traceUnknownBuiltins: boolean
  eventLogger: EventLogger | undefined
  config: AgentConfig
  traceGranularity: TraceGranularities
  fromRequire: boolean
  dashboardPort: number

  constructor(config: AgentConfig, fromRequire: boolean, target: string) {
    this.config = config
    this.mode = config.mode
    this.fromRequire = fromRequire
    this.traceUnknownBuiltins = !!config.traceUnknownBuiltins
    this.dashboardPort = config.dashboardPort
    this.usingShadowStack = config.shadowStack
    this.logDuplicateEvents = config.logDuplicateEvents
    this.eventThreshold = config.eventThreshold
    this.blockSensitivity = config.blockSensitivity
    this.appPwd = path.dirname(target)
    this.target = target
    this.traceGranularity = config.traceGranularity
  }

  // Split this out of the constructor so that these methods
  // can use the global state values
  init() {
    const config = this.config
    if (this.mode == "learn") {
      if (config.privsFile) {
        addPrivilegeFileLogger(config.privsFile)
      }
      this.privilegeResults = new AnalysisResults()
    } else if (this.mode == "enforce") {
      if (!config.privsFile) {
        throw Error("Must specify a privilege file for enforcement");
      }

      this.privilegeResults = parseEnforcementFile(config.privsFile)
    } else {
      throw Error(`Invalid mode ${this.mode}`)
    }

    if (config.proxySpecsDir) {
      loadProxySpecs(config.proxySpecsDir)
    } else {
      loadProxySpecs(path.join(__dirname, "../node-apis"))
    }

    // set up the logging of privs and events, separate appenders for
    // each type of logging
    const eventAppenders: Appender[] = [];

    // log events to file
    if (config.eventFile) {
      eventAppenders.push(new FileAppender(config.eventFile));
    }

    // Log events to the web UI
    if (config.dashboardPort) {
      eventAppenders.push(new SocketIOAppender(config.dashboardPort))
    }

    // set up event appenders, if they were specified
    if (eventAppenders.length > 0) {
      this.eventLogger = new EventLogger(eventAppenders)
    }

    if (config.eventThreshold > config.blockSensitivity) {
      throw Error("You can't have eventThreshold > blockThreshold")
    }

    if(this.usingShadowStack) {
      initShadowStacks()
    }
  }
}


export const UUID = crypto.randomUUID()

export function symbolizeTrace(stackTrace: string[]) {
  return Symbol.for(stackTrace.join("\n"))
}

function parseEnforcementFile(filename: string) : AnalysisResults {
  const txt = fs.readFileSync(filename, {encoding: 'utf-8'})
  const json: SerializedRecord = JSON.parse(txt)

  const out: Map<string, Set<symbol>> = new Map()
  for (const [eventName, stacks] of Object.entries(json)) {
    out.set(eventName, new Set(stacks.map(symbolizeTrace)))
  }

  return new AnalysisResults(out)
}

// Original object -> Proxy
const proxyRegistry: WeakMap<object, ProxyTy> = new WeakMap()
const proxyToObjMap: WeakMap<ProxyTy, object> = new WeakMap()
const allProxies: WeakSet<ProxyTy> = new WeakSet()
const functionSpecs: WeakMap<object, WeakMap<object, Method | OverloadedMethod | Unknown>> = new WeakMap()

export function registerFunctionSpec(obj: object | undefined,
                                     parent: object | undefined,
                                     spec: Method | OverloadedMethod | Unknown) {
  if(!obj || !parent) {
    return
  }

  const specs = functionSpecs.get(obj)
  if(!specs) {
    functionSpecs.set(obj, new WeakMap([[parent, spec]]))
    return
  }

  specs.set(parent, spec)
}

export function getFunctionSpec(obj: object, parent: unknown) {
  return functionSpecs.get(obj)?.get(parent)
}

export function lookupProxy<T extends object>(obj: T, handler: ProxyHandler<T>): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (allProxies.has(obj)) {
    return obj
  }

  if (!proxyRegistry.has(obj)) {
    const proxy = new Proxy(obj, handler)
    proxyRegistry.set(obj, proxy)
    proxyToObjMap.set(proxy, obj)
    allProxies.add(proxy)
  }
  return proxyRegistry.get(obj) as T
}

export function isProxy(obj: unknown) : obj is ProxyTy {
  if (obj === null || obj === undefined) {
    return false
  }
  return allProxies.has(obj)
}

export function getOriginalObject<T>(proxy: T): T {
  if (proxy === null || proxy === undefined) {
    return proxy
  }
  if (!allProxies.has(proxy)) {
    return proxy as T
  }
  return proxyToObjMap.get(proxy) as T
}
