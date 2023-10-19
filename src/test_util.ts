#!/usr/bin/env node

/** Unit tests for cat-da!
 *
 * There are two types of supported tests: inline and file. See run_inline_test and
 * run_file_test for details, respectively.
 *
 * Either way, they will return the output dictionary which contains all the
 * permissions witnessed.
 */

import { mkdtemp, writeFile, readFile, readdir, rm} from 'fs/promises'
import { promisify } from 'node:util';
import { dirname, join } from 'path';
import { exec as _exec } from 'node:child_process'
import { tmpdir as _tmpdir } from 'os';
import { Graph } from './utils/graph';
import { ExecOptions } from 'child_process';
import { logString } from './loggers';

const exec = promisify(_exec)

export const agent = join(__dirname, "./reqsec-nodejs.js")
const MAX_BUFFER = 10 ** 9

export const library_tests_path = `${__dirname}/../tests/libs/node_modules`

interface CommonOptions {
  node_args?: string[]
  target_args?: string[]
  extra_env?: NodeJS.ProcessEnv
}

interface RawSpec extends CommonOptions {
  mode: "RAW"
}

interface BatchSpec extends CommonOptions{
  mode: "BATCH"
  extra_agent_args?: string[]
  no_privs?: boolean
}

interface NoArgsSpec extends CommonOptions {
  mode: "NO_ARGS"
  extra_agent_args?: string[]
}

type RunSpec = RawSpec | BatchSpec | NoArgsSpec 

export async function run_test(target: string, spec: RunSpec, cwd: string | null = null) {
  const options: ExecOptions = {
    maxBuffer: MAX_BUFFER,
    env: { ...process.env, NODE_PATH: library_tests_path }
  }
  if (spec.extra_env) {
    options.env = {...options.env, ...spec.extra_env}
  }
  if (cwd) {
    options.cwd = cwd
  }
  switch(spec.mode) {
    case "RAW": {
      const cmd =  ["node", spec.node_args, target, spec.target_args].flat().join(" ")
      console.log("running %s", cmd)
      const child = await exec(cmd, options)
      return child.stdout
    }
    case "BATCH": {
      const result_file = target + ".result.json"
      const cmd = ["node", spec.node_args,
                   agent, "learn",
                   "-p", result_file,
                   "--trace-granularity", "file",
                   spec.extra_agent_args,
                   "--", target,
                   spec.target_args]
                   .flat().join(" ")
      console.log("running %s", cmd)
      await exec(cmd, options)
      if(spec.no_privs) {
        return
      }
      const json = JSON.parse(await readFile(result_file, 'utf-8'))
      const result: Record<string, string[]> = {}
      for (var name in json) {
        result[name] = json[name].flat()
      }
      return result
    }
    case "NO_ARGS": {
      const cmd = ["node", spec.node_args,
                   agent,
                   spec.extra_agent_args,
                   "--", target,
                   spec.target_args]
                   .flat().join(" ")
      console.log("running %s", cmd)
      const child = await exec(cmd, options)
      return child.stdout
    }
  }
}

/** Run an inline test
  *
  * With this, you can define a library, write some code-to-be-run, and run the whole thing
  * from one function.
  *
  * I think for very small tests, this will be much clearer than having to have a seperate
  * folder for each test a la run_file_test
  *
  * @param {Function} code: The code to make use of lib. Should be a single function to
  * be run
  *
  * @param {Function} exported_lib: The library to be imported. It should be a function, which,
  * when evaluated will return the object you want lib.js to export.
  *
  * @returns output of mir from running `code`
  */
export async function run_inline_test(code: Function,
                                      exported_lib: Function,
                                      spec: RunSpec = {mode: "BATCH"}) {
  const graph = new Graph<Function>()
  graph.add_edge(code, exported_lib)
  return run_multi_inline_test(code, graph, spec)
}

