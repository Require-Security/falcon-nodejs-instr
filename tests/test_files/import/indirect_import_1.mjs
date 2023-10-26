const {init} = await import("../../../dist/index.js")
init({privsFile: (import.meta.url + ".privs.json").replace("file://", ""),
      traceGranularity: "file"})

const lib = await import("./indirect_import_2.mjs")
lib.fn()