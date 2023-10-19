const test = require('ava')
const { gen_temp_file,
        run_file_test,
        run_code,
        setup_run_code,
        run_test,
        agent,
        get_path_to_test_file,
} = require('../dist/test_util.js')
const fs = require('fs')
const {promisify} = require("node:util")
const child_process = require("child_process")
const exec = promisify(child_process.exec)
const path = require("path")

test('worker threads no crash', async function(t) {
  function code() {
    const { Worker, isMainThread } = require('node:worker_threads');
    const cp = require('child_process');

    if (isMainThread) {
      console.log('In main thread', process.pid)
      // This re-loads the current file inside a Worker instance.
      const num_of_workers = 10;
      for (let i = 0; i < num_of_workers; i++)
        new Worker(__filename);
    } else {
      console.log('Inside Worker!', process.pid);

      const ms = Math.floor(Math.random()*200) + 200
      setTimeout(() => {
        cp.exec('echo "This is a command"', (error, stdout, stderr) => {
          console.log(`stdout: ${stdout}`);
        });
      }, ms);
    }
  }

  // TODO: We will need full support for worker threads such that each worker
  // isn't writing to the same file, but as a first step lets at least make
  // sure workers are not broken.
  const results_file = await gen_temp_file("results.json")
  const opts = {
    mode: "NO_ARGS",
    extra_agent_args: ["learn", "-p", results_file]
  }
  await t.notThrowsAsync(run_code(code, opts))
})

test('worker data passed to worker thread', async function (t) {
  const results_file = await gen_temp_file("results.json")
  const opts = {
    mode: "NO_ARGS",
    extra_agent_args: ["learn", "-p", results_file]
  }
  await t.notThrowsAsync(run_file_test("worker_data_test", "code.js", opts))
})
