const test = require('ava')
const { run_code, run_file_test } = require('../dist/test_util.js')

test('"this" context properly bound to Function', async function (t) {
  function code() {
    const assert = require('assert')
    const state = {
      foo: "bar",
      hello: "world"
    }
    const concat = Function(`
        const { foo, hello } = this;
        if (foo === undefined || hello === undefined)
          return undefined;
        return foo + hello;
      `).bind(state)
    // Check to see if the context was lost in the dynamic code.
    assert.notEqual(concat.apply(), undefined)
  }

  await t.notThrowsAsync(run_code(code))
})

test('new no-arg Function throws exception', async function (t) {
  function code() {
    const copy = function (name) {
      var F = Function()
      F.name = name
      F.prototype = this
      return new F()
    }
    // This call throws 'TypeError: F is not a constructor' exception.
    copy("func")
  }

  await t.notThrowsAsync(run_code(code))
})

test('new Function with args also throws exception', async function (t) {
  function code() {
    const assert = require('assert')
    const copy = function (name) {
      var F = Function('x', 'this.x = x')
      F.name = name
      F.prototype = this
      return new F(12)
    }
    // This call throws 'TypeError: F is not a constructor' exception.
    assert.equal(copy("func").x, 12)
  }

  await t.notThrowsAsync(run_code(code))
})

test('Function returns global this', async function (t) {
  function code() {
    const assert = require('assert')
    var obj = Function('return this')()
    assert.equal(obj, globalThis)
  }

  await t.notThrowsAsync(run_code(code))
})

test('arguments bound to new Function', async function (t) {
  function code() {
    const assert = require('assert')
    const state = {
      initial: 5
    }
    const total = Function(`
        if (this.initial === undefined)
          return undefined
        let sum = this.initial
        for (let x of arguments) {
          sum += x
        }
        return sum
      `).bind(state, 3, 7, 20)
    assert.equal(total(), 35)
  }

  await t.notThrowsAsync(run_code(code))
})

test('arguments bound to new Function with arguments', async function (t) {
  function code() {
    const assert = require('assert')
    const state = {
      initial: 5
    }
    const to_list = Function('n', 'm', `
        console.log(arguments)
        if (this.initial === undefined)
          return undefined
        let lst = [this.initial]
        for (let x of arguments) {
          lst.push(x)
        }
        return lst
      `).bind(state, 3, 7, 20)
    assert.deepEqual(to_list(99, 21), [5, 3, 7, 20, 99, 21])
  }

  await t.notThrowsAsync(run_code(code))
})

test('class member new Function() called via this.fn()', async function (t) {
  function code() {
    const assert = require('assert')
    class Foo {
      constructor() {
        this.fn = new Function('return this')
      }

      call() {
        return this.fn()
      }
    }
    const foo = new Foo()
    assert.notEqual(foo.call(), globalThis)
    assert.equal(foo.call(), foo)
  }

  await t.notThrowsAsync(run_code(code))
})

test('class member bounded new Function() called via this.fn()', async function (t) {
  function code() {
    const assert = require('assert')
    const state = {
      hello: "world"
    }
    class Foo {
      constructor() {
        this.fn = new Function('return this').bind(state)
      }

      call() {
        return this.fn()
      }
    }
    const foo = new Foo()
    assert.notEqual(foo.call(), foo)
    assert.equal(foo.call(), state)
  }

  await t.notThrowsAsync(run_code(code))
})

test('check alignment of "arguments" to their respective new Function() argument',
  async function (t) {
    function code() {
      const assert = require('assert')
      const fn = Function("x", "y", "z", `
        return arguments.length === 3 &&
               arguments[0] === x &&
               arguments[1] === y &&
               arguments[2] === z &&
               ((x + y + z) === 21)
      `)
      assert(fn(3, 7, 11))
    }

    await t.notThrowsAsync(run_code(code))
  })

test('returning spread arguments in new Function', async function (t) {
  function code() {
    const assert = require('assert')
    const args = Function(`
      return [...arguments]
    `)(2, 4, 6, 8)
    assert.deepEqual(args, [2, 4, 6, 8])
  }

  await t.notThrowsAsync(run_code(code))
})

