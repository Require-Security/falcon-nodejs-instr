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
  if (['fs', 'http', 'https', 'child_process'].includes(specifier.replace("node:", ""))) {
    console.log("Import of %s by %s", specifier, context.parentURL)
    specifier = join(__dirname, "../node-apis/", specifier + ".js")
  } else {
    const parentPath = context.parentURL.replace("file://", '')
    msgPort.postMessage(["logModuleLoad", specifier, parentPath])
  }
  return nextResolve(specifier)
}