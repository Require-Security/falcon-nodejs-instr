import fs from "fs";

export function fn() {
  console.log("openSync called")
  fs.openSync("/dev/null")
}