const {exec} = require("node:child_process")
setTimeout(() => exec("echo 'hello' > /tmp/TESTFILE"), 200)