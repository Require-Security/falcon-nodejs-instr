const {init} = require("../../../dist/init.js")
init({privsFile: "./privs.json", traceGranularity: "file"})

const fs = require("fs")

fs.readFileSync("/tmp/test")