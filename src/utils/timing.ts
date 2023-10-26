// Copyright 2023, Require Security Inc, All Rights Reserved
/** Real-time timing utils
 *
 * There are lots of ways to get timing data (clinic flame), but they
 * generally rely on sampling, which can be confused by v8 inlining things
 *
 * Also, sampling doesn't give results for part of a function.
 *
 * And it's looking at cpu-time, not "total time taken"
 *
 * Hence this little timing library:
 *
 * Time any function call with timeCalls. You can either do this
 * at the point of function declaration:
 *
 * export function noteAccess(...
 *
 * becomes
 *
 * export const noteAccess = timeCalls(function(..., "noteAccess")
 *
 * Or on any individual function call:
 *
 * const st = getStackTrace() -> const st = timeCalls(getStackTrace)()
 *
 * You can also time non-function chunks by surrounding them with
 * startTime/logTime.
 *
 * If logTime is ever called (and it's called in timeCalls), an exit handler
 * will be added that will print all the timing stats you collect to
 * /tmp/time_stats
 *
 * Hopefully this will be useful!
 */

import { writeFileSync } from "fs"

export const times: Map<string, number> = new Map()

export function startTime() {
  return process.hrtime()
}

export const start = startTime()
var handlerSet = false

export function logTime(eventName: string, startTime: [number, number]) {
  const [endS, endNS] = process.hrtime(startTime)
  let soFar = times.get(eventName)
  if(soFar === undefined) {
    soFar = 0
  }

  times.set(eventName, soFar + endNS + (endS * 10 ** 9))

  if(!handlerSet) {
    process.on("exit", exitHandler)
    handlerSet = true
  }
}

// XXX: once we move to typescript 5, we'll have access to decorators. This is *much*
// better as a decorator!
// https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#decorators
export function timeCalls<T extends Function>(func: T,
                                              overrideName: string | null = null): T {
  const handler = {
    apply(target: Function, self: unknown, args: unknown[]) {
      const start = startTime()
      try {
        return Reflect.apply(target, self, args)
      } finally {
        const name = overrideName ? overrideName : target.name
        logTime(name, start)
      }
    }
  }

  return new Proxy(func, handler) as T
}

function exitHandler() {
  logTime("total", start)
  const maxInt = Math.floor(times.get("total")!/(10 ** 9))
  // from https://stackoverflow.com/questions/14879691/get-number-of-digits-with-javascript
  var length = Math.log(maxInt) * Math.LOG10E + 1 | 0;

  // Format each number so they're all the same length. Ends up with something like
  // 07.323213: NoteAccess
  // 01.345323: FormatStackTrace
  // 30:453423: Total
  const nf = new Intl.NumberFormat(undefined,
                                   {minimumIntegerDigits: length,
                                    minimumFractionDigits: 6,
                                    maximumFractionDigits: 6})
  const toWrite = [...times].map((elt) => {return [elt[0], elt[1]/(10 ** 9)] as [string, number]})
                            .map((elt) => {return `${nf.format(elt[1])}: ${elt[0]}`})
                            .join("\n")
  writeFileSync("/tmp/time_stats", toWrite + "\n")
}
