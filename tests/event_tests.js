const test = require('ava');
const { run_code, run_inline_test } = require('../dist/test_util.js')

// XXX: add checks to make sure process.on works?
// It should, since it's an eventEmitter
test.failing('process.on', async function(t) {
  function code() {
    const fs = require("fs")
    function handler() {
      fs.openSync("/dev/null")
    }

    process.on('exit', handler);
  }

  const result = await run_code(code);
  console.log(result)
  // XXX: this should catch fs.openSync. It doesn't because
  // the process.on('exit') doesn't play well with our stuff
});


test('EventEmitter: on', async function(t) {
  function code() {
      const fs = require('fs')
      const EventEmitter = require('events')

      const emitter = new EventEmitter()
      emitter.on('foo', () => {fs.openSync("/dev/null")})
      emitter.emit('foo')
  }
  const result = await(run_code(code))
  console.log(result)
  t.deepEqual(new Set(result['fs.openSync']),
             new Set([ './test_code.js' ]))
})

test('EventEmitter: on cross lib', async function(t) {
  function lib() {
    const fs = require('fs')
    const EventEmitter = require('events')

    const emitter = new EventEmitter()
    setTimeout(() => emitter.emit("foo"), 500)

    function func() {fs.openSync("/dev/null")}
    return {func: func, emitter: emitter}
  }

  function code() {
      lib.emitter.on('foo', lib.func)
  }
  const result = await(run_inline_test(code, lib))
  console.log(result)
  t.deepEqual(new Set(result['fs.openSync'].sort()),
             new Set([ './test_code.js', "./test_lib.js" ].sort()))
})

test('EventEmitter: on cross lib no ss', async function(t) {
  function lib() {
    const fs = require('fs')
    const EventEmitter = require('events')

    const emitter = new EventEmitter()
    setTimeout(() => emitter.emit("foo"), 500)

    function func() {fs.openSync("/dev/null")}
    return {func: func, emitter: emitter}
  }

  function code() {
      lib.emitter.on('foo', lib.func)
  }
  const opts = {mode: "BATCH", extra_agent_args: ["--no-shadow-stack"]}
  const result = await(run_inline_test(code, lib, opts))
  console.log(result)
  t.deepEqual(new Set(result['fs.openSync'].sort()),
             new Set(["./test_lib.js" ].sort()))
})


test('EventEmitter: cancel', async function(t) {
  function code() {
      const EventEmitter = require('events')

      const emitter = new EventEmitter()
      const fn = () => {throw Error("should not hit this")}
      emitter.on('foo', fn)
      emitter.off('foo', fn)
      emitter.emit('foo')
  }
  const result = await(run_code(code))
  t.pass()
})

test('EventEmitter: once is tracked', async function(t) {
  function code() {
      const fs = require('fs')
      const EventEmitter = require('events')

      const emitter = new EventEmitter()
      emitter.on('foo', () => {fs.openSync("/dev/null")})
      emitter.emit('foo')
  }
  const result = await(run_code(code))
  console.log(result)
  t.deepEqual(new Set(result['fs.openSync']),
              new Set([ './test_code.js' ]))
})

test('EventEmitter: once only once', async function(t) {
  function code() {
      const EventEmitter = require('events')

      var n = 0

      const emitter = new EventEmitter()
      emitter.once('foo', () => {n = n + 1})
      emitter.emit('foo')
      emitter.emit('foo')
      if(n != 1) {
        throw Error(`once ran not once: ${n}`)
      }
  }
  const result = await(run_code(code))
  t.pass()
})

test('EventEmitter: once cancel', async function(t) {
  function code() {
      const EventEmitter = require('events')

      const emitter = new EventEmitter()
      const fn = () => {throw Error("should not hit this")}
      emitter.once('foo', fn)
      emitter.off('foo', fn)
      emitter.emit('foo')
  }
  const result = await(run_code(code))
  t.pass()
})

test('EventEmitter: listeners', async function(t) {
  function code() {
      const EventEmitter = require('events')

      const emitter = new EventEmitter()
      const fn1 = () => {}
      const fn2 = () => {}
      emitter.once('foo', fn1)
      emitter.on('foo', fn2)
      var [elt1, elt2] = emitter.listeners('foo')
      if(elt1 != fn1 || elt2 != fn2) {
        throw Error("listeners transparency broken")
      }

      emitter.emit('foo')

      [elt2] = emitter.listeners('foo')
      if(elt2 != fn2) {
        throw Error("listeners transparency broken")
      }
  }
  const result = await(run_code(code))
  t.pass()
})

// XXX: test this better?
test('EventEmitter: rawListeners', async function(t) {
  function code() {
      const EventEmitter = require('events')

      const emitter = new EventEmitter()
      const fn = () => {throw Error("should not hit this")}
      emitter.on('foo', fn)
      const [elt] = emitter.rawListeners('foo')
      if(elt != fn) {
        throw Error("listeners transparency broken")
      }
  }
  const result = await(run_code(code))
  t.pass()
})


test('EventEmitter: two sources', async function(t) {
  function lib() {
    const EventEmitter = require('events')
    const fs = require('fs')

    const emitter = new EventEmitter()
    const fn = () => {fs.openSync("/dev/null")}
    emitter.on('foo', fn)
    return {emitter: emitter, fn: fn}
  }
  function code() {
    lib.emitter.on('foo', lib.fn)
    lib.emitter.emit('foo')
  }
  const result = await(run_inline_test(code, lib))
  console.log(result)
  t.deepEqual(new Set(result['fs.openSync']),
              new Set([ './test_lib.js', './test_code.js' ]))
})

