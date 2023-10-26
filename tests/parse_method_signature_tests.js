// Copyright 2023, Require Security Inc, All Rights Reserved
// Not little e2e tests, but testing proxy spec handling directly
const ps = require('../dist/proxy_specs/parse_method_signature')

const test = require('ava')


test('spec parse: http.CreateServer', async function(t) {
  const argTxt = "options : Object, requestListener : Function<[IncomingMessage, ServerResponse], void>"
  const result = ps.parseMethodParams(argTxt)
  t.deepEqual(result[0], [new ps.RawType("Object")])
  t.deepEqual(result[1][0].ret, [new ps.RawType("void")])
  t.deepEqual(result[1][0].params, [[new ps.RawType("IncomingMessage")],
                                    [new ps.RawType("ServerResponse")]])
})

test('spec parse: Or', async function(t) {
  const argTxt = "options : Object | null"
  const result = ps.parseMethodParams(argTxt)
  t.deepEqual(result[0], [new ps.RawType("Object"), new ps.RawType("null")])
})

test('spec parse: Or in param', async function(t) {
  const argTxt = "requestListener : Function<[IncomingMessage|Request, ServerResponse], void>"
  const result = ps.parseMethodParams(argTxt)
  t.deepEqual(result[0][0].ret, [new ps.RawType("void")])
  t.deepEqual(result[0][0].params,
              [[new ps.RawType("IncomingMessage"), new ps.RawType("Request")],
               [new ps.RawType("ServerResponse")]])
})

test('spec parse: Or in return', async function(t) {
  const argTxt = "requestListener : Function<[IncomingMessage, ServerResponse], void|string|String>"
  const result = ps.parseMethodParams(argTxt)
  t.deepEqual(result[0][0].ret, [new ps.RawType("void"), new ps.RawType("string"), new ps.RawType("String")])
  t.deepEqual(result[0][0].params, [[new ps.RawType("IncomingMessage")], [new ps.RawType("ServerResponse")]])
})

test('spec parse: Return Function', async function(t) {
  const argTxt = "requestListener : Function<[IncomingMessage, ServerResponse], Function<[String|null], symbol>>"
  const result = ps.parseMethodParams(argTxt)
  t.deepEqual(result[0][0].ret[0].params, [[new ps.RawType("String"), new ps.RawType("null")]])
  t.deepEqual(result[0][0].ret[0].ret, [new ps.RawType("symbol")])
  t.deepEqual(result[0][0].params, [[new ps.RawType("IncomingMessage")], [new ps.RawType("ServerResponse")]])
})

test('spec parse: nestedCallback', async function(t) {
  const argTxt = "requestListener : Function<[Function<[Foo], bar>, ServerResponse], void>"
  const result = ps.parseMethodParams(argTxt)
  t.deepEqual(result[0][0].ret, [new ps.RawType("void")])
  t.deepEqual(result[0][0].params[0][0].ret, [new ps.RawType('bar')])
  t.deepEqual(result[0][0].params[0][0].params, [[new ps.RawType('Foo')]])
})

test('spec parse: no args function', async function(t) {
  const argTxt = "requestListener : Function<void>"
  const result = ps.parseMethodParams(argTxt)
  t.deepEqual(result[0][0].ret, [new ps.RawType("void")])
  t.deepEqual(result[0][0].params, [])
})

test('spec parse: string array', async function(t) {
  const argTxt = "args: string[]"
  const result = ps.parseMethodParams(argTxt)
  console.log(JSON.stringify(result))
  t.deepEqual(result[0][0].type, [new ps.RawType("string")])
})

test('spec parse: tuple', async function(t) {
  const argTxt = "args: [string, Object]"
  const result = ps.parseMethodParams(argTxt)
  t.deepEqual(result[0][0].types, [[new ps.RawType("string")], [new ps.RawType("Object")]])
})

test('spec parse: tuple complex', async function(t) {
  const argTxt = "args: [string|null, Function<[Foo], bar>|string]"
  const result = ps.parseMethodParams(argTxt)
  t.deepEqual(result[0][0].types[0], [new ps.RawType("string"), new ps.RawType("null")])
  t.deepEqual(result[0][0].types[1][0].params, [[new ps.RawType("Foo")]])
  t.deepEqual(result[0][0].types[1][0].ret, [new ps.RawType("bar")])
  t.deepEqual(result[0][0].types[1][1], new ps.RawType("string"))
})

test('spec parse: dot in name', async function(t) {
  const argTxt = "args: fs.FileHandle"
  const result = ps.parseMethodParams(argTxt)
  t.deepEqual(result[0], [new ps.RawType("fs.FileHandle")])
})

test('spec parse: literal', async function(t) {
  const argTxt = "event: \"request\", requestListener : Function<[http.IncomingMessage, http.ServerResponse], void>"
  const result = ps.parseMethodParams(argTxt)
  t.deepEqual(result[0][0].text, "request")
})
