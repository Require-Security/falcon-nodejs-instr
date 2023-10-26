// Copyright 2023, Require Security Inc, All Rights Reserved
const test = require('ava')
const { Graph } = require('../dist/utils/graph.js')
const {
  run_multi_inline_test, run_inline_test, run_code,
} = require('../dist/test_util.js')

test('complex stack trace', async function(t) {
  function lib2() {
    const fs = require('fs')
    function f2() {
      (() => {
        fs.openSync("/dev/null")
      })()
    }
    return {f2: f2}
  }

  function lib1() {
    function f1() {
      lib2.f2()
    }

    return {f1: f1}
  }

  function code() {
    lib1.f1()
  }

  const adjList = new Graph([
    [code, [lib1]],
    [lib1, [lib2]]
  ])

  const result = await run_multi_inline_test(code, adjList)
  t.deepEqual(result['fs.openSync'].sort(),
             [ './test_lib2.js', './test_lib1.js', './test_code.js' ].sort())
})

test('reexport stack trace', async function(t) {
  function lib2() {
    const fs = require('fs')
    function f2() {
      (() => {
        fs.openSync("/dev/null")
      })()
    }
    return {f2: f2}
  }

  function lib1() {
    return {f1: lib2.f2}
  }

  function code() {
    lib1.f1()
  }

  const adjList = new Graph([
    [code, [lib1]],
    [lib1, [lib2]]
  ])

  const result = await run_multi_inline_test(code, adjList)
  t.deepEqual(result['fs.openSync'].sort(),
             [ './test_lib2.js', './test_code.js' ].sort())
})

test('sensitive in single eval', async function(t) {
  function lib() {
    function f() {
      const fs = require('fs')
      eval('fs.openSync("/dev/null")')
    }
    return {f: f}
  }

  function code() {
    lib.f()
  }

  const result = await run_inline_test(code, lib)
  t.deepEqual(result['fs.openSync'].sort(),
             [ './test_lib.js', './test_lib.js.eval', './test_code.js' ].sort())
})

test('sensitive in multiple-cross-file eval', async function(t) {
  function lib() {
    function f() {
      const fs = require('fs')
      eval('fs.openSync("/dev/null")')
    }
    return {f: f}
  }

  function code() {
    eval('lib.f()')
  }

  const result = await run_inline_test(code, lib)
  t.deepEqual(result['fs.openSync'].sort(),
             [ './test_lib.js', './test_lib.js.eval',
               './test_code.js', './test_code.js.eval' ].sort())
})

test('sensitive in multiple-same-file eval', async function(t) {
  function code() {
    const fs = require('fs')
    function func() {
      eval('fs.openSync("/dev/null")')
    }
    eval('func()')
  }

  const result = await run_code(code)
  t.deepEqual(result['fs.openSync'].sort(),
             ['./test_code.js.eval', './test_code.js' ].sort())
})

test('sensitive in nested eval', async function(t) {
  function code() {
    const fs = require('fs')
    const toRun = 'fs.openSync("/dev/null")'
    eval(`eval(toRun)`)
  }

  const result = await run_code(code)
  t.deepEqual(result['fs.openSync'].sort(),
             ['./test_code.js', './test_code.js.eval',
              './test_code.js.eval.eval'].sort())
})


test('sensitive in sneaky new Function', async function(t) {
  function lib() {
    function f() {
      const fs = require('fs')
      const func = new {}.constructor.constructor(["fs"], 'fs.openSync("/dev/null")')
      func(fs)
    }
    return {f: f}
  }

  function code() {
    lib.f()
  }

  const result = await run_inline_test(code, lib)
  t.deepEqual(result['fs.openSync'].sort(),
             [ './test_lib.js', './test_lib.js.eval', './test_code.js' ].sort())
})

test.failing('sensitive in dynamic settimout', async function(t) {
  function lib() {
    function f() {
      const fs = require('fs')
      setTimeout('fs.openSync("/dev/null")')
    }
    return {f: f}
  }

  function code() {
    lib.f()
  }

  const result = await run_inline_test(code, lib)
  t.deepEqual(result['fs.openSync'].sort(),
             [ './test_lib.js', './test_lib.js.eval', './test_code.js' ].sort())
})

test('sensitive in fake eval', async function(t) {
  function lib() {
    const fs = require('fs')

    function eval() {
      fs.openSync("/dev/null")
    }

    function f() {
      eval('fs.openSync("/dev/null")')
    }
    return {f: f}
  }

  function code() {
    lib.f()
  }

  const result = await run_inline_test(code, lib)
  t.deepEqual(result['fs.openSync'].sort(),
             [ './test_lib.js', './test_code.js' ].sort())
})
