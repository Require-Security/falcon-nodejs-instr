#! /usr/bin/env node
'use strict';
const https = require ('https');
const fs = require ('fs');
const readline = require ('readline');
const util = require ('util');
// const {google} = require ('googleapis');
// const aa_auth = require ('aa_auth.js');
const child_process = require ('child_process');
const path = require ('path');

let debug = false;
let twosix = false; // push updates to two six.
let update = false; // update the local exploit repositories
let repomatch = undefined;
let maxrepo = 0;    // maximum number of repos to process -- 0 = all
// let exploit_repo_dir = fs.realpathSync("../../exploit_repos");
let twosix_base = "git@gitlab.haccs.twosix.local:";

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

// This fails saying default creds are not setup.
async function default_creds() {

  const auth = new google.auth.GoogleAuth({
  // Scopes can be specified either as an array or a space-delimited string.
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
  ],
  });

  const authClient = await auth.getClient();
  google.options ({auth: authClient});
  return authClient;
}

/**
 * Get service credentials so that we can read public spreadsheets.
 * This follows https://stackoverflow.com/questions/58565907
 * It returns the google.auth.JWT, but this shouldn't need to be used
 * as it also sets this up with google options as the default authorization.
 * Note that service authorization is setup and manged from
 * https://console.cloud.google.com.  We are using the one I originally
 * created for buda (noble-stratum-174119).  It should be easy enough to
 * create a new one if need be.
 *
 * Note that there is an email associated with this account (it is in
 * the client_secret2.json file.  I think if a spreadsheet is shared with
 * this email that it might not need to be public.
 */

async function service_creds() {

  // Read our service credentials
  const creds_txt = fs.readFileSync ("./credentials/client_secret2.json",
                                     'utf-8');
  const creds = JSON.parse (creds_txt);

  // console.log ("client_secret: ", client_secret);

  let jwtClient = new google.auth.JWT(
     creds.client_email,
     null,
     creds.private_key,
     ['https://www.googleapis.com/auth/spreadsheets']);
  console.log ("service JWT");

  //authenticate request.  Note that the documentation for authorize says
  // that it returns Credentials (google-auth-library/Credentials), but
  // as below, it works when you pass the JWT as auth and not the returned
  // credentials.
  let auth = await jwtClient.authorize();
  google.options ({auth: jwtClient});
  console.log ("service authenticate");
  
  return jwtClient;
}    

class Exploit {

  constructor (cve, vuln_class, target, repo, works, delivered, notes) {
    if (cve.includes ("(Zero day) "))
      cve = cve.replace (/[(]Zero day[)] */i, 'CVE-0000-');
    this.cve = cve;
    this.vuln_class = vuln_class;
    this.target = target;
    this.repo = repo;
    this.works = (works == 'TRUE');
    this.delivered = (delivered == 'TRUE'); // previous to phase 3??
    this.notes = notes;
  }

  /** returns whether or not this exploit is marked bad in the spreadsheet **/
  bad() {
    return this.notes && this.notes.toLowerCase().startsWith ("bad");
  }

  /** returns the repo path for use with ssh clone **/
  ssh_repo() {
    return this.repo.replace ("https://gitlab.com/", "git@gitlab.com:");
  } 

  toString() {
    if (this.repo)
      return path.basename(this.repo);
    else
      return this.cve;
  }

  /** return a fixed-width string for the exploit **/
  str_fw() {
    let repo = '';
    if (this.repo)
      repo = 'repo';
    return (util.format ("%s %s %s %s %s", this.cve.padEnd(40),
                         this.vuln_class.padEnd(15), repo.padEnd(6),
                         this.works, this.delivered));
  }
  
}

/** returns the remotes for the repository with the specified path **/
function git_remotes(path) {

  const result = exec ({cwd: path}, "git remote");
  return result.split (/(\s+)/);
}

function git_branches (path) {

  const result = exec ({cwd: path}, "git branch");
  return result;
}
  

// Returns a the contents of the specified URL.  throws an error
// for common networking issues.  Doesn't currently check for content
// type.
async function read_url (url) {

  return new Promise ((resolve, reject) => {
    let request = https.get (url, response => {
      if (response.statusCode !== 200) {
        reject (new Error (`HTTP Status ${response.statusCode}`));
        response.resume();
      } else { 
        log ("content-type = ", response.headers['content-type']);
        let body = "";
        response.setEncoding('utf-8');
        response.on ('data', chunk => {body += chunk;});
        response.on ('end', () => {
          resolve (body);
        });
      }
    });
    request.on ('error', error => { reject (error); });
  });
}

// returns a string of params in the form name:type, ...
// Any spaces in type are removed
function params_txt (params) {

  if (!params) return "";
  let parr = [];
  for (const p of params) {
    const pstr = util.format ("%s : %s", p.name, p.type.replace (/\s+/g, ''));
    parr.push (pstr);
  }
  return parr.join (", ");

}

// returns a string describing a method from the Node API JSON method
function method_txt (method) {

  let sig_strs = []
  const name = method.name;
  // log ("processing method ", name);
  // log ("method = ", method);
  const signatures = method.signatures;
  for (const sig of signatures) {
    // log ("sig = ", sig);
    let return_type = "[unknown]";
    if (sig.return)
      return_type = sig.return.type;
    const param_str = params_txt (sig.params);
    const sig_str = util.format ("%s (%s) : %s", name, param_str, return_type);
    sig_strs.push (sig_str);
    }
  return sig_strs.join ("\n");

  // return method.textRaw;
}