async function setup_multi_inline_test(code: Function,
                                       lib_graph: Graph<Function>) {
  const tmpdir = await mkdtemp(join(__dirname, '../tests/tmp_files/test_'))

  // Walk the requires graph and generate code for each edge in the graph.
  const code_map = new Map<Function, String>()
  const foot_map = new Map<Function, boolean>()
  lib_graph.walk(code, (from, to) => {
    for (let node of [from, to]) {
      let code_txt = code_map.get(node)
      if (!code_txt)
        code_txt = ''

      // We only want to visit the footer once, since there will only be one,
      // unlike the header which will add a require statement for each adjancent
      // edge).
      if (!foot_map.has(node)) {
        if (node !== code) {
          code_txt = code_txt + `
          module.exports = (${node.toString()})()`
        } else if (node === to) {
          throw new Error('Code node should have a zero in-degree')
        } else {
          // No exports for the main script
          code_txt = code_txt + `
          fn = ${code.toString()}
          fn()
          `
        }
        foot_map.set(node, true)
      }

      if (node === from) {
        const code_file = join(tmpdir, `test_${to.name}.js`)
        code_txt = `const ${to.name} = require("${code_file}")\n` + code_txt
      }
      code_map.set(node, code_txt)
    }
  })

  for (let [code_fn, code_txt] of code_map.entries()) {
    const lib_file = join(tmpdir, `test_${code_fn.name}.js`)
    await writeFile(lib_file, code_txt)
  }

  const code_file = join(tmpdir, `test_${code.name}.js`)
  return code_file
}

/** Run an inline test
  *
  * With this, you can define a library, write some code-to-be-run, and run the whole thing
  * from one function.
  *
  * I think for very small tests, this will be much clearer than having to have a seperate
  * folder for each test a la run_file_test
  *
  * @param {Function} code: The code to make use of lib. Should be a single function to
  * be run
  *
  * @param {Graph<Function>} lib_graph: The requires dependency graph including code and
  * all libs.
  *
  * @returns output of mir from running `code`
  */
export async function run_multi_inline_test(code: Function,
                                            lib_graph: Graph<Function>,
                                            spec: RunSpec = {mode: "BATCH"}) {

  const code_file = await setup_multi_inline_test(code, lib_graph)
  return await run_test(code_file, spec)
}

export async function setup_run_code(code: Function) {
  const code_file = await gen_temp_file("test_code.js")

  const code_txt =
  `const fn = ${code.toString()}
  const out = fn()
  if (out instanceof Promise) {
    out.catch(err => {throw err})
  }
  `
  await writeFile(code_file, code_txt)
  return code_file
}

/**Like run_inline_test, but no library component
 *
 * If we're just testing external libraries, this seems like the way to go
 */
export async function run_code(code: Function,
                               spec: RunSpec = {mode: "BATCH"},
                               cwd: string | null = null) {
  const code_file = await setup_run_code(code)
  return await run_test(code_file, spec, cwd)
}

/** Returns the path to a file belonging to the passed test */
export function get_path_to_test_file(test_name: string, file_name: string) {
  return join(__dirname, "../tests/test_files", test_name, file_name)
}

/** Run a test using real files
  *
  * With this method, you can run mir on a file in the filesystem. For now at least,
  * it assumes that all file tests are in the tests directory. The name of the test
  * should be the name of the directory containing all the test files, and the entry
  * point for the test should be called 'code.js'. All of these assumptions can be
  * relaxed as necessary
  *
  * @param {string} test_name: name of the test to be run
  * @returns output of mir from running the test
  */
export async function run_file_test(test_name: string,
                                    code_file: string = "code.js",
                                    spec: RunSpec = {mode: "BATCH"}) {
  const code_path = get_path_to_test_file(test_name, code_file)
  return await run_test(code_path, spec)
}

export async function run_library_test(test_name: string,
                                       test_file: string,
                                       subdir: string | null = "test",
                                       spec: RunSpec = {mode: "BATCH"}) {
  var code_dir = join(library_tests_path, test_name)
  if (subdir) {
    code_dir = join(code_dir, subdir)
  }
  const code_path = join(code_dir, test_file)
  return await run_test(code_path, spec)
}

export function sleep(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * Generates a path to a file that will live under a new temporary directory
 * in 'tmp_files'.
 *
 * @param filename name of file
 * @returns full path to filename
 */
export async function gen_temp_file(filename: string = "results.json") {
  const tmpdir = await mkdtemp(join(__dirname, '../tests/tmp_files/test_'))
  const tmp_file = join(tmpdir, filename)
  return tmp_file
}

export async function consume_child_version(filename: string) {
  const files = await readdir(dirname(filename))
  const childStart = filename + "_child"
  const childVersions = files.filter((file) => file.startsWith(childStart))

  if(childVersions.length != 1) {
    throw Error(`ChildVersions != 1. Did you forget to clean up? ${childVersions}`)
  }

  const child = childVersions[0]

  const txt = await readFile(child, {encoding: "utf-8"})
  await rm(child)
  return txt
}
