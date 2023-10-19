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


/**
 * Returns a proxy for the FileHandle specified in obj.  That proxy
 * will intercept get requests.  Requests for 'chmod' and 'chown'
 * will return a function proxy.  All others are passed through
 * unmodified
 */
function setup_filehandler_proxy (obj) {

  const handlers = {
    get (target, prop, receiver) {
      console.log ("fh proxy get: ", prop);
      const result = Reflect.get (...arguments);
      if ((prop === "chmod") || (prop === "chown"))
        return setup_func_proxy (result, prop);
      else
        return result;
    }
  }
  return new Proxy (obj, handlers);
}

/**
 * Returns a proxy for the specified function with the specified name.
 * The proxy will log requests to the console.  If the proxied function
 * is fs.promises.open it will set that up to proxy the return value
 * (the FileHandle)
 *
 * Note the line that returns the FileHandle proxy returns 'result.then...'
 * I think what is happening here is that 'result.then' will return a
 * promise for the function that calls 'setup_filehandler_proxy'.  When
 * that promise is fulfilled, it will have the proxy associated with it.
 */
function setup_func_proxy (func, name) {

  const handlers = {
    apply(target, receiver, args) {
      // stacks.push (new Error());
      console.log ("proxy function: ", name, args);
      const result = Reflect.apply (target, receiver, args);
      if (name === "fs.promises.open") {
        console.log ("setting up proxy on FileHandle");
        // result.then takes up to two arguments: callback functions for the
        // fulfilled and rejected cases of the Promise. It immediately
        // returns an equivalent Promise object, allowing
        // you to chain calls to other promise methods.
        // What we're doing here then is have setup_filehandler_proxy be called
        // once the promise is fulled with the object that was wrapped by the
        // promise.
        // XXX: Should we also proxy the rejected case?
        console.log(`result is ${result}`);
        return result.then ((o) => {
          return setup_filehandler_proxy (o);
        })
      } else {
        return result;
      }
    }
  };

  return new Proxy (func, handlers);
}

/** Async main so we can use await **/
async function mymain (filenames) {

  try {

    // Create a proxy for fs.promises.open and get the returned filehandle
    const p = setup_func_proxy (fs.promises.open, "fs.promises.open");
    const fh = await p ("/tmp/test.txt", 'r');
    console.log ("file handle", fh);

    // Try reading a file through the FileHandle
    const contents = await fh.readFile ({encoding : "utf8"});
    console.log ("contents:", contents);

    // Call chmod through the FileHandle
    await fh.chmod (0o777);

  } catch (error) {
    console.log ("error: ", error);
  }
  return ("done");
}

function usage (format, ...args) {

  console.log (format, ...args);
  console.log ("usage: proxy_promise.js");
  console.log ("Tries out a proxy on fs.promises.open() and the FileHandle");
  console.log ("it returns");
}

{
  console.log ("starting");

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
