const test = require('ava')
const { run_file_test,
        run_code,
} = require('../dist/test_util.js')

test('nested calls lead to open', async function(t) {
  const result = await run_file_test("nested_calls_lead_open")
  console.log(result)
  t.deepEqual(result['fs.open'], [ './lib2.js', './lib1.js', './code.js' ])
})

test('promise return value is proxied', async function(t) {
  const result = await run_file_test("fs_promises")
  console.log(result)
  t.deepEqual(Object.keys(result),
              ['fs.promises.open', 'fs.promises.FileHandle.chmod', 'fs.promises.unlink'])
  t.deepEqual(result['fs.promises.open'],
              ['./lib2.js', './lib1.js', './code.js'])
  t.deepEqual(result['fs.promises.FileHandle.chmod'], ['./code.js'])
  t.deepEqual(result['fs.promises.unlink'],
              ['./lib2.js', './lib1.js', './code.js'])
})

test('require caching bug', async function(t) {
  await t.notThrowsAsync(run_file_test("require_caching_bug"))
})

test('redefine eval bug', async function(t) {
  await t.notThrowsAsync(run_file_test("redefine_eval_bug"))
})

test('node: in require', async function(t) {
  function code() {
    const fs = require("node:fs")
    fs.openSync("/dev/null")
  }

  const result = await run_code(code)
  console.log(result)
  t.deepEqual(result['fs.openSync'], [ './test_code.js' ])
})

test('js-yaml exploit', async function (t) {
  function code() {
    const f = new Function(`
      this.constructor.constructor("return process")().mainModule.require("child_process").execSync("touch /tmp/TESTFILE")
    `)
    f()
  }
  const result = await run_code(code)
  console.log(result)
  t.deepEqual(result['child_process.execSync'].sort(),
    ['./test_code.js.eval', './test_code.js'].sort())
})

test('child_process proxy', async function(t) {
  function code() {
    const { spawn } = require('child_process');
    // this will hang until we kill it
    const grep = spawn('grep', ['foo']);

    grep.on('close', (code, signal) => {
      console.log(
        `child process terminated due to receipt of signal ${signal}`);
    });

    // Send SIGHUP to process.
    grep.kill('SIGHUP');
  }
  const result = await run_code(code)
  console.log(result)
  t.deepEqual(result['child_process.spawn'], [ './test_code.js' ])
  t.deepEqual(result['child_process.ChildProcess.kill'], [ './test_code.js' ])
})

test('access undefined proxy', async function(t) {
  function code() {
    const fs = require('fs')
    console.log(fs.foobar)
  }
  const result = await(run_code(code))
  console.log(result)
    t.pass()
})

test('throw should throw', async function(t) {
  function code() {
      throw Error("here")
  }
  await t.throwsAsync(run_code(code))
})

test('get on method returns void', async function(t) {
  function code() {
    var fs = require("fs")
    var readFile = fs.readFile.bind(fs)
    console.log(readFile)
  }

  await t.notThrowsAsync(run_code(code))
})

test('global define Function', async function(t) {
  await t.notThrowsAsync(run_file_test("global_function"))
})

test.failing('file handle constructor not proxied', async function(t) {
  async function code() {
    const fs = require('fs').promises;
    const fh = await fs.open('README.md');
    await fh.constructor.prototype.chmod.call(fh, 0o644);
  }

  const result = await run_code(code)
  console.log(result)
  t.deepEqual(Object.keys(result),
              ['fs.promises.open', 'fs.promises.FileHandle.chmod'])
  t.deepEqual(result['fs.promises.open'], ['./test_code.js'])
  t.deepEqual(result['fs.promises.FileHandle.chmod'], ['./test_code.js'])
})

test('promisified setTimeout no crash', async function(t) {
  async function code() {
    const { promisify } = require('util')
    const sleep = promisify(setTimeout)
    await sleep(10)
  }

  await t.notThrowsAsync(run_code(code))
})

test('promisified setTimeout caught', async function(t) {
  async function code() {
    const { promisify } = require('util')
    const { readFile } = require("fs")
    const readFileP = promisify(readFile)
    const txt = await readFileP(__filename)
    console.log(txt)
  }

  const result = await run_code(code)
  console.log(result)
  t.deepEqual(result['fs.readFile'], ['./test_code.js'])
})

