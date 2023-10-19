const lib = import("./indirect_import_2.mjs")

lib.then((l) =>l.fn())