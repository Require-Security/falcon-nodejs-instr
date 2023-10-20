# High-level Overview of NodeJS Agent

## **`reqsec-nodejs.ts`**
This is the initial entry point.  The CLI is implemented using the NPM
module yargs and currently has two commands: learn and enforce.  Each
has its own options.  The common options are defined as separate
objects to enable sharing between the arguments.

When parsing arguments a bunch of global state is set (see `global_state.ts`
below). And, more importantly, `setupLoaderProxy` is called:

This is the meat of what `reqsec-nodejs` actually does. When `setupLoaderProxy`
runs, it overwrites `Module._load` with a proxy. That proxy is what will
actually instrument require-ed libraries. See below for more detail.


## **`loader_proxy.ts`**

`loader_proxy.ts` has one function in it: `setupLoaderProxy`. `setupLoaderProxy`
overrides `Module._load` with a proxy.

`Module._load` is the node internal function that actually takes a piece of
required code and parses it into a Javascript module, which can actually be used
by the rest of the code. It is called by `require` and can be called directly
with absolute paths. (XXX: is Module._load called by import? If so, import is solved...)

We overwrite `Module._load` with a proxy. The proxy handler only does anything
on `apply`. When the proxied load is called, we first normalize the path (so
`"node:fs"` and `"fs"` register as the same thing), and then check our
`proxySpec` (see `global_state.js`).

If the loaded item is a builtin or if we have a proxySpec for it, we proxy the
loaded value with our default proxy. This means we proxy all the builtins as
they are loaded. And, if we were to write a spec for a specific non-builtin
library, we would proxy that too.

Note that events are handled separately: a call to `require('events')` will
get `eventEmitterProxy` instead of the default proxy

## **`proxy.ts`**
`proxy.ts` is where our 'default' proxy handlers live. These are introduced by
our loader proxy.

### Default Proxy
`getDefaultProxy` is the function that actually proxies the returned value.
Unlike the require proxy, the default proxy has three handlers: `get`, `apply`,
and `construct`

`construct` and `apply` do the same thing, and are dead simple: they call
`noteAccess` (see `privilege_data.ts`), and then forward their original call.

`get` is a bit more complex, but its function is very simple: it propagates
proxies as properties are accessed. So `fs` comes out proxied from require. The
get handler ensures that `fs.promises` is proxied in the same was as `fs`, which
ensures that `fs.promises.open` is proxied the same way again. Then, when
`fs.promises.open` is called, the apply handler is called and `noteUseage` is
called, and that's how we actually log things.

We do not proxy functions that are considered safe, so anything proxied will be
noted.

<!-- If we have a proxy for `fs`, and we are trying to get `fs.promises`, the get
handler will first check to see if `fs.promises` is a method or a namespace (or
unknown). Since it is a namespace, we will return a proxy of `fs.promises` with
a reference to `fs.promises`'s **spec** (see `global_state.ts`, again):

`getDefaultProxy` takes a reference to the object-to-be-proxied and the
proxySpec for that object. ProxySpecs are hierarchical maps, so for example.
`fs` has a map which has an entry for `promises`. That entry is, itself, a map
which will have references for `open`, `write`, etc.

So getting `fs.promises` will result in a proxy with a reference to
`fs.promises`'s proxySpec. If we then get 'open' from `fs.prom -->

## **`privileges_data.ts`**

This module is responsible for tracking and checking privileges on use
of proxied call.  Privilege data has two uses, first to set up the
logging and logging appenders that are associated with privilege
calculation (training) and event (both train and protect).  There is a
notion of a log appender, right now there are two types of appenders,
file and socket.  And each can be attached to either a privilege logger
or an event logger.  This is done from `reqsec-nodejs.ts` after command
line args are parsed.

The second responsibility is to note accesses of proxied function.
`noteAccess` is called by the default proxy whenever a call we care
about is hit. It is where actual logging/enforcement happens:

First, we get the enforcement spec, the stack trace, and the library trace.

If the enforcement spec does not exist, we're in learning mode. In training
mode, we save the privilege and log the event if logging is set up.

If the enforcement spec does exist, we look up the specific privilege for the
call in question and check its privileges. If the privilege is valid, no
action is taken. If the privilege is invalid, we log a privileges violation,
and then either throw (to block the call) or not based on `blockSensitivity`.

## **`global_state.ts`**
Contains command line arguments, mostly:

### Command Line Arguments ###
`LOG_THRESHOLD` is the severity at which to log calls

`THROW_THRESHOLD` is the severity at which to throw an error on privileges violations

`ENFORCE_FROM` is either null (in training mode) or the enforcement spec

### Enforcement ###
When running in enforcement mode, we take a file of the form `{<name>:
[lib_trace_1, lib_trace_2]}` (where `<name>` is a string ("fs") and
`lib_trace_1` would be `["http_server.js", "../node_modules/esprima"]` or
something).

parseEnforcementFile turns this into an `EnforcementRecord`, which maps those
same names to a set of symbol-ized library traces. Symbol-izing the library
traces allows them to be compared with `==`, since identical arrays-of-strings
do not register as equal

### Shadow stack
The shadow stack for events is set up in `init`. This should also probably be its
own file. There is one shadow stack for each asyncID (effectively thread ID). Shadow
stack construction is part of `event_handlers.ts`

## **`proxy_specs.ts`**
This file defines the sensitivity specs. The `.cat` files in `node-apis` are
turned into `.json` files via `cat-to-json.js`. Those json files are consumed by
`loadProxySpecs`

`loadProxySpecs` iterates over each json file and creates a hierarchy of
`Spec`s from them. The root of the hierarchy is `TOP_LEVEL_SPEC`. From there,
each library is a `Namespace` spec, and each `Namespace` contains other
`Namespace`s or `Method`s. If we ever try to get the spec for something
unlisted, we return an `Unknown` spec

## **`others`**
`event_handlers.ts` handles event handlers. 
`test_util.ts` defines test methods. `shadow_stack.ts` defines the shadow stacks
used by event handlers.

The specifics of all of these are outside the scope of this overview document
