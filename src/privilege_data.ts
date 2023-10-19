import { symbolizeTrace,
         UUID,
         State,
         loggingEvents,
         AgentState
} from './global_state'
import os = require('os')
import path = require("path")
import { Appender, FileAppender, logEvent, logString }from "./loggers";
import { getStackTrace, simplifyStackTrace } from './utils/stack_trace';
import { StackTrace, SerializedRecord, AccessEventOutcome } from './types/types';
import { Spec } from './proxy_specs/proxy_specs';
import { getPrivilegeMode } from './privilege_mode'
import { getPackageForLoadedPath } from './proxies/loader_proxy'

interface SensitiveCall {
  timestamp: Date
  call: string
  stacktrace: StackTrace[]
  library_trace: LibraryTraceElement[]
  privilege_trace: string[]
  category: string
  sensitivity: number
  outcome: AccessEventOutcome
  metadata: {
    process: {
      pid: number
      uuid: string
      title: string
    },
    host: {
      hostname: string
    }
    user: {
      uid: string,
      username: string
    }
  }
}

function serializeArg(arg: unknown): string {
  // return arg as string
  if(arg == null) {
    return "JAVASCRIPT_NULL"
  }

  if(typeof arg == "function") {
    return "JAVASCRIPT_FUNCTION"
  }

  if(arg?.toString == undefined) {
    return "JAVASCRIPT_UNSERIALIZABLE_VALUE"
  }

  return arg.toString()
}

const staticMetadata = {
  process: {
    pid: process.pid,
    uuid: UUID,
    title: process.argv0,
  },
  host: {
    hostname: os.hostname(),
  },
  user: {
    uid: process.getuid !== undefined ? process.getuid().toString(): "null",
    username: os.userInfo().username
  }
}

export class AnalysisResults {
  data: Map<PropertyKey, Set<symbol>>

  constructor(loadData: Map<PropertyKey, Set<symbol>> | null = null) {
    if(loadData) {
      this.data = loadData
    } else {
      this.data = new Map()
    }
  }

  /**
   * Add a stack trace to the privilege store, but only if we haven't seen
   * the stack trace already for the given func.  Return true if it is a new
   * stack trace, false otherwise
   *
   * @param func the name of the sensitive function
   * @param libTrace the library trace of the sensitive function
   * @returns true if new and added, false otherwise
   */
  add(func: PropertyKey, libTrace: string[]): boolean {
    // created the canonicalized stack string, joined by newline
    const traceSymb = Symbol.for(libTrace.join("\n"))
    const fEntry = this.data.get(func)

    if (!fEntry) {
      this.data.set(func, new Set<symbol>().add(traceSymb));
      return true;
    }

    if (fEntry.has(traceSymb)) {
      return false;
    }

    fEntry.add(traceSymb);
    return true;
  }

  /**
   * Get the set of privilege traces associated with the function call
   * @param func The function call signature string
   * @returns the set of symbolized privilege traces
   */
  get(func: PropertyKey): Set<symbol> | undefined {
    return this.data.get(func)
  }

  toJSON(): SerializedRecord {
    const out: SerializedRecord = {}

    for (let [func, stacks] of this.data) {
      out[func.toString()] = [...stacks].map(st => Symbol.keyFor(st)!.split("\n"));
    }

    return out
  }
}

/**
 * Add appenders that log the privileges calculated during a program run.
 *
 * @param apps The appenders
 */
export function addPrivilegeFileLogger(filename: string) {
  const logger = new FileAppender(filename)
  function flushPrivs() {
    logger.clear()
    logger.write(State().privilegeResults, true);
  }

  process.on('SIGINT', () => process.exit())
  process.on('SIGTERM', () => process.exit())
  process.on('exit', flushPrivs.bind(this))
}

function logAccessEvent(spec: Spec,
  args: ArrayLike<unknown>,
  st: StackTrace[],
  libraryTrace: LibraryTraceElement[],
  privTrace: string[],
  outcome: AccessEventOutcome) {
    if(!loggingEvents()) {
      return
    }

    const call: SensitiveCall = {
      timestamp: new Date(),
      call: spec.name.toString(),
      stacktrace: st,
      library_trace: libraryTrace,
      privilege_trace: privTrace,
      outcome: outcome,
      category: spec.category,
      sensitivity: spec.level,
      metadata: staticMetadata
    }

    logEvent(call);
}