test('EventEmitter: arguments', async function(t) {
  function code() {
      const fs = require('fs')
      const EventEmitter = require('events')

      const emitter = new EventEmitter()
      emitter.on('foo', (func) => {func("/dev/null")})
      emitter.emit('foo', fs.openSync)
  }
  const result = await(run_code(code))
  console.log(result)
  t.deepEqual(new Set(result['fs.openSync']),
             new Set([ './test_code.js' ]))
})

test('EventEmitter: cancel imported', async function(t) {
  function lib() {
    const EventEmitter = require('events')
    const fs = require('fs')

    const emitter = new EventEmitter()
    const fn = () => {throw Error("shouldn't hit this")}
    emitter.on('foo', fn)
    return {emitter: emitter, fn: fn}
  }
  function code() {
    lib.emitter.removeListener('foo', lib.fn)
    lib.emitter.emit('foo')
  }
  const result = await(run_inline_test(code, lib))
  t.pass()
})

test('EventEmitter: run imported', async function(t) {
  function lib() {
    const EventEmitter = require('events')
    const fs = require('fs')

    const emitter = new EventEmitter()
    const fn = () => {fs.openSync("/dev/null")}
    emitter.on('foo', fn)
    return {emitter: emitter, fn: fn}
  }
  function code() {
    lib.emitter.emit('foo')
  }
  const result = await(run_inline_test(code, lib))
  const stack = result['fs.openSync']
  t.is(stack[0], './test_lib.js')
})

test('EventEmitter: cancel, leave imported', async function(t) {
  function lib() {
    function addListener(emitter, name, fn) {
      emitter.addListener(name, fn)
    }
    return {addListener: addListener}
  }
  function code() {
    const EventEmitter = require('events')
    const fs = require('fs')

    const emitter = new EventEmitter()
    const fn = () => {fs.openSync("/dev/null")}
    lib.addListener(emitter, 'foo', fn)
    emitter.addListener('foo', fn)
    emitter.removeListener('foo', fn)
    emitter.emit('foo')
  }
  const result = await(run_inline_test(code, lib))
  console.log(result)
  const stack = result['fs.openSync']
  t.deepEqual(stack, ['./test_code.js', './test_lib.js'])
})

test('EventEmitter: cancel, leave self', async function(t) {
  function lib() {
    function addListener(emitter, name, fn) {
      emitter.addListener(name, fn)
    }
    return {addListener: addListener}
  }
  function code() {
    const EventEmitter = require('events')
    const fs = require('fs')

    const emitter = new EventEmitter()
    const fn = () => {fs.openSync("/dev/null")}
    lib.addListener(emitter, 'foo', fn)
    emitter.prependListener('foo', fn)
    emitter.removeListener('foo', fn)
    emitter.emit('foo')
  }
  const result = await(run_inline_test(code, lib))
  console.log(result)
  const stack = result['fs.openSync']
  t.deepEqual(stack, ['./test_code.js'])
})

test('EventEmitter: cancel complex', async function(t) {
  function code() {
    const EventEmitter = require('events')
    var assert = require('assert');

    const emitter = new EventEmitter()
    var n = 0
    const fn = () => {
      n++
    }
    emitter.once('foo', fn)                     // a
    emitter.once('foo', fn)                     // b
    emitter.on('foo', fn)                       // c
    emitter.on('foo', fn)                       // d
    emitter.emit('foo') // removes a and b
    assert(n == 4)

    emitter.removeListener('foo', fn) // removes d
    emitter.emit('foo')
    assert(n == 5)


    emitter.prependOnceListener('foo', fn)      // e
    emitter.once('foo', fn)                     // f
    emitter.off('foo', fn) // removes f
    emitter.emit('foo') // removes e (c still lives)
    assert(n = 7)
    emitter.emit('foo') // only c is around, which is still around
    assert(n = 8)
    emitter.on('foo', fn)                        // g
    emitter.once('foo', fn)                      // h
    emitter.on('bar', fn)                        // i
    emitter.removeAllListeners('foo') // kills all except i
    emitter.emit('foo')
    assert(n = 8)
    emitter.emit('bar')
    assert(n = 9)

    emitter.on('foo', fn)                        // j
    emitter.removeAllListeners() // kills all across events
    emitter.emit('foo')
    emitter.emit('bar')
    assert(n = 9)
  }
  const result = await(run_code(code))
  t.pass()
})

test('EventEmitter: access this', async function(t) {
  function code() {
      const fs = require('fs')
      const EventEmitter = require('events')

      const obj = {func: fs.openSync}

      const emitter = new EventEmitter()
      const handler = (function() {this.func("/dev/null")}).bind(obj)

      emitter.on('foo', handler)
      emitter.emit('foo')
  }
  const result = await(run_code(code))
  console.log(result)
  t.deepEqual(new Set(result['fs.openSync']),
             new Set([ './test_code.js' ]))
})

test('EventEmitter object transparency', async function(t) {
  function code() {
    const { EventEmitter } = require('events')
    const checkTransparency = function(obj, prop, expected) {
      if (obj[prop] !== expected)
        throw new Error(`The ${prop} property of '${obj}' should equal ${expected.name}`)
    }
    class FooEmitter extends EventEmitter {}
    checkTransparency(new FooEmitter(), "constructor", FooEmitter)

    const e = new EventEmitter()
    checkTransparency(e, "constructor", EventEmitter)
    checkTransparency(e, "on", EventEmitter.prototype.on)
    checkTransparency(e, "removeListener", EventEmitter.prototype.removeListener)
  }

  await t.notThrowsAsync(run_code(code))
})
