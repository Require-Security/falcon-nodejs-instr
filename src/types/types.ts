// Copyright 2023, Require Security Inc, All Rights Reserved
export type SerializedRecord = Record<string, string[][]>
export type EnforcementRecord = ReadonlyMap<PropertyKey, Set<symbol>>
export type Name = string
export type ProxyTy = object
export type AnalysisResultsMap = Map<string, Map<Name, Set<string>>>

export type JSONValue =
    | string
    | number
    | boolean
    | { [x: string]: JSONValue }
    | Array<JSONValue>;

export namespace SpecJson {
  export type TopLevel = ModuleSpec
  export type ModuleSpec = {
    ignore? :boolean,
    name: string
    modules: ModuleSpec[],
    classes: ClassSpec[],
    methods: MethodSpec[]
  }

  export type ClassSpec = {
    name: string,
    parent: string | undefined,
    // XXX: Handle nested classes
    methods: MethodSpec[],
  }

  export type MethodSpec = {
    kind: string,
    level: number,
    name: string,
    signature: string
  }
}

export type StackTraceEntry = StaticEntry | DynamicEntry

export interface StaticEntry {
  is_eval: false,
  filename: string,
  line: number | null,
  col: number | null,
  function: string | null
}

export interface DynamicEntry {
  is_eval: true,
  loc: StackTraceEntry
  // These last two are useful for figuring out the namespace of the eval.
  // We don't just store 'namespace' because sometimes we'll want to namespace
  // at the file level, while other times we might do module level
  filename: string,
  suffix: string,
}

export type StackTrace = StackTraceEntry[]

/** valid values for outcome prop of access events */
export type AccessEventOutcome = "train" | "allow" | "block"

// the valid values for the outcome property of an event...might want to
// place this in a separate file that defines valid values for event props in the future
// but good to have here for testing
export type EventOutcome = AccessEventOutcome | "agent_error" |
  "builtinModuleLoad" | "moduleLoad" | "startApp" | "debug"

// possible modes for privileges, keep distinct from command types to prevent
// confusion
export type PrivilegeMode = "training" | "protection"

// possible modes to run the agent in
export type CommandModeType = "learn" | "enforce"

// Types for the dashboard. This... needs some fixing.
// There should not be three of these
export type DashboardMode = "block" | "allow" | "learn"

// Valid trace granularities
export type TraceGranularities = "library" | "file"