// returns an  array of strings containing the class, any embedded classes
// and the methods in that class.
function class_txt (clss, category, indent = "") {

  let output = [];

  log ("processing class ", clss);
  log ("signatures: ", clss.signatures);
    // log ("  sig: ", sig);
  let str = "";
  output.push (indent + "class " + clss.name);
  if (clss.signatures) 
    for (const sig of clss.signatures)
      output.push (indent + util.format ("  %s constructor (%s)",
                                         category, params_txt (sig.params)));
  if (clss.methods) {
    for (const m of clss.methods)
      output.push (util.format ("%s  %s %s", indent, category, method_txt (m)));
  }
    
  if (clss.classes) {
    for (c of clss.classes) 
      output.push (...class_txt (c, indent + "  "));
  }
  output.push (indent + "end-class " + clss.name)
  return output;
}

// returns an array of strings describing the module
async function process_module (module, name, category, indent) {

  let output = [];

  output.push (indent + "module " + module.name);
  if (module.modules)
    log ("  .modules = ", module.modules.map(a => a.name));
  if (module.classes) {
    log ("  .classes = ", module.classes.map (a => a.name));
    for (const clss of module.classes) {
      output.push (...class_txt (clss, category, indent + "  "));
    }
  }
  if (module.methods) {
    log ("  .methods = ", module.methods.map (a => a.name));
    for (const method of module.methods) {
      if (module.name === "promises_api")
        output.push (util.format ("%s  %s promises.%s", indent, category,
                                  method_txt (method)));
      else
        output.push (indent + "  " + category + " " + method_txt (method));
      }
  }
  
  if (module.properties) 
    log ("  .properties = ", module.properties.map (a => a.name));
  output.push (indent + "end-module " + module.name);
  return output;
}

async function process_library (url, name, category) {

  let output = [];

  const contents = await read_url (url);
  log ("contents = ", contents.slice(0,200));
  const parsed = JSON.parse(contents);
  log (Object.keys (parsed));  
  // log ("modules = ", parsed.modules);

  for (const module of parsed.modules) {
    output.push ("module " + module.name);
    if (module.modules) {
      log ("  .modules = ", module.modules.map(a => a.name));
      for (const m of module.modules) {
        const pmarr = await process_module (m, name, category, "  ")
        if (pmarr.length > 2)
          output.push (...pmarr);
      }
    }
    if (module.classes) {
      log ("  .classes = ", module.classes.map (a => a.name));
      for (const clss of module.classes) {
        output.push (...class_txt (clss, category, "  "));
      }
    }
    if (module.methods) {
      log ("  .methods = ", module.methods.map (a => a.name));
      for (const method of module.methods) {
        output.push ("  " + category + " " + method_txt (method));
      }
    }
    if (module.properties) 
      log ("  .properties = ", module.properties.map (a => a.name));
    output.push ("end-module " + module.name);
  }
  return output;

}

/** Async main so we can use await **/
async function mymain(urls, category) {

  try {

    // fill in category defaults
    if (!category)
      category = "unspec-0"
    if (!category.includes ("-"))
      category = category + "-0";
    
    for (let url of urls) {
      
      // Take the nodejs.org version if a URL is not specified.
      let libname = null;
      if (url.includes ("://"))
        libname = path.basename (url, ".json")
      else {
        libname = url;
        url = "https://nodejs.org/api/" + url + ".json";
      }
      
      let output = await process_library (url, "fs", category);
      const outfile = libname + ".cat";
      console.log ("writing output", outfile);
      fs.writeFileSync (outfile, output.join('\n'));
    }
    
  } catch (error) {
    console.log ("error: ", error);
  }
  return ("done");
}

async function mylog (str) {

  console.log ("mylog: ", str);
  return true;
}

async function test() {

  console.log ("intest");
  return "test-result";
}

function usage (format, ...args) {

  console.log (util.format (format, ...args));
  console.log  ("usage: get_apis.js <urls> [options]");
  console.log ("  <urls>        - json URLS to process");
  console.log ("  --debug       - debug flag");
  console.log ("  --type <type> - Specifies the default type of operations ");
  console.log ("Creates initial category files for the specified node.api");
  console.log ("The node.api specified in a json file at nodejs.org");
}

{
  let urls = [];
  let category = null;
  
  // Process arguments
  for (let i = 2; i <  process.argv.length; i++) {
    let arg = process.argv[i];
    if (arg === "--debug")
      debug = true;
    else if (arg == "--type") {
      i++;
      category = process.argv[i];
      repomatch = process.argv[i]
    } else if (arg.startsWith ("-")) {
      usage("Unknown argument %s", arg);
      return;
    } else { // must be a file name
      urls.push (arg)
    }
  }

  // log the module path
  if (debug) console.log ("paths = ", module.paths);
 
  // Put the main program in an async function so we can use await
  try {
    mymain(urls, category)
      .then (str => console.log("Completed mymain: ", str))
      .catch (console.error)
      .finally (() => console.log ("finally from mymain"));
  } catch (error) {
    console.log ("main err: ", error);
  }

  log ("after async main call (mymain not finished)");

}
