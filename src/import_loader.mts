// Copyright 2023, Require Security Inc, All Rights Reserved
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let msgPort: MessagePort

type Context = {
  conditions: string[]
  importAssertions: unknown
  parentURL: string
}

export async function initialize({number, port} : {number: number, port: MessagePort}) {
  msgPort = port
}

export async function resolve(specifier: string, context: Context, nextResolve: Function ) {
  const spec = specifier.replace("node:", "")
  if (['fs', 'fs/promises', 'http', 'https', 'child_process'].includes(spec)) {
    specifier = join(__dirname, "../node-apis/", spec + ".js")
  } else {
    const parentPath = context.parentURL?.replace("file://", '')
    msgPort.postMessage(["logModuleLoad", specifier, parentPath])
  }
  return nextResolve(specifier)
}