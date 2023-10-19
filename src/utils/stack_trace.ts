import { getCallStack } from "../shadow_stacks";
import { StackTraceEntry, StaticEntry, StackTrace, Name } from "../types/types"
import { instrumentationDirectory, nodeModulesDirectory, srcDirectory } from "./constants";
import { isBuiltin } from "./misc";

function parseEval(line: string, lastRealLoc: string): StackTraceEntry {
  const evalAt = line.match(/^eval at \S+ \((?<rest>.+)\)/)
  if (evalAt) {
    const loc = parseEval(evalAt.groups!.rest, lastRealLoc)
    const suffix = loc.is_eval ? `${loc.suffix}.eval` : '.eval'
    return {is_eval: true, loc: loc, filename: loc.filename, suffix}
  }

  const parsedLine = line.match(/^([^:]+)(:(\d+):(\d+))?/)
  if(parsedLine == null) {
    throw Error(`Unsupported format: ${line}`)
  }

  const [all, file, linePlusCol, lineNo, colNo] = parsedLine
  const locObj: StaticEntry = {is_eval: false,
                               filename: file,
                               line: lineNo ? parseInt(lineNo) : -1,
                               col: colNo ? parseInt(colNo) : -1,
                               function: null}
  if(file.startsWith(instrumentationDirectory)) {
    locObj.filename = lastRealLoc
  }
  return locObj
}

function prepareStackTrace(error: Error, trace: NodeJS.CallSite[]): StackTrace {
  // LastRealLoc is annoying
  //
  // When we intercept indirect eval or new Function, we end up doing the eval
  // within our instrumentation. Thus, in the raw stack trace, we see the eval
  // showing up in our instrumentation. This is not what we want -- we want to
  // know which bit of user-or-library code caused the eval. Thus, we walk the
  // stack backward, and keep track of the last 'real' location we saw. Then, if
  // we see an eval in the instrumentation, we can correctly attribute it to its
  // source

  var lastRealLoc = "TOP LEVEL"
  const arr: StackTrace = []
  for (const cs of trace.reverse()) {
    var frame: StackTraceEntry
    if(cs.isEval()) {
      // XXX can cs.getEvalOrigin be null if cs.isEval()?
      frame = parseEval(cs.getEvalOrigin()!, lastRealLoc)
    } else {
      let functionName: string | null;

      if (cs.getMethodName()) {
        functionName = `${cs.getTypeName()}.${cs.getMethodName()}`
      } else if (cs.isConstructor()) {
        functionName = `new ${cs.getFunctionName()}`
      } else {
        functionName = cs.getFunctionName()
      }

      frame = {
        filename: cs.getFileName() ?? "",
        line: cs.getLineNumber(),
        col: cs.getColumnNumber(),
        is_eval: false,
        function: functionName
      }
   }

   if(frame.filename && !frame.filename.startsWith(instrumentationDirectory)){
    lastRealLoc = frame.filename
   }
   arr.unshift(frame)
  }
  return arr;
}


export function makeStackTrace (e: Error): StackTrace {
  const __old = Error.prepareStackTrace
  Error.prepareStackTrace = prepareStackTrace
  // Typescript (rightly) thinks e.stack should be a string
  // It is not, because we set prepareStackTrace to be a StackTrace
  const stack = e.stack as unknown as StackTrace
  Error.prepareStackTrace = __old

  return stack
};

export function getStackTrace(): StackTrace[] {
  const st = makeStackTrace(Error("stack trace"))
  return [st].concat(getCallStack().map(makeStackTrace))
}

// Sometimes /dist and sometimes /src will show up in
// stacktraces. We want to ignore both
const IGNORED_FOLDERS = [instrumentationDirectory,
                         srcDirectory,
                         nodeModulesDirectory]

function validFilePath(path: string) {
  return path
         && !IGNORED_FOLDERS.some(f => path.startsWith(f))
         && !path.startsWith("node:")
         && !isBuiltin(path)
}

/**
 * Given a raw node stack trace, simply the stack trace to get it ready for
 * library trace processing.  Delete elements that are builtins or node calls,
 * removed consecutive repetitions, and only return an array of the src file
 * pathnames.
 *
 * @param st the full node stack trace
 * @returns a simplified stack trace of string paths of src files
 */
export function simplifyStackTrace(st: StackTrace[]) {
  const out: string[] = []
  for (const entry of st.flat()) {
    var path = entry.filename
    if(!validFilePath(path)) {
      continue
    }

    if (entry.is_eval) {
      path += entry.suffix
    }

    // collapse duplicates
    const prev = out.at(-1)
    if(path == prev) {
      continue
    }

    out.push(path)
  }
  return out
}
