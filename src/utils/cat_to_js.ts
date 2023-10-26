// Copyright 2023, Require Security Inc, All Rights Reserved
import assert from "assert";
import { readFile, readdir, writeFile } from "fs/promises";
import { getProxiedBuiltins, getProxySpec, loadProxySpecs } from "../proxy_specs/proxy_specs";
import { readFileSync, writeFileSync } from "fs";
import path, { join } from "path";

class ModInfo {
  name: string
  modules: ModInfo[]
  classes: ClassInfo[]
  methods: MethodInfo[]
  constructor (name: string) {
    this.name = name;
    this.modules = [];
    this.classes = []
    this.methods = []
  }
}

class ClassInfo {
  name: string
  parent: string | null
  methods: MethodInfo[]
  constructor (name: string, parent: string | null) {
    this.name = name;
    this.parent = parent
    this.methods = []
  }
}

class MethodInfo {
  kind: string
  level: number
  name: string
  signature: string
  constructor (kind: string, level: string, name: string, signature: string) {
    this.kind = kind;
    this.level = Number(level);
    this.name = name;
    this.signature = signature;
  }
}

export async function parseCatFile(file: string): Promise<ModInfo> {
  const input = (await readFile(file, "utf8")).split("\n");
  const TOP_LEVEL = new ModInfo("TOP LEVEL")
  let namespaces: Array<ModInfo|ClassInfo> = [TOP_LEVEL]

  function currentNamespace(): ModInfo|ClassInfo {
    const n = namespaces.at(-1)
    assert(n)
    return n
  }

  function currentMod(): ModInfo {
    const n = currentNamespace()
    assert(n instanceof ModInfo)
    return n
  }

  for (let line of input) {
    line = line.trim();
    if (!line) {
      continue;
    }
    const toks = line.split (/\s+/);
    if (line.startsWith("module")) {
      const mod = new ModInfo(toks[1])
      currentMod().modules.push(mod)
      namespaces.push(mod)
    } else if (line.startsWith ("class")) {
      let parent = null
      if (toks[2] == "extends") {
        parent = toks[3]
      } else if (toks[2] !== undefined) {
        throw Error("After class should only be 'extends'")
      }
      const kls = new ClassInfo (toks[1], parent);
      currentMod().classes.push(kls)
      namespaces.push(kls)
    } else if (line.startsWith ("end-class")) {
      const kls = namespaces.pop()
      assert(kls instanceof ClassInfo)
    } else if (line.startsWith ("end-module")) {
      const mod = namespaces.pop()
      assert(mod instanceof ModInfo)
    } else { // must be a method definition
      let [kind, level] = toks[0].split ("-");
      let rest = toks.slice(1)
      let matchName = /([\[\]a-zA-Z0-9_\.]+)\s*(.*)/
      let m = rest.join(" ").match(matchName)
      assert(m, `Failed to match ${rest}`)
      const mi = new MethodInfo (kind, level, m[1], m[2]);
      currentNamespace().methods.push(mi)
    }
  }

  assert(TOP_LEVEL == namespaces.pop())
  assert(TOP_LEVEL.classes.length == 0)
  assert(TOP_LEVEL.methods.length == 0)
  assert(TOP_LEVEL.modules.length == 1)
  return TOP_LEVEL.modules[0]
}

async function generateCode(libName: string) {
  const header =
`
const ${libName} = require("${libName}")
const { getDefaultProxy } = require("../dist/proxies/default_proxy")
const { getProxySpec } = require("../dist/proxy_specs/proxy_specs")

function getProxy(name) {
  const spec = getProxySpec("${libName}." + name)
  if (spec) {
    return getDefaultProxy({obj: ${libName}[name], proxySpec: spec})
  } else {
    return fs[name]
  }
}

`

  const lib = require(libName)
  const lines = []
  for (const name in lib) {
    lines.push(`exports.${name} = getProxy("${name}")`)
  }

  return header + lines.join("\n")
}


const ProxiedAPIs = ["fs", "http", "https", "child_process"]
async function main(apisFolder: string) {
  for (const name of ProxiedAPIs) {
    const code = await generateCode(name)
    const target = join(apisFolder, `${name}.js`)
    await writeFile(target, code)
  }
}

main(process.argv[2]).catch(e => console.error(e))