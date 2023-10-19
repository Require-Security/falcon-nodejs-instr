const fs = require("fs")

function sensitive(name) {
  setTimeout(() => {console.log("Opening from %s", name);fs.openSync("/dev/null")}, 1000)
}
function f1(name="f1") {
  setTimeout(sensitive, 500, name)
}

function f2(name="f2") {
  setTimeout(sensitive, 0, name)
}

function f3(name="f3") {
  setImmediate(sensitive, name)
}

function f4(name="f4") {
  setTimeout(() => f2(name))
}

f1()
f2()
f3()
f4()
