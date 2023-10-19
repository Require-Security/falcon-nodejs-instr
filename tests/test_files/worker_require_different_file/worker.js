
const {writeFileSync} = require("fs")

console.log('In child process')

// Write a file after 0.5s to avoid race conditions
setTimeout(() => writeFileSync("/dev/null", "hello"), 500)