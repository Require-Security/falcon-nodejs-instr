// Copyright 2023, Require Security Inc, All Rights Reserved
const test = require('ava')
const path = require('path')
const child_process = require("child_process")
const {promisify} = require("node:util")
const exec = promisify(child_process.exec)

const { agent, get_path_to_test_file, setup_run_code } = require('../dist/test_util.js')
const { readFile, writeFile, readdir } = require('fs/promises')

test('config: set config file', async function (t) {
  const target = get_path_to_test_file("config_file", "'code with space.js'")
  const targetDir = path.dirname(target)
  const config_file = path.join(targetDir, "config.reqsec")

  const cmd = [ "node", agent, "--", target,
                "readFileSync", target].join(" ")
  console.log("running %s", cmd)

  await exec(cmd, {env: {...process.env, REQSEC_AGENT_CONFIG: config_file}})
  const resultFile = path.join(targetDir, "privs.json")
  const json = JSON.parse(await readFile(resultFile))
  t.deepEqual(json['fs.readFileSync'][0],
              ["@reqsec/falcon-nodejs-instr"])
})

test('config: invalid config value', async function (t) {

  // Setup code
  function code() {
    const fs = require('fs')

    // Make the sensitive call.
    fs.open(__filename)
  }

  const code_file = await setup_run_code(code)

  // Setup config (logSuplicateEvents is a typo)
  const config = `
  mode: learn
  privsFile: $TARGET_PATH.privs.json
  eventFile: $TARGET_DIR/log.json
  shadowStack: true
  logSuplicateEvents: true
  `
  const config_file = path.join(path.dirname(code_file), "unit_tests_config.reqsec")
  await writeFile(config_file, config)

  // Run the command
  const cmd = ["node", agent, "--", code_file].join(" ")
  console.log("running %s", cmd)

  try {
    await exec(cmd, {env: {...process.env, REQSEC_AGENT_CONFIG: config_file}})
    t.fail()
  } catch (e) {
    t.assert(e.message.includes("logSuplicateEvents"))
  }
})

test('config: invalid magic value', async function (t) {

  // Setup code
  function code() {
    const fs = require('fs')

    // Make the sensitive call.
    fs.open(__filename)
  }

  const code_file = await setup_run_code(code)

  // Setup config ($TARGET_FILE doesn't exist)
  const config = `
  mode: learn
  privsFile: $TARGET_FILE.privs.json
  eventFile: $TARGET_DIR/log.json
  shadowStack: true
  `
  const config_file = path.join(path.dirname(code_file), "unit_tests_config.reqsec")
  await writeFile(config_file, config)

  // Run the command
  const cmd = ["node", agent, "--", code_file].join(" ")
  console.log("running %s", cmd)

  try {
    await exec(cmd, {env: {...process.env, REQSEC_AGENT_CONFIG: config_file}})
    t.fail()
  } catch (e) {
    t.assert(e.message.includes("$TARGET_FILE"))
  }
})

test('config: missing mode', async function (t) {

  // Setup code
  function code() {
    const fs = require('fs')

    // Make the sensitive call.
    fs.open(__filename)
  }

  const code_file = await setup_run_code(code)

  // Needs a mode
  const config = `
  privsFile: $TARGET_PATH.privs.json
  eventFile: $TARGET_DIR/log.json
  shadowStack: true
  `
  const config_file = path.join(path.dirname(code_file), "unit_tests_config.reqsec")
  await writeFile(config_file, config)

  // Run the command
  const cmd = ["node", agent, "--", code_file].join(" ")
  console.log("running %s", cmd)

  try {
    await exec(cmd, {env: {...process.env, REQSEC_AGENT_CONFIG: config_file}})
    t.fail()
  } catch (e) {
    t.assert(e.message.includes("'mode'"))
  }
})


test('config: use default config file', async function (t) {
  const target = get_path_to_test_file("config_file", "'code with space.js'")
  const targetDir = path.dirname(target)
  const config_file = path.join(__dirname, "../unit_tests_config.reqsec")

  const cmd = [ "node", agent, "--", target,
                "readFileSync", target].join(" ")
  console.log("running %s", cmd)

  // Remove any previously existing prvis file
  await exec(`rm -f ${targetDir}/privs_*.json`)
  await exec(`rm -f ${targetDir}/events_*.json`)
  await exec(cmd, {env: {...process.env, REQSEC_AGENT_CONFIG: config_file}})

  const files = await readdir(targetDir)
  const findResultPath = /privs_\d+\.json/
  const resultFiles = files.filter((path) => findResultPath.test(path))
  if(resultFiles.length != 1) {
    throw Error(`resultFiles = ${resultFiles}`)
  }

  const resultFile = path.join(targetDir, resultFiles[0])
  const json = JSON.parse(await readFile(resultFile))
  t.deepEqual(json['fs.readFileSync'][0],
              ["@reqsec/falcon-nodejs-instr"])
})

