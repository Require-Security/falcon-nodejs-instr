// Copyright 2023, Require Security Inc, All Rights Reserved
const test = require('ava')
const {DefaultDict} = require("../dist/utils/misc")

test('defaultDict basic operation', async function(t) {
  const d = new DefaultDict(Map)
  d.get("hello").set("foo", "bar")

  t.is(d.get("hello").get("foo"), "bar")

  const obj = {}
  d.get("hello").set("baz", obj)

  t.is(d.get("hello").get("baz"), obj)
})

test('defaultDict initializer', async function(t) {
  const d = new DefaultDict(Map, [["hello", new Map([["foo", "bar"]])]])

  t.is(d.get("hello").get("foo"), "bar")

  const obj = {}
  d.get("hello").set("baz", obj)

  t.is(d.get("hello").get("baz"), obj)
})

test('defaultDict nested', async function(t) {
  const d = new DefaultDict(DefaultDict.bind(null, Map))
  d.get("hello").get("foo").set("bar", 1)

  const helloDict = d.get('hello')
  helloDict.get('foo').set('baz', 3)

  t.is(d.get("hello").get("foo").get("bar"), 1)
  t.is(d.get("hello").get("foo").get("baz"), 3)
})