// This needs support for `util.promisify.custom`. See
// https://github.com/Require-Security/nodejs-agent/issues/35
test.failing('promisified setTimeout special-case caught', async function(t) {
  async function code() {
    const { promisify } = require('util')
    const { exec } = require("child_process")
    const execP = promisify(exec)
    const proc = await execP("ls /tmp")
    console.log(proc.stdout)
  }

  const result = await run_code(code)
  t.deepEqual(result['child_process.exec'], ['./test_code.js'])
})

test('new function transparency', async function(t) {
  function code() {
    const fn = () => {}
    if(fn.constructor != Function) {
      throw Error("A function's constructor should equal Function")
    }
  }

  await t.notThrowsAsync(run_code(code))
})

test('proxy transparency', async function(t) {
  function code() {
    const fs = require('fs')
    const assert = require('assert')

    // This basically is mimicking sinon.spy() functionality
    const method = new Proxy(fs.createWriteStream, {})

    var methodDesc = {
      value: method,
      writable: true,
      enumerable: true,
      configurable: true,
      isOwn: true
    };
    Object.defineProperty(fs, "createWriteStream", methodDesc);

    assert(typeof method === "function", "should be function")
    assert(fs.createWriteStream === method, "should be equal")
  }

  await t.notThrowsAsync(run_code(code))
})

test('overwrite property', async function(t) {
  function code() {
    const fs = require('fs')

    fs.createWriteStream = () => {}
    fs.createWriteStream()
  }

  const result = await run_code(code)
  // It's been overwritten, so this is not a call
  t.deepEqual(result, {})
})


test('overwrite property with self', async function(t) {
  function code() {
    const fs = require('fs')
    const func = fs.openSync

    const desc = {
      value: func,
      writable: false,
      configurable: false
    }

    Object.defineProperty(fs, "openSync", desc)

    fs.openSync("/dev/null")
  }

  const result = await run_code(code)
  console.log(result)
  // It's been overwritten with itself, so it should still register
  t.truthy(result["fs.openSync"].includes("./test_code.js"))
})
// This is the same test as above. However, it is showing something wrong.
// In this test, (and above, but we're checking for different things), when
// the test code assigns to fs.openSync, they actually assign the proxied
// copy. Then, when we call it in our code, we get a spurious call to
// openSync
// This can either be fixed by getting primordials in our code or by
// checking set and unproxying or something (but then what if foo is assigned
// to bar?)
// IDK, we should do something about this but it's an eeeeedge case
test.failing('overwrite property with self primordial', async function(t) {
  function code() {
    const fs = require('fs')
    const func = fs.openSync

    const desc = {
      value: func,
      writable: false,
      configurable: false
    }

    Object.defineProperty(fs, "openSync", desc)

    fs.openSync("/dev/null")
  }

  const result = await run_code(code)
  console.log(result)
  // It's been overwritten with itself, so it should still register
  t.deepEqual(result["fs.openSync"], ["./test_code.js", ])
})


test('process.mainModule.require', async function(t) {
  function code() {
    const fs = process.mainModule.require("fs")
    fs.openSync("/dev/null")
  }

  const result = await run_code(code)
  t.is(result['fs.openSync'][0], "./test_code.js")
})

test('memory: fs.open', async function(t) {
  function code() {
    const fs = require('fs')

    // Parse out the program arguments.
    const argv = process.argv.slice(2)

    // Make the sensitive call.
    fs.open(argv[0], argv[1], function (err, f) {})
  }

  const spec = {mode: "BATCH", target_args:  ['/dev/urandom', 'r']}
  const result = await run_code(code, spec)
  t.is(result['fs.open'][0], "./test_code.js")
})

// The following two tests that if we pass the correct command line option
// node APIs not present in the categorization files show up in
// the permissions.
// The first does the test for unknown methods within a module,
// the second one for an altogether unknown module.
test('trace unknown APIs', async function(t) {
  function code() {
    const querystring = require("node:querystring")
    querystring.stringify({ foo: 'bar', baz: ['qux', 'quux'], corge: '' });
  }

  const result = await run_code(code, {mode: "BATCH",
                                       extra_agent_args: ['--trace-unknown-builtins'],
                                      })
  t.deepEqual(result["querystring.stringify"], ["./test_code.js"])
})

test('trace unknown modules', async function(t) {
  function code() {
    const readline = require('node:readline/promises');
    // Doesn't need to work -- just needs to be called
    try {
      readline.createInterface();
    } catch {}
  }

  const result = await run_code(code, {mode: "BATCH",
                                       extra_agent_args: ['--trace-unknown-builtins'],
                                      })
  t.deepEqual(result["readline.promises.createInterface"], ["./test_code.js"])
})