test('config: blockSensitivity-enforcement', async function (t) {
  /* First, generate a permissions file */
  // Setup code
  function code() {
    const fs = require("fs");
    fs[process.argv[2]]("/dev/null")
  }

  const code_file = await setup_run_code(code)

  // Setup first config
  let config = `
  mode: learn
  privsFile: $TARGET_DIR/privs.json
  `
  const config_file = path.join(path.dirname(code_file), "unit_tests_config.reqsec")
  await writeFile(config_file, config)

  // Run the command
  let cmd = ["node", agent, "--", code_file, "openSync"].join(" ")
  console.log("running %s", cmd)

  await exec(cmd, {env: {...process.env, REQSEC_AGENT_CONFIG: config_file}})

  const resultFile = path.join(path.dirname(code_file), "privs.json")
  const json = JSON.parse(await readFile(resultFile))
  t.deepEqual(json['fs.openSync'][0],
              ["@reqsec/falcon-nodejs-instr"])

  /* Now enforce. This one should pass */
  config = `
  mode: enforce
  privsFile: $TARGET_DIR/privs.json
  `

  await writeFile(config_file, config)
  console.log("running %s", cmd)
  await t.notThrowsAsync(exec(cmd, {env: {...process.env, REQSEC_AGENT_CONFIG: config_file}}))

  /* Now enforce. This one should fail */
  config = `
  mode: enforce
  privsFile: $TARGET_DIR/privs.json
  `

  await writeFile(config_file, config)

  cmd = ["node", agent, "--", code_file, "readFileSync"].join(" ")
  console.log("running %s", cmd)
  await t.throwsAsync(exec(cmd, {env: {...process.env, REQSEC_AGENT_CONFIG: config_file}}))

  /* Now enforce. This one should pass since blockSensitivity is too high */
  config = `
  mode: enforce
  blockSensitivity: 3
  privsFile: $TARGET_DIR/privs.json
  `

  await writeFile(config_file, config)

  cmd = ["node", agent, "--", code_file, "readFileSync"].join(" ")
  console.log("running %s", cmd)
  await t.notThrowsAsync(exec(cmd, {env: {...process.env, REQSEC_AGENT_CONFIG: config_file}}))

  /* Make sure we handle bad blockSensitivity/eventThreshold combo */
  config = `
  mode: enforce
  blockSensitivity: 3
  eventThreshold: 4
  privsFile: $TARGET_DIR/privs.json
  `

  await writeFile(config_file, config)

  cmd = ["node", agent, "--", code_file, "readFileSync"].join(" ")
  console.log("running %s", cmd)
  await t.throwsAsync(exec(cmd, {env: {...process.env, REQSEC_AGENT_CONFIG: config_file}}))
})

test('config: use require no args', async function (t) {
  function code() {
    require("../../../dist/init.js").init()
    const fs = require("fs")
    const fd = fs.openSync("/dev/null")
    fs.closeSync(fd)
  }

  const config_file = path.join(__dirname, "../unit_tests_config.reqsec")
  const target = await setup_run_code(code)
  const targetDir = path.dirname(target)
  const cmd = [ "node", target].join(" ")

  // Remove any previously existing prvis file
  await exec(`rm -f ${targetDir}/privs_*.json`)
  await exec(`rm -f ${targetDir}/events_*.json`)
  console.log("Running %s", cmd)
  await exec(cmd, {env: {...process.env, REQSEC_AGENT_CONFIG: config_file}})

  const files = await readdir(targetDir)
  const findResultPath = /privs_\d+\.json/
  const resultFiles = files.filter((path) => findResultPath.test(path))
  if(resultFiles.length != 1) {
    throw Error(`resultFiles = ${resultFiles}`)
  }

  const resultFile = path.join(targetDir, resultFiles[0])
  const json = JSON.parse(await readFile(resultFile))
  t.deepEqual(json['fs.openSync'], [['@reqsec/falcon-nodejs-instr']])
})


test('config: use require override parameter', async function (t) {
  function code() {
    const cfg = {privsFile: __dirname + "/privs.json",
                 eventFile: null}
    require("../../../dist/init.js").init(cfg)
    const fs = require("fs")
    const fd = fs.openSync("/dev/null")
    fs.closeSync(fd)
  }

  const config_file = path.join(__dirname, "../unit_tests_config.reqsec")
  const target = await setup_run_code(code)
  const targetDir = path.dirname(target)
  const cmd = [ "node", target].join(" ")

  // Remove any previously existing prvis file
  await exec(`rm -f ${targetDir}/privs.json`)
  console.log("Running %s", cmd)
  await exec(cmd, {env: {...process.env, REQSEC_AGENT_CONFIG: config_file}})

  const files = await readdir(targetDir)
  // Should have privs file as privs.json, and no events file
  t.is(files.some(name => name == "privs.json"), true)
  t.is(files.every(name => !name.includes("event")), true)
})


test('config: just require parameter', async function (t) {
  function code() {
    const cfg = {mode: "learn",
                 privsFile: __dirname + "/privs.json",
                 traceGranularity: "file"}
    require("../../../dist/init.js").init(cfg)
    const fs = require("fs")
    const fd = fs.openSync("/dev/null")
    fs.closeSync(fd)
  }

  const target = await setup_run_code(code)
  const targetDir = path.dirname(target)
  const cmd = [ "node", target].join(" ")

  // Remove any previously existing prvis file
  await exec(`rm -f ${targetDir}/privs.json`)
  console.log("Running %s", cmd)
  await exec(cmd)

  const files = await readdir(targetDir)
  // Should have privs file as privs.json, and no events file
  t.is(files.some(name => name == "privs.json"), true)
  t.is(files.every(name => !name.includes("event")), true)

  const resultFile = path.join(targetDir, "privs.json")
  const json = JSON.parse(await readFile(resultFile))
  t.deepEqual(json['fs.openSync'], [['./test_code.js']])
})
