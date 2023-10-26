const {init} = require("../../../dist/index.js")
init({privsFile: "./privs.json", traceGranularity: "file"})

const fs = require("fs")

fs.readFileSync("/tmp/test")