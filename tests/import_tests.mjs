// Copyright 2023, Require Security Inc, All Rights Reserved
import test from 'ava';
import { get_path_to_test_file, run_test } from '../dist/test_util.js';
import { readFile } from 'fs/promises';

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