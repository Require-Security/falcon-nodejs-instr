// Copyright 2023, Require Security Inc, All Rights Reserved
/** Proxy for Module._load
 *
 * When setupLoaderProxy is called, it overwrites Module._load with a proxy. The
 * proxy only has an apply handler, since we are just concerned with calls to
 * Module._load.
 *
 * Module._load is the node internal function that actually takes a piece of
 * required code and parses it into a Javascript module, which can actually be
 * used by the rest of the code. It is called by `require` and can be called
 * directly with absolute paths.
 *
 * (XXX: is Module._load called by import? If so, import is solved...)
 *
 * When the proxy is in place, Module._load will load the requested module.
 * Then:
 *
 * If Module._load was called from our code (parent.filename.startswith...),
 * we return the loaded module, unmodified.
 *
 * If the module is special-cased (so "events" so far), we return our
 * special case proxy.
 *
 * If the module is something we have a spec for, then proxy it according
 * to its spec.
 */

import path = require("path")
import fs = require("fs")
import { eventEmitterProxy } from "./event_handlers"
import { loggingEvents, lookupProxy, State } from "../global_state"
import { getDefaultProxy } from "./default_proxy"
import { getProxySpec } from "../proxy_specs/proxy_specs"
import { instrumentationDirectory, nodeModulesDirectory } from "../utils/constants"
import { logEvent, logString } from "../loggers"
import { isBuiltin } from "../utils/misc"
import { createRequire } from "module"

// Have to use raw require because typescript wraps its imports
// so you can't 'accidentally' overwrite builtin parameters
const M = require("node:module")

// Request is the requested module
// Parent is the filename of the module this was called from.
// isMain checks to see if the parent was the entry point, I think?
type LoaderFunction = (request: string, parent: string, isMain: boolean) => object

export function setupLoaderProxy() {
  const handler = {
    apply(target: LoaderFunction, self: object, args: [string, NodeModule, boolean]) {
      const [request, parent, isMain] = args
      // If we're called from our code, don't proxy
      if(parent &&
         parent.filename &&
        (parent.filename.startsWith(instrumentationDirectory) ||
         parent.filename.startsWith(nodeModulesDirectory))) {
       return Reflect.apply(target, self, args)
      }

      logModuleLoad(request, parent?.filename, isMain)

      const loaded = Reflect.apply(target, self, args)

      const moduleName = request.replace(/^node:/, "")
      if(moduleName == "events") {
        return eventEmitterProxy()
      }

      const proxySpec = getProxySpec(moduleName)
      if (!proxySpec) {
        return loaded
      }

      // If the entire module is ignore, ignore it
      if(proxySpec.category == "IGNORE") {
        return loaded
      }

      // If the entire module is less than eventThreshold, ignore it if
      // we're not tracing unknowns. If we are tracing unknowns, there
      // could be an unknown method with level > event threshold
      if(!State().traceUnknownBuiltins &&
         proxySpec.level < State().eventThreshold) {
        return loaded
      }

      if(isBuiltin(moduleName)) {
        return getDefaultProxy({obj: loaded, proxySpec: proxySpec})
      }

      // Since we don't expect this, throw for now so we know if something
      // weird is happening
      if(proxySpec.kind != "Unknown") {
        throw Error("To support proxying user libs, remove " +
                    "this and uncomment out the line below")
        // return getDefaultProxy({obj: loaded, proxySpec: proxySpec})
      }

      return loaded
    }
  }

  M._load = lookupProxy(M._load, handler)
}

type Package = {
  name: string;
  version: string;
}

/** Map of absolutePath to Package info*/
let pathToPackageID: Map<string, Package> = new Map()

/**
 * Given an absolute file path, return the package ID for a file
 * that has already been loaded (i.e., seen with a moduleLoad).  If that file
 * has not been loaded, return undefined.
 *
 * @param absPath The absolute path of a loaded js file
 * @returns The package ID or undefined if file has not been loaded
 */
export function getPackageForLoadedPath(absPath: string): Package | undefined {
  return pathToPackageID.get(absPath)
}


type PackageInfo = any
const packageJsonCache: Map<string, PackageInfo | null> = new Map()
/**
 * Given an absolute file path, try to find the closest package.json in the
 * path.  If found, parse and return as a json object.
 *
 * @param filepath  The file path string
 * @returns Object for package.json or null if not found or not readable
 */
