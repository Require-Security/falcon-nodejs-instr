# Node API Categorization

This directory contains tools for extracting items to be categorized and
the categorizations.  Categorization files use the suffix `.cat`.  For
example, `fs.cat` and `https.cat`.  It also contains a tool (cat-to-json)
that translates category files into json.

The tool `get_apis.js` extracts the items in a library using the json file
for node documentation.  The library to extract and the default category are
currently hard-coded.

Categorizations are of the form *type*-*level* where *type* is the kind of
the call (eg, network, http, exec, file, etc) and *level* is the sensitivity
level (0-3) where 0 is safe, 1 is minimally sensitive (eg, reading a files
attributes, 2 is sensitive (opening a file), and 3 is dangerous (eval,
executing system(), etc).

Each function is defined by the *type*-*level* followed by the function name,
its parameters and their types (in parens) followed by `:` and the
return type.  Promises are defined as `promise<type>` when the resolved
type is known.

There is a list of categorization [issues](issues.md)

## Sensitivity Levels

* 0: Only touches local program state, does not touch outside-process
world

* 1: Low-sensitivity read system (outside-process) metadata
  (hostname, cpus, perms)

* 2: Read any > 1 outside-process information

* 3: Write outside process resource

* 4: Exec, fork, spawn, system

## Current Categories

type - action

Types (general-info):

* file
* file-metadata
* http
* https
* net
* net-metadata
* host? 
* host-metadata
* process
* process-metadata

Action:

* read
* write
* exec
* open
* delete
* close

* file: open, read, write, read / write info on file (currently we
  don't trace reads and writes)

* file-metatdata: 

* http: create, read, write an http connection

* https: create, read, write https connection

* host_info_read: reading host information

* net_info_read: reading network information

## Naming Conventions

**NOTE** The following conventions simply describe the current implementation.
There is a lot of room for improvement, so don't feel discouraged from
complaining about them.

The following conventions should be followed when naming Classes:
- The name of the class *should not* include the name of the top-level
module that it belongs to. That part will be discovered as part of
parsing the category file. For example, `fs.Dir`'s name should be
`Dir`.
- The name of the class *should* (at least for now) include the name
of any submodules that it belongs to. For example, `FileHandle's`
name is `promises.FileHandle`. In an ideal world this should also
be discoverable like the top-level module, but the way the category
files are currently organized and generated doesn't lend itself
to that.

The following conventions should be followed for references to Classes:
- Any references to the class *should* use a fully qualified name,
so going back to `FileHandle`, it should be `fs.promises.FileHandle`,
not `promises.FileHandle` nor `FileHandle`.

## JSON format

The json file contains the classes defined in cat-to-json.js.  These classes
are:

  - **LibInfo**: top level of a library
  - **ModInfo**: modules within a library.  These 'modules' are defined in the
    json version of the API documentation.  They divide up the various methods
    in the module (e.g., promise versions versus  callback versions).  Sometimes
    a set of methods is returned by a different method/getter at the top
    level of the library.
  - **ClassInfo**: Classes within a library/module
  - **MethodInfo**: Methods including their type and level.

See the class constructors for information on what is contained in each class.