test('unserializable argument', async function(t) {
  function code() {
    const fs = require("fs")
    const options = {encoding: null}
    options.toString = undefined
    fs.readFileSync(__filename, options)
  }

  const spec = {mode: "BATCH",
                extra_agent_args: ["-f", "test_log"]}
  await t.notThrowsAsync(run_code(code, spec))
})

test('trace unknowns should not trace level 0s', async function(t) {
  function code() {
    const fs = require("fs")
    const fd = fs.openSync(__filename)
    fs.closeSync(fd)
  }

  const spec = {mode: "BATCH", extra_agent_args: ["--trace-unknown-builtins"]}
  const result = await run_code(code, spec)
  console.log(result)
  t.falsy(result['fs.closeSync'])
})

// Make sure we catch a sensitive function invoked via call
test('catch call', async function(t) {
  function code() {
    const fs = require("fs")
    fs.openSync.call(null, __filename)
  }
  const result = await run_code(code)
  t.deepEqual(result['fs.openSync'], ['./test_code.js'])
})

// Make sure we catch a sensitive function invoked via call via Function proto
test('catch call from Function', async function(t) {
  function code() {
    const fs = require("fs")
    Function.prototype.call.call(fs.openSync, null, __filename)
  }
  const result = await run_code(code)
  t.deepEqual(result['fs.openSync'], ['./test_code.js'])
})


// Make sure we don't see a function call for a level 0
//function invoked via call
test('call on level 0', async function(t) {
  function code() {
    const fs = require("fs")
    const fd = fs.openSync(__filename)
    fs.closeSync.call(null, fd)
  }
  const result = await run_code(code)
  t.falsy(result['fs.closeSync'])
})

// Make sure we catch a sensitive function invoked via apply
test('catch apply', async function(t) {
  function code() {
    const fs = require("fs")
    fs.openSync.apply(null, [__filename])
  }
  const result = await run_code(code)
  t.deepEqual(result['fs.openSync'], ['./test_code.js'])
})

// Make sure we catch a sensitive function invoked via bind
test('catch bind', async function(t) {
  function code() {
    const fs = require("fs")
    const f = fs.openSync.bind(null, __filename)
    f()
  }
  const result = await run_code(code)
  t.deepEqual(result['fs.openSync'], ['./test_code.js'])
})

// Make sure we catch an unknown function called via call also we want to see
// querystring.stringify, not querystring.stringify.call, which would just be
// confusing
test('call on unknown', async function(t) {
  function code() {
    const querystring = require("node:querystring")
    querystring.stringify.call(null, { foo: 'bar', baz: ['qux', 'quux'], corge: '' });
  }

  const result = await run_code(code, {mode: "BATCH",
                                       extra_agent_args: ['--trace-unknown-builtins'],
                                      })
  t.deepEqual(result["querystring.stringify"], ["./test_code.js"])
})

// Same as above but bind
test('bind on unknown', async function(t) {
  function code() {
    const querystring = require("node:querystring")
    const f = querystring.stringify.bind(null, { foo: 'bar', baz: ['qux', 'quux'], corge: '' })
    f()
  }

  const result = await run_code(code, {mode: "BATCH",
                                       extra_agent_args: ['--trace-unknown-builtins'],
                                      })
  t.deepEqual(result["querystring.stringify"], ["./test_code.js"])
})

// We don't want to see hasProperty (or other Object.prototype)
// calls
test('ignore hasProperty', async function(t) {
  function code() {
    const fs = require("fs")
    fs.openSync.hasOwnProperty("foo")
  }
  const result = await run_code(code)
  t.deepEqual(result, {})
})

test('pass env to tests works', async function(t) {
  function code() {
    if(process.env.FOO != "BAR") {
      throw Error("No env foo?")
    }
  }

  const spec = {mode: "RAW", extra_env: {"FOO": "BAR"}}
  await t.notThrowsAsync(run_code(code, spec))
})

test('eval exec', async function(t) {
  function code() {
    eval("require('node:child_process').execSync('touch /tmp/exploit')")
  }
  const result = await run_code(code)
  console.log(result)
  t.deepEqual(result["child_process.execSync"],
              [ './test_code.js.eval', './test_code.js' ])
})
