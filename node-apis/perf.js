#! /usr/bin/env node
'use strict';
const https = require ('https');
const fs = require ('fs');
const readline = require ('readline');
const util = require ('util');
const child_process = require ('child_process');
const path = require ('path');
const ts = require('typescript');

const stacks = [];
const func_results = [];  // place to put results from timed functions to makes sure they are executed

// const errors = require ('error');

let debug = false;

/** log when debug is on **/
function log (format, ...args) {
  if (debug)
    console.log (util.format (format, ...args));
}

/** execute command with sprintfs style args **/
function exec (obj, format, ... args) {

  const cmd = util.format (format, ...args);
  log ("executing cmd: %s (%s)", cmd, obj);
  return child_process.execSync (cmd, obj).toString();
}

/** execute command and sends any output to the current stdout/stderr **/
function exec_pt (obj, format, ...args) {
  if (obj) 
    obj.stdio = 'inherit';
  else
    obj = {stdio: 'inherit'};
  const cmd = util.format (format, ...args);
  let objstr = util.format ("%s", obj);
  if (objstr)
    objstr = objstr.replace (/\n/g, " ");
  log ("executing cmd: %s %s", cmd, objstr);
  child_process.execSync (cmd, obj)
}

function readonly (cnt) {

  const contents = [];
  for (let i = 0; i < cnt; i++) {
    const filename = "/tmp/jstest" + i.toString().padStart (4, '0')
    const xx = fs.readFileSync (filename);
    contents.push (xx);
  }
  return contents;
}

function read_and_stacktrace (cnt) {

  const contents = [];
  for (let i = 0; i < cnt; i++) {
    stacks.push (new Error().stack);
    const filename = "/tmp/jstest" + i.toString().padStart (4, '0')
    const xx = fs.readFileSync (filename);
    contents.push (xx);
  }
  return contents;
}

function writeonly (cnt) {

  for (let i = 0; i < cnt; i++) {
    const filename = "/tmp/jstest" + i.toString().padStart (4, '0')
    fs.writeFileSync (filename, filename + "contents\n");
  }

}

function writeonly_proxy (cnt) {

  const p = setup_proxy (fs.writeFileSync, "writeFileSync");
  
  for (let i = 0; i < cnt; i++) {
    const filename = "/tmp/jstest" + i.toString().padStart (4, '0')
    p (filename, filename + "contents\n");
  }
}

function write_and_err (cnt) {

  for (let i = 0; i < cnt; i++) {
    stacks.push (new Error());
    const filename = "/tmp/jstest" + i.toString().padStart (4, '0')
    fs.writeFileSync (filename, filename + "contents\n");
  }

}

function write_and_stacktrace (cnt) {

  for (let i = 0; i < cnt; i++) {
    stacks.push (new Error().stack);
    const filename = "/tmp/jstest" + i.toString().padStart (4, '0')
    fs.writeFileSync (filename, filename + "contents\n");
  }

}

function setup_proxy (func, name) {

  const handlers = {
    apply(target, receiver, args) {
      stacks.push (new Error());
      // console.log ("proxy: ", name, args);
      return Reflect.apply (target, receiver, args);
    }
  };

  return new Proxy (func, handlers);
}

function cleanwrites() {

  exec_pt (null, "/bin/rm -f /tmp/jstest*");
}

function pad (i, size, ch = ' ') {

  return i.toString().padStart(size, ch);
}

function timer (tfunc, cnts, cfunc = null) {

  let times = [];
  for (const cnt of cnts) {
    if (cfunc)
      cfunc();
    const start = process.hrtime.bigint()
    const xx = tfunc (cnt);
    func_results.push (xx);
    const stop = process.hrtime.bigint();
    // const duration = (stop - start) / 1000n;
    // const iter_duration = duration / BigInt (loop);
    times.push ({cnt: cnt, start: start, stop: stop});
  }
  return times;
}

function dump_times (msg, results) {

  console.log ("Times for ", msg, " in usecs");
  for (const result of results) {
    const duration = (result.stop - result.start) / 1000n;
    const iter_duration = duration / BigInt (result.cnt);
    console.log (pad (result.cnt, 5), pad (duration, 8),
                 pad (iter_duration, 5));
  }
}

/** Async main so we can use await **/
async function mymain (filenames) {

  try {

    const iterations = [5, 100, 200, 300]

    let results = timer (writeonly, iterations, cleanwrites);
    dump_times ("Writes Only", results);

    results = timer (writeonly_proxy, iterations, cleanwrites);
    dump_times ("Writes Only Proxy", results);

    results = timer (write_and_err, iterations, cleanwrites);
    dump_times ("Writes and Capture Error", results);

    results = timer (write_and_stacktrace, iterations, cleanwrites);
    dump_times ("Writes and Capture stack", results);

    results = timer (readonly, iterations);
    dump_times ("Reads Only", results);

    results = timer (read_and_stacktrace, iterations);
    dump_times ("Read and stacktrace", results);

    // read_ts (filenames[0]);

  } catch (error) {
    console.log ("error: ", error);
  }
  return ("done");
}

function usage (format, ...args) {

  log (format, ...args);
  log ("usage: test_ss.js [options]");
  log ("  --update          - update the repos from Aarno gitlab");
  log ("  --twosix          - update TwoSix repos from the repos");
  log ("  --maxrepo cnt     - process the first <cnt> repos");
  log ("  --repomatch str   - process repos that match <str>");
  log ("Copies Aarno gitlab exploit repos to local space and then pushes");
  log ("them to the TwoSix gitlab.  List of repos is controlled by the ");
  log ("Phase 3 exploit spreadsheet");
}

{
  let files = [];
  
  // Process arguments
  for (let i = 2; i <  process.argv.length; i++) {
    let arg = process.argv[i];
    if (arg === "--debug") {
      debug = true;
    } else if (arg.startsWith ("-")) {
      usage("Unknown argument %s", arg);
      return;
    } else { // must be a file name
      files.push (arg)
    }
  }

  // log the module path
  console.log ("paths = ", module.paths);
  // console.log ("aa_auth = ", aa_auth);
 
  // Put the main program in an async function so we can use await
  try {
    mymain(files)
      .then (str => console.log("Completed mymain: ", str))
      .catch (console.error)
      .finally (() => console.log ("finally from mymain"));
  } catch (error) {
    console.log ("main err: ", error);
  }

  log ("after async main call (mymain not finished)");

}