type TraceElementTypes = "package" | "file"

type LibraryTraceElement = {
  name: string;
  version?: string;
  type: TraceElementTypes;
}

/**
 * Given a stack element,  the element as either a node library, a builtin
 * library, or if a filename, try to get the package id.  If no package id,
 * return the relative file name.
 *
 * @param name the stack element name
 * @returns the normalized name
 */
export function toLibraryTraceElement(name: string): LibraryTraceElement {
  const packageID = getPackageForLoadedPath(name)

  if (packageID && State().traceGranularity == "library") {
    return { name: packageID.name, version: packageID.version, type: "package"}
  } else {
    const relPath = "./" + path.relative(State().appPwd, name)
    return {name: relPath, type: "file"}
  }
}

/**
 *
 * @param stackTrace
 * @returns
 */
function getLibTrace(stackTrace: StackTrace[]): LibraryTraceElement[] {
  let fullLibTrace = simplifyStackTrace(stackTrace).map(toLibraryTraceElement)
  // remove consecutive duplicates
  // libTrace = libTrace.filter((value, index) => value !== libTrace[index + 1]);

  // create a unique list (no duplicates) ordered by first appearance (of name)
  var seenLibs: Set<string> = new Set()
  var libTrace: LibraryTraceElement[] = []

  for (const element of fullLibTrace) {
    if (!seenLibs.has(element.name)) {
      libTrace.push(element);
      seenLibs.add(element.name);
    }
  }

  if (libTrace.length == 0) {
    libTrace = [{name: "<unknown>", type: "file"}]
  }

  return libTrace
}

/**
 * Convert the Library Trace to a privilege trace
 *
 * @param libTrace The array of library traces
 * @returns the extracted name from each library trace element
 */
function libraryTraceToPrivilege(libTrace: LibraryTraceElement[]): string[] {
  return libTrace.map((lt) => lt.name)
}

/**
 * Check if the call is allowed based on the presence of the privtrace in the
 * privileges.  Depending on the command mode, the privileges come from either
 * the enforcemenet file (in state) or the calculated privileges in the Analysis
 * Results (auto mode)
 *
 * @param spec The call information
 * @param privTrace the privilege trace (could be a list of libraries)
 * @param state The agent state, cached
 * @returns true if the access is allowed (found priv), false if violation
 */
function isAuthorizedAccess(spec: Spec, privTrace: string[]): boolean {
  // learned, now check if we are in auto or enforcing from file
  var entry = State().privilegeResults.get(spec.name)

  return (entry != undefined) && entry.has(symbolizeTrace(privTrace));
}

/**
 * Note that an access attempt has occurred, which might mean
 * saving privilege info, logging the event, and/or checking
 * fora violation of the priv spec.
 *
 * @param spec Info on the called function
 * @param args The arguments of the call
 *
 * @returns undefined. May throw on permission violation
 */
export function noteAccess(spec: Spec, args: ArrayLike<unknown>) {
  const state = State()
  const st = getStackTrace()
  // the library trace, which is an array of LibraryTraceElements used for reporting
  const libTrace = getLibTrace(st)
  // the privilege trace, which is an array of strings of the names of the library trace elements
  const privTrace = libraryTraceToPrivilege(libTrace)
  // the privilege learning / learned mode we are in
  const privilegeMode = getPrivilegeMode()

  // In learning mode, save the access to the analysis results
  if (privilegeMode == "training") {
    const newResult = state.privilegeResults.add(spec.name, privTrace);

    if (newResult || state.logDuplicateEvents) {
      logAccessEvent(spec, args, st, libTrace, privTrace, "train")
    }

    return
  }

  // check if the access is allowed in the privilege list
  if (isAuthorizedAccess(spec, privTrace)) {
    return
  }

  // if we get here, we have a violation!
  // calculate outcome based on the sensitivity level of the call compared to the block sens arg
  const outcome: AccessEventOutcome = spec.level < State().blockSensitivity ? "allow" : "block"

  // log the event!
  logAccessEvent(spec, args, st, libTrace, privTrace, outcome)

  // if we are allowing, then report and return
  if (outcome == "allow") {
    return
  }

  // Otherwise, throw!
  const msg = `Permissions Violation: ${spec.name.toString()} called from ${privTrace}`
  throw Error(msg);
}