test('mixed global and function arguments in new Function', async function (t) {
  function code() {
    const assert = require('assert')
    const args = (Function("x", "y", `
        const a1 = arguments[0]
        const a2 = arguments[1]
        return function g(z) {
          return [a1, a2, x, y, z, arguments[0]]
        }
      `)(3, 5)).call(null, 7)
    assert.deepEqual(args, [3, 5, 3, 5, 7, 7])
  }

  await t.notThrowsAsync(run_code(code))
})

test('set Function parameters via "arguments" object', async function (t) {
  function code() {
    const assert = require('assert')
    const args = (Function("x", "y", `
        arguments[0] = 3
        arguments[1] = 4
        return [x, y]
      `))(1, 2)
    assert.deepEqual(args, [3, 4])
  }

  await t.notThrowsAsync(run_code(code))
})

test('set "arguments" via Function parameters', async function (t) {
  function code() {
    const assert = require('assert')
    const args = (Function("x", "y", `
        x = 3
        y = 4
        return [arguments[0], arguments[1]]
      `))(1, 2)
    assert.deepEqual(args, [3, 4])
  }

  await t.notThrowsAsync(run_code(code))
})

test('check "arguments" in strict mode', async function (t) {
  function code() {
    const assert = require('assert')
    // This should pass since we override 'arguments' before the 'use strict'.
    const str = (Function("s1", "s2", `
        'use strict'
        return arguments[0] + ", " + arguments[1]
      `))('hello', 'world')
    assert.deepEqual(str, "hello, world")
  }

  await t.notThrowsAsync(run_code(code))
})

test('sloppy mode via new Function', async function(t) {
  function code() {
    const assert = require('assert')
    const res = new Function(`
    const state = {
      foo: 'bar'
    }
    with(state) {
      var res = foo
    }
    return res
    `)()
    assert.equal(res, 'bar')
  }

  await t.notThrowsAsync(run_code(code))
})

test('test the various argument formats', async function (t) {
  function code() {
    const assert = require('assert')
    function testArgFmt(...args) {
      const res = new Function(...args, `
        let v = [d, c, b, a]
        let res = 0
        let k = 0
        for (let i = 1; i <= 1000; i*=10) {
          res += v[k++] * i
        }
        return res
      `)(1, 2, 3, 4)
      assert.equal(res, 1234)
    }
    testArgFmt('a', 'b', ['c', 'd'])
    testArgFmt('a', 'b', 'c, d')
    testArgFmt('a', [['b'], ['c']], 'd')
    testArgFmt(['a, b', ['c, d']])
    testArgFmt(['a', [['b'], ['c'], 'd']])
    testArgFmt([[['a', [[[['b']], [['c']]]], 'd']]])
    testArgFmt('  a,b , c   , d  ')
    testArgFmt('  a,b ',' c   , d  ')
    testArgFmt(['  a,b '],[' c   , d  '])
  }

  await t.notThrowsAsync(run_code(code))
})

test('rename eval', async function(t) {
  await t.notThrowsAsync(run_file_test("rename_eval"))
})



test('Direct eval nested', async function (t) {
  function code() {
    eval(`eval('const fs = require("fs"); fs.openSync("/dev/null")')`)
  }

  const result = await run_code(code)
  t.deepEqual(new Set(result['fs.openSync'].sort()),
              new Set(["./test_code.js", "./test_code.js.eval", "./test_code.js.eval.eval" ].sort()))
})

test('Indirect eval nested', async function (t) {
  function code() {
    (0,eval)(`(0,eval)('const fs = process.mainModule.require("fs"); fs.openSync("/dev/null")')`)
  }

  const result = await run_code(code)
  t.deepEqual(new Set(result['fs.openSync'].sort()),
              new Set(["./test_code.js", "./test_code.js.eval", "./test_code.js.eval.eval" ].sort()))

})

test('shadow require in new function', async function(t) {
  function code() {
    const assert = require('assert')
    const results = []
    const fn = Function("require", `
      const foo = require('foo')
      const bar = require('bar')
    `)
    // This call will throw an exception if 'require' is shadowed.
    fn(function(module) { results.push(module) })
    assert.deepEqual(results, ['foo', 'bar'])
  }

  await t.notThrowsAsync(run_code(code))
})

test('calling eval in new Function to overwrite arguments',
             async function(t) {
  function code() {
    const assert = require('assert')
    const fn = Function('eval', 'x',`
      eval("x = true")
      return x
    `)
    const res = fn(eval, false);
    assert(res)  // Should be true, but is not!
  }

  await t.notThrowsAsync(run_code(code))
})
