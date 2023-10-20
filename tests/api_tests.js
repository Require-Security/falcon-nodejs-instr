const test = require('ava')
const fs = require('fs')
const { gen_temp_file, run_code } = require('../dist/test_util.js')

test('api: fs.promise', async function(t) {
  async function code() {
    const fs = require("fs").promises

    const handle = await fs.open("/dev/null", "w")
    await fs.writeFile(handle, "foo")
    await handle.write("bar")
    await handle.close()
  }
  const result = await run_code(code)
  console.log(result)
  t.deepEqual(result['fs.promises.open'], ['./test_code.js'])
  t.deepEqual(result['fs.promises.writeFile'], ['./test_code.js'])
  console.log(result)
})

test('api: fs.promise.FileHandle', async function(t) {
  async function code() {
    const { gen_temp_file } = require('../../../dist/test_util.js')
    const fs = require("fs").promises

    const code_file = await gen_temp_file("test.js")
    const handle = await fs.open(code_file, "w")
    await handle.chmod(777)
    await handle.close()
  }
  const result = await run_code(code)
  t.deepEqual(result['fs.promises.FileHandle.chmod'], ["./test_code.js"])
})

test('api: fs_sync, some level 0', async function(t) {
  function code() {
    const fs = require("fs")
    const fd = fs.openSync("/dev/null")
    fs.closeSync(fd)
  }

  const result = await run_code(code)
  t.deepEqual(result['fs.openSync'], ['./test_code.js'])
  t.falsy(result['fs.closeSync'])
})

async function write_results_file(privs) {
  const results_file = await gen_temp_file("results.json")
  fs.writeFileSync(results_file, JSON.stringify(privs))
  return results_file
}

test('api: enforce has privilege', async function(t) {
  function code() {
    const fs = require("fs")
    const fd = fs.openSync("/dev/null")
    fs.closeSync(fd)
  }

  var results_file = await write_results_file(
    {"fs.openSync": [["@reqsec/falcon-nodejs-instr"]]}
  )
  const opts = {
    mode: "NO_ARGS",
    extra_agent_args: ['enforce', '-p', results_file]
  }
  await t.notThrowsAsync(run_code(code, opts))
})

test('api: enforce privilege violation', async function(t) {
  function code() {
    const fs = require("fs")
    const fd = fs.openSync("/dev/null")
    fs.closeSync(fd)
  }

  var results_file = await write_results_file(
    {"fs.openSync": [[]]}
  )
  const opts = {
    mode: "NO_ARGS",
    extra_agent_args: ['enforce', '-p', results_file]
  }
  try {
    await run_code(code, opts)
    // We should have thrown an exception...
    t.fail()
  } catch (err) {
    const stack = err.stack.split('\n')
    t.is(stack[5], "Error: Permissions Violation: fs.openSync called from @reqsec/falcon-nodejs-instr")
  }
})

// We don't support this and we don't really care right now, but
// we should have a test for it
test.failing('api: Dir asyncIterator', async function(t) {
  async function code() {
    const { opendir } = require('fs/promises')
    const dir = await opendir("./")
    for await (const entry of dir) {
      console.log("isDir: %s", entry.isDirectory())
    }
  }

  const spec = {mode: "BATCH",
                extra_agent_args: ["--event-threshold", "0"]}
  const result = await run_code(code, spec)
  t.deepEqual(result['fs.Dirent.isDirectory'], ["./test_code.js"])
})


// Do net.socket here?
test('api: Constructor for sensitive class', async function(t) {
  function code() {
    const net = require('net');

    // Create a TCP server
    const server = new net.Server((socket) => {
      // Handle incoming connections

      // Set up data event handler
      socket.on('data', (data) => {
        // Handle incoming data
        console.log(`Received data: ${data}`);
        socket.write(`Server received: ${data}`);
      });

      // Set up end event handler
      socket.on('end', () => {
        console.log('Connection ended');
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error('Socket Error:', error);
      });
    });

    // Listen on a specific port and IP address
    const port = 56454;
    const host = '127.0.0.1';

    server.listen(port, host, () => {
      console.log(`Server is listening on ${host}:${port}`);
    });

    setTimeout(() => {
      server.close(() => {
        console.log("server has been closed")
      })
    }, 500)
  }
  const spec = {mode: "BATCH",
                extra_agent_args: ["--event-threshold", "0"]}
  const result = await run_code(code, spec)
  console.log(result)
  t.deepEqual(result['net.Server'], ["./test_code.js"])
  t.deepEqual(result['net.Server.listen'], ["./test_code.js"])
})