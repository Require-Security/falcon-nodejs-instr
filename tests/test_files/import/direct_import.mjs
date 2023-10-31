const {init} = await import("../../../dist/init.js")
const __filename = import.meta.url.replace("file://", "")
init({privsFile: __filename + ".privs.json"})

const fs = await import("fs")

await fs.promises.open(__filename)