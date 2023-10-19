#! /usr/bin/env node
'use strict';
const https = require ('https');
const fs = require ('fs');
const readline = require ('readline');
const util = require ('util');
const child_process = require ('child_process');
const path = require ('path');
const { assert } = require('console');

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

class LibInfo {

  constructor (name) {
    this.name = name;
    this.modules = [];
    this.classes = []
    this.methods = []
  }
}

class ModInfo {

  constructor (name) {
    this.name = name;
    this.modules = [];
    this.classes = []
    this.methods = []
  }
}

class ClassInfo {
  constructor (name, parent) {
    this.name = name;
    this.parent = parent
    this.methods = []
  }
}

class MethodInfo {

  constructor (kind, level, name, signature) {
    this.kind = kind;
    this.level = Number(level);
    this.name = name;
    this.signature = signature;
  }
}

/** Async main so we can use await **/
async function mymain(files) {

  try {
    for (const file of files) {
      const input = fs.readFileSync (file, "utf8").split ("\n");
      let libinfo = null;
      let modinfo = null;
      let classinfo = null;
      for (let line of input) {
        line = line.trim();
        if (!line) {
          continue;
        }
        const toks = line.split (/\s+/);
        // log ("toks = %s", toks);
        if (line.startsWith("module")) {
          if (!libinfo) {
            libinfo = new LibInfo (toks[1]);
          } else { // embedded module
            modinfo = new ModInfo (toks[1]);
            libinfo.modules.push (modinfo);
          }
        } else if (line.startsWith ("class")) {
          let parent = null
          if (toks[2] == "extends") {
            parent = toks[3]
          } else if (toks[2] !== undefined) {
            throw Error("After class should only be 'extends'")
          }
          classinfo = new ClassInfo (toks[1], parent);
          if (modinfo)
            modinfo.classes.push (classinfo);
          else
            libinfo.classes.push (classinfo);
        } else if (line.startsWith ("end-class")) {
          classinfo = null;
        } else if (line.startsWith ("end-module")) {
          modinfo = null;
        } else { // must be a method definition
          let [kind, level] = toks[0].split ("-");
          let rest = toks.slice(1)
          let matchName = /([\[\]a-zA-Z0-9_\.]+)\s*(.*)/
          let m = rest.join(" ").match(matchName)
          assert(m, `Failed to match ${rest}`)
          const mi = new MethodInfo (kind, level, m[1], m[2]);
          if (classinfo) {
            classinfo.methods.push (mi);
          } else if (modinfo) {
            modinfo.methods.push (mi);
          } else {
            libinfo.methods.push (mi);
          }
        }
      }

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
