// Copyright 2023, Require Security Inc, All Rights Reserved
const test = require('ava')
const { run_code, run_multi_inline_test } = require('../dist/test_util.js')
const { Graph } = require('../dist/utils/graph.js')

test('setTimeout: simple', async function(t) {
  function code() {
      const fs = require('fs')
      setTimeout(() => {fs.openSync("/dev/null")}, 1000)
  }
  const result = await(run_code(code))
  console.log(result)
  t.deepEqual(new Set(result['fs.openSync']),
              new Set(['./test_code.js']))
})

test('setTimeout: nested', async function(t) {
  function lib3() {
    function f3(arg, method) {
      setTimeout(() => {method(arg)}, 1000)
    }
    return {f3: f3}
  }

  function lib2() {
    function f2(file) {
      const fs = require('fs')
      setTimeout(lib3.f3, 200, file, fs.openSync)
    }
    return {f2: f2}
  }

  function lib1() {
    function f1() {
      setImmediate(lib2.f2, "/dev/null")
    }

    return {f1: f1}
  }

  function code() {
      setTimeout(lib1.f1)
  }

  const adj_list = new Graph([
    [code, [lib1]],
    [lib1, [lib2]],
    [lib2, [lib3]]
  ])

  const result = await(run_multi_inline_test(code, adj_list))
  console.log(result)
  t.deepEqual([...new Set(result['fs.openSync'])].sort(),
              [...new Set(['./test_code.js', './test_lib1.js',
                       './test_lib2.js', './test_lib3.js'])].sort())
})


test('setTimeout: cancel', async function(t) {
  function code() {
    const t = setTimeout(() => {
      throw Error("should not hit this")
    }, 1000)

    clearTimeout(t)
  }
  await t.notThrowsAsync(run_code(code))
})

test('setInterval: run and cancel', async function(t) {
  function code() {
    const fs = require('fs')
    const t = setInterval(() => {fs.openSync("/dev/null")}, 1000)

    setTimeout(() => {clearTimeout(t)}, 1500)
  }
  const result = await(run_code(code))
  console.log(result)
  t.deepEqual(new Set(result['fs.openSync']),
              new Set(['./test_code.js']))
})
