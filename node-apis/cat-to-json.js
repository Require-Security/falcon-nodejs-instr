#! /usr/bin/env node
'use strict';
const fs = require ('fs');
const util = require ('util');
const child_process = require ('child_process');
const { parseCatFile } = require("../dist/utils/cat_to_js")

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

/** Async main so we can use await **/
async function mymain(files) {
  try {
    for (const file of files) {
      const libinfo = await parseCatFile(file)

      // write out the json file
      const jsonstr = JSON.stringify (libinfo, null, 2);
      fs.writeFileSync (file + ".json", jsonstr);
    }


  } catch (error) {
    console.log ("error: ", error);
  }
  return ("done");
}

function usage (format, ...args) {

  console.log (util.format (format, ...args));
  console.log ("usage: cat-to-json.js <input-file> [options]");
  console.log ("  --debug           - emit debug messages to the console");
  console.log ("Reads a category file and writes a corresponding json file");
  console.log ("The JSON file is named <input-file>.json");
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


}
