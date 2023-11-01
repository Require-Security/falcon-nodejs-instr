// Copyright 2023, Require Security Inc, All Rights Reserved
import test from 'ava';
import { get_path_to_test_file, run_file_test, run_test } from '../dist/test_util.js';
import { readFile, rm } from 'fs/promises';
import { dirname, join } from 'path';

function shouldRun() {
  const majorVersion = parseInt(process.version.replace(/^v/, '').split(".")[0])
  return majorVersion >= 20
}

test('direct import', async function(t) {
  if(!shouldRun()) {
    t.pass()
    return
  }
  const code_path = get_path_to_test_file("import", "direct_import.mjs")
  await run_test(code_path, {mode: "RAW"})
  const results = JSON.parse(await readFile(code_path + ".privs.json"))
  t.deepEqual(results["fs.promises.open"], [['@reqsec/falcon-nodejs-instr']])
})

test('indirect import', async function(t) {
  if(!shouldRun()) {
    t.pass()
    return
  }
  const code_path = get_path_to_test_file("import", "indirect_import_1.mjs")
  await run_test(code_path, {mode: "RAW"})
  const results = JSON.parse(await readFile(code_path + ".privs.json"))
  t.deepEqual(results["fs.openSync"], [[ './indirect_import_2.mjs', './indirect_import_1.mjs' ]])
})

// Make sure when running via command line we get imports
test('load_via_command_line', async function(t) {
  if(!shouldRun()) {
    t.pass()
    return
  }

  const results = await run_file_test("import", "indirect_import.js")
  t.deepEqual(results["fs.openSync"], [ './indirect_import_2.mjs', './indirect_import.js' ])
})

test('load_via_cmd_and_env', async function(t) {
  if(!shouldRun()) {
    t.pass()
    return
  }
  const code_path = get_path_to_test_file("load_via_env", "code.mjs")
  const loader_path = join(dirname(code_path), "falcon.js")
  const privs_file = dirname(code_path) + "/privs.json"

  // Run via cmd
  await run_test(code_path, {mode: "RAW", node_args: ["--require", loader_path]})
  let results = JSON.parse(await readFile(privs_file))
  await rm(privs_file)
  t.deepEqual(results["fs.promises.open"], [['@reqsec/falcon-nodejs-instr']])


  // Run via env
  await run_test(code_path, {mode: "RAW", extra_env: {"NODE_OPTIONS" : `--require "${loader_path}"`}})
  results = JSON.parse(await readFile(dirname(code_path) + "/privs.json"))
  await rm(privs_file)
  t.deepEqual(results["fs.promises.open"], [['@reqsec/falcon-nodejs-instr']])
})