function getPackageJsonFromPath(filepath: string): PackageInfo | null {
  // find the package json in the last node_modules + 1 path element
  // make a path from the id
  let pathElements = filepath.split(path.sep)
  pathElements.pop()
  while(pathElements.length) {
    const currentPath = pathElements.join(path.sep)
    const cachedInfo = packageJsonCache.get(currentPath)

    // We have tried this path before -- it doesn't have a valid package.json
    if(cachedInfo === null) {
      pathElements.pop()
      continue
    }

    // We have tried this path before -- it has a valid package.json
    if(cachedInfo !== undefined) {
      return cachedInfo
    }

    // We have not tried this path before
    const packageJsonPath = currentPath + path.sep + "package.json"

    // Package.json doesn't exist -- cache and continue
    if (!fs.existsSync(packageJsonPath)) {
      pathElements.pop()
      packageJsonCache.set(currentPath, null)
      continue
    }

    try {
      const packageJson = fs.readFileSync(packageJsonPath, 'utf8')
      const parsedObject: PackageInfo = JSON.parse(packageJson)

      // Package.json exists but is insufficient -- cache and continue
      if (!parsedObject.name || !parsedObject.version) {
        pathElements.pop()
        packageJsonCache.set(currentPath, null)
        continue
      }

      // Found a good package.json! End here
      // add the path where we found the package json
      parsedObject.packageJsonPath = currentPath
      packageJsonCache.set(currentPath, parsedObject)
      return parsedObject
    } catch (error) {
      // Package.json was malformed or something -- cache and continue
      logString("WARNING", `Error reading package.json for ${filepath}`)
      packageJsonCache.set(currentPath, null)
      pathElements.pop()
      continue
    }
  }

  logString("WARNING", `Cannot find package.json for ${filepath}`)
  return null
}

function getRelativeParent(parent: string) : string | null{
  // when there isn't a parent, it seems like the id is just '.'
  if (parent && parent !== "." && parent !== "TOP_LEVEL") {
    return "./" + path.relative(State().appPwd, parent)
  }

  return null
}

function resolveFile(filename: string, parent: string, isMain: boolean) {
  if(filename.startsWith("file://")) {
    return filename.replace("file://", "")
  }

  if(filename.startsWith("/")) {
    return filename
  }

  try {
    return M._resolveFilename(filename, parent, isMain)
  } catch (e) {
    const parentRequire = createRequire(parent)
    return parentRequire.resolve(filename)
  }
}

const loggedModuleLoads: Set<string> = new Set()
export function logModuleLoad(requestedModule: string, parent: string | undefined, isMain: boolean) {
  if(!parent) {
    parent = "TOP_LEVEL"
  }

  // I thought requires were always cached, so we wouldn't see the same moduleLoad
  // for the same require. This is not the case, but we don't want to be logging the
  // same module load repeatedly. So, we track what we've seen before
  const key = `${requestedModule}||${parent}`
  if(loggedModuleLoads.has(key)) {
    return
  }

  loggedModuleLoads.add(key)

  // We're dealing with a builtin
  if(isBuiltin(requestedModule)) {
    if(loggingEvents()) {
      const msg = {
        timestamp: new Date(),
        outcome: "moduleLoad",
        filename: requestedModule,
        isBuiltin: true,
        parent: parent,
        parent_relative: getRelativeParent(parent),
        id: requestedModule,
      }

      logEvent(msg)
    }
    return
  }

  const resolvedPath = resolveFile(requestedModule, parent, isMain)

  // try to get an object representing the closest package.json to the id
  const packageJson = getPackageJsonFromPath(resolvedPath)
  // add package to map for lib trace calculation
  if (packageJson && packageJson.name?.length != 0 && packageJson.version?.length != 0) {
    const p: Package = {
      name: packageJson.name,
      version: packageJson.version
    }

    pathToPackageID.set(resolvedPath, p)
  }


  if(loggingEvents()) {
    const msg = {
      // Message contents
      timestamp: new Date(),
      outcome: "moduleLoad",
      filename: resolvedPath,
      filename_relative: "./" + path.relative(State().appPwd, resolvedPath),
      isBuiltin: false,
      parent: parent,
      parent_relative: getRelativeParent(parent),
      name: packageJson?.name,
      version: packageJson?.version,
      type: packageJson?.type,
      package_json_path: packageJson?.packageJsonPath,
    }

    logEvent(msg)
  }
}
