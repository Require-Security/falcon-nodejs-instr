const test = require('ava');
const { run_code } = require('../dist/test_util.js')

function toNS(time) {
  return time[0] * 10**9 + time[1]
}

test.serial('perf: writeFileSync', async function(t) {
  function code() {
    const fs = require("fs")
    for(var i = 0; i < 10000; i++) {
      fs.writeFileSync("/tmp/TESTFILE", "Hello")
    }
  }

  var start = process.hrtime()
  await run_code(code)
  const instrTime = toNS(process.hrtime(start))

  start = process.hrtime()
  await run_code(code, {mode: "RAW"})
  const rawTime = toNS(process.hrtime(start))
  console.log("raw: %s, instr: %s, overhead: %s",
              rawTime, instrTime, instrTime/rawTime)
})

test.serial('perf: readFileSync', async function(t) {
  function code() {
    const fs = require("fs")
    for(var i = 0; i < 10000; i++) {
      console.log(fs.readFileSync("/tmp/TESTFILE"))
    }
  }

  var start = process.hrtime()
  await run_code(code)
  const instrTime = toNS(process.hrtime(start))

  start = process.hrtime()
  await run_code(code, {mode: "RAW"})
  const rawTime = toNS(process.hrtime(start))
  console.log("raw: %s, instr: %s, overhead: %s",
              rawTime, instrTime, instrTime/rawTime)
})