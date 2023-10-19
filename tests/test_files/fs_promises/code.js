const lib1 = require("./lib1")

async function foo() { 
    // Hopefully this is a unique enough filename. Apparently
    // node doesn't have a native API for creating temp files
    // and i refuse to use a package for a test program ;-)
    // XXX: fs/promises has mkdtemp (see src/test_util.ts)
    const filename = "/tmp/fh_handle_test.foo"
    try {
        const fh = await lib1.openPath(filename)
        await fh.write("hola")
        await fh.sync()
        await fh.chmod(0o777)
        await fh.close()
    } catch (error) {
        console.log ("error: ", error)
    } finally {
        await lib1.rm(filename)
    }
}

console.log("starting")
try {
    foo()
        .then (console.log("foo is done"))
        .catch (console.error)
        .finally (() => console.log ("c-ya"))
} catch (error) {
    console.log (`sad face, foo got an error: ${error}`)
}
