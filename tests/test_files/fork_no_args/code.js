const { fork } = require('node:child_process')
fork(__dirname + "/child.js")