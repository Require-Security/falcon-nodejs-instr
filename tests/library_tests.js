const test = require('ava');
const { run_code } = require('../dist/test_util.js')

// test('lodash', async function(t) {
//   // XXX: this is a bad test until I add import support, since lodash uses imports
//   const code = () => {
//     let _ = require("lodash")
//     var numbers = [1,2,3,4,5,6,7,8]

//     var [evens, odds] = _.partition(numbers, (n) => {return n % 2 == 0})
//     console.log(`evens: ${evens}; odds: ${odds}`)

//     console.log(_.chunk(['a', 'b', 'c', 'd'], 2));

//     console.log(_.now())
//   }

//   const result = (await run_code(code))['./test_code.js'].requires
//   console.log(result)
//   t.pass()
// })

// test('request', async function(t) {
//   const code = () => {
//     let request = require('request')

//     console.log("-----require done----------")
//     request.get({url: '127.0.0.1'},
//                 function (err, res) {});
//   }

//   const result = (await run_code(code))['./test_code.js'].requires
//   console.log(result)
//   t.pass()
// })

// Pass
test('jsbn', async function(t) {
  function code() {
    let BigInt = require('jsbn').BigInteger
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('abbrev', async function(t) {
  function code() {
    var assert = require("assert");
    var abbrev = require("abbrev");
    const a = abbrev("foo", "fool", "folding", "flop");

    assert.deepEqual(a, { fl: 'flop',
                          flo: 'flop',
                          flop: 'flop',
                          fol: 'folding',
                          fold: 'folding',
                          foldi: 'folding',
                          foldin: 'folding',
                          folding: 'folding',
                          foo: 'foo',
                          fool: 'fool' });
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('array-range', async function(t) {
  function code() {
    var assert = require('assert')
    var array = require('array-range')

    assert.deepEqual(array(5).map(x => x*x), [0, 1, 4, 9, 16])
    assert.deepEqual(array(2, 10).filter(x => x%2===0), [2, 4, 6, 8])
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('bimn', async function(t) {
  function code() {
    let math = require('bimn')
    const result = math.multiple(math.multiple(13, 2), math.add(3, 7))
    if (result != 260)
      throw new Error(`Unexpected result: ${result} != 260`)
  }

  const result = await run_code(code)
  t.pass()
})

test('bl', async function(t) {
  function code() {
    const { BufferList } = require('bl')

    console.log("-------------------------")
    const bl = new BufferList()
    bl.append(Buffer.from('012'))
    bl.append(Buffer.from('34'))
    bl.append('56')
    bl.append(Buffer.from([ 0x37, 0x38, 0x39 ]))

    if (bl.length != 10) {
      throw new Error(`Unexpected buffer lenght: ${bl.length} != 10`)
    }

    const expected = '234567'
    const actual = bl.slice(2, 8).toString('ascii')
    if (expected !== actual) {
      throw new Error(`Unexpected result: '${expected}' != '${actual}'`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('bs58', async function(t) {
  function code() {
    const assert = require('assert')
    const bs58 = require('bs58')

    var bytes = Uint8Array.from([
        0, 60,  23, 110, 101, 155, 234,
       15, 41, 163, 233, 191, 120, 128,
      193, 18, 177, 179,  27,  77, 200,
       38, 38, 129, 135
    ])
    var actual = bs58.encode(bytes)
    var expected = '16UjcYNBG9GTK4uq2f7yYEbuifqCzoLMGS'
    assert.equal(actual, expected)

    const address = '16UjcYNBG9GTK4uq2f7yYEbuifqCzoLMGS'
    var bytes = bs58.decode(address)
    var actual = Buffer.from(bytes).toString('hex')
    var expected = '003c176e659bea0f29a3e9bf7880c112b1b31b4dc826268187'
    assert.equal(actual, expected)
  }

  const result = await run_code(code)
  t.pass()
})

test('bson', async function(t) {
  function code() {
    const assert = require('assert');
    const BSON = require('bson');
    const Long = BSON.Long;

    // Serialize a document
    const doc = { long: Long.fromNumber(100) };
    const data = BSON.serialize(doc);

    // Deserialize the resulting Buffer
    const doc2 = BSON.deserialize(data);
    assert.deepEqual(doc2, { long: 100 });
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('btoa', async function(t) {
  function code() {
    var btoa = require('btoa');
    var bin = "hello, world";
    const expected = 'aGVsbG8sIHdvcmxk'
    const actual = btoa(bin);
    if (expected !== actual) {
      throw new Error(`Unexpected result: '${expected}' != '${actual}'`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

// Doesn't work -- this needs to have a seperate process send stuff
// and the server needs to close
test.skip('busboy', async function(t) {
  function code() {
    const http = require('http');
    const busboy = require('busboy');

    http.createServer((req, res) => {
      if (req.method === 'POST') {
        console.log('POST request');
        const bb = busboy({ headers: req.headers });
        bb.on('file', (name, file, info) => {
          const { filename, encoding, mimeType } = info;
          console.log(
            `File [${name}]: filename: %j, encoding: %j, mimeType: %j`,
            filename,
            encoding,
            mimeType
          );
          file.on('data', (data) => {
            console.log(`File [${name}] got ${data.length} bytes`);
          }).on('close', () => {
            console.log(`File [${name}] done`);
          });
        });
        bb.on('field', (name, val, info) => {
          console.log(`Field [${name}]: value: %j`, val);
        });
        bb.on('close', () => {
          console.log('Done parsing form!');
          res.writeHead(303, { Connection: 'close', Location: '/' });
          res.end();
        });
        req.pipe(bb);
      } else if (req.method === 'GET') {
        res.writeHead(200, { Connection: 'close' });
        res.end(`
          <html>
            <head></head>
            <body>
              <form method="POST" enctype="multipart/form-data">
                <input type="file" name="filefield"><br />
                <input type="text" name="textfield"><br />
                <input type="submit">
              </form>
            </body>
          </html>
        `);
      }
    }).listen(8000, () => {
      console.log('Listening for requests');
    });
  }

  const result = await run_code(code)
  t.pass()
})

test('bytebuffer', async function(t) {
  function code() {
    var ByteBuffer = require("bytebuffer");

    var bb = new ByteBuffer()
            .writeIString("Hello world!")
            .flip();

    const s = bb.readIString()
    if (s !== 'Hello world!') {
      throw new Error(
        `Unexpected string result: ${s} != 'Hello world!'`
      )
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('canvas', async function(t) {
  function code() {
    const { createCanvas, loadImage } = require('canvas')
    const canvas = createCanvas(200, 200)
    const ctx = canvas.getContext('2d')

    // Write "Awesome!"
    ctx.font = '30px Impact'
    ctx.rotate(0.1)
    ctx.fillText('Awesome!', 50, 100)

    // Draw line under text
    var text = ctx.measureText('Awesome!')
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath()
    ctx.lineTo(50, 102)
    ctx.lineTo(50 + text.width, 102)
    ctx.stroke()

    // Don't know a good way to test this!!
  }

  const result = await run_code(code)
  t.pass()
})


test('case', async function(t) {
  function code() {
    var assert = require('assert');
    var Case = require('case');

    assert.equal(Case.upper('foo_bar'), 'FOO BAR');
    assert.equal(Case.lower('fooBar'), 'foo bar');
    assert.equal(Case.capital('foo_v_bar'), 'Foo V Bar');
    assert.equal(Case.snake('Foo bar!'), 'foo_bar');
    assert.equal(Case.pascal('foo.bar'), 'FooBar');
    assert.equal(Case.camel('foo, bar'), 'fooBar');
    assert.equal(Case.kebab('Foo? Bar.'), 'foo-bar');
    assert.equal(Case.constant('Foo-Bar'), 'FOO_BAR');
    assert.equal(Case.title('foo v. bar'), 'Foo v. Bar');
    assert.equal(Case.sentence('the 12 oz. can', null, ['oz']),
      'The 12 oz. can');

    assert.equal(Case.lower('FOO-BAR', '.'), 'foo.bar');
    assert.equal(Case.upper('Foo? Bar.', '__'), 'FOO__BAR');
    assert.equal(Case.capital('fooBar', ' + '), 'Foo + Bar');
    assert.equal(Case.lower("Don't keep 'em!", "/", true),
      'dont/keep/em');

    Case.type('bang', function(s) {
      return Case.upper(s, '!')+'!';
    });
    assert.equal(Case.bang('bang'), 'BANG!');
    assert.equal(Case.of('TEST!THIS!'), 'bang');

    assert.equal(Case.of('foo'), 'lower');
    assert.equal(Case.of('foo_bar'), 'snake');
    assert.equal(Case.of('Foo v Bar'), 'title');
    assert.equal(Case.of('foo_ Bar'),  undefined);
    assert.equal(Case.of('Hello there, Bob!', ['Bob']),
      'sentence');

    assert.equal(Case.flip('FlipMe'), 'fLIPmE');
    assert.equal(Case.flip('TEST THIS!'), 'test this!');
  }

  const result = await run_code(code)
  t.pass()
})

test('chance', async function(t) {
  function code() {
    let chance = require('chance')
    console.log(chance().random())
  }

  const result = await run_code(code)
  t.pass()
})

test('cheerio', async function(t) {
  function code() {
    const cheerio = require('cheerio');
    const c = cheerio.load('<h2 class="title">Hello world</h2>');

    c('h2.title').text('Hello there!');
    c('h2').addClass('welcome');

    const expected =
      '<html><head></head><body><h2 class="title welcome">Hello there!</h2></body></html>';
    const actual = c.html();
    if (expected !== actual) {
      throw new Error(`Unexpected result: '${expected}' != '${actual}'`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('chunky', async function(t) {
  function code() {
    var chunky = require('chunky');
    const expected = 'Beep boop. I am a computer.'
    const chunks = chunky(expected);
    var actual = ""
    for (i = 0; i < chunks.length; i++) {
      actual += chunks[i]
    }
    if (expected !== actual) {
      throw new Error(`Unexpected result: '${expected}' != '${actual}'`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('clean', async function(t) {
  function code() {
    let clean = require('clean')

    var shorthands = {
        c: 'cwd',
        n: 'no-recursive'
    };

    obj = clean({
        shorthands: shorthands
    }).argv(['node', 'xxx', '-c', 'abc', '-n']);

    if (obj['cwd'] == undefined || obj['no-recursive'] == undefined)
      throw new Error('Unexpected undefined arguments')
    if (obj['cwd'] !== 'abc' || obj['no-recursive'] !== true)
      throw new Error('Unexpected value for arguments')
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('clone', async function(t) {
  function code() {
    var assert = require('assert');
    var clone = require('clone');
    var a = { foo: { bar: 'baz' } };  // initial value of a
    var b = clone(a);
    assert.deepEqual(b, a);
  }

  const result = await run_code(code)
  t.pass()
})

test('color', async function(t) {
  function code() {
    const assert = require('assert');
    const Color = require('color');

    const color = Color('#7743CE').alpha(0.5).lighten(0.5);

    assert.equal(color.hsl().string(), 'hsla(262.4, 58.6%, 80.3%, 0.5)');
    assert.deepEqual(color.cmyk().round().array(),
      [ 16, 25, 0, 8, 0.5 ]);
    assert.deepEqual(color.ansi256().object(),
      { ansi256: 183, alpha: 0.5 });
  }

  const result = await run_code(code)
  t.pass()
})

test('columnify', async function(t) {
  function code() {
    var assert = require('assert')
    var columnify = require('columnify')

    var data = {
      "commander@0.6.1": 1,
      "minimatch@0.2.14": 3,
      "mkdirp@0.3.5": 2,
      "sigmund@1.0.0": 3
    }
    var actual = columnify(data)
    var expected = 'KEY              VALUE\n' +
                   'commander@0.6.1  1    \n' +
                   'minimatch@0.2.14 3    \n' +
                   'mkdirp@0.3.5     2    \n' +
                   'sigmund@1.0.0    3    '
    assert.equal(actual, expected)

    var actual = columnify(data, {columns: ['MODULE', 'COUNT']})
    var expected = 'MODULE           COUNT\n' +
                   'commander@0.6.1  1    \n' +
                   'minimatch@0.2.14 3    \n' +
                   'mkdirp@0.3.5     2    \n' +
                   'sigmund@1.0.0    3    '
    assert.equal(actual, expected)

    var actual = columnify([{
      name: 'mod1',
      version: '0.0.1'
    }, {
      name: 'module2',
      version: '0.2.0'
    }])
    var expected = 'NAME    VERSION\n' +
                   'mod1    0.0.1  \n' +
                   'module2 0.2.0  '
    assert.equal(actual, expected)

    var actual = columnify([{
      name: 'mod1',
      description: 'some description which happens to be far larger than the max',
      version: '0.0.1',
    }, {
      name: 'module-two',
      description: 'another description larger than the max',
      version: '0.2.0',
    }], {
      minWidth: 20,
      config: {
        description: {maxWidth: 30}
      }
    })
    var expected = 'NAME                 DESCRIPTION                    VERSION             \n' +
                   'mod1                 some description which happens 0.0.1               \n' +
                   '                     to be far larger than the max                      \n' +
                   'module-two           another description larger     0.2.0               \n' +
                   '                     than the max                                       '
    assert.equal(actual, expected)

    var data = {
      "shortKey": "veryVeryVeryVeryVeryLongVal",
      "veryVeryVeryVeryVeryLongKey": "shortVal"
    }
    var actual = columnify(data, { paddingChr: '.'})
    var expected = 'KEY........................ VALUE......................\n' +
                   'shortKey................... veryVeryVeryVeryVeryLongVal\n' +
                   'veryVeryVeryVeryVeryLongKey shortVal...................'
    assert.equal(actual, expected)
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('convert', async function(t) {
  function code() {
    var { convert } = require('convert');
    var { convertMany } = require('convert');
    const miles = convert(5, 'miles').to('km');
    const minutes = convertMany('4d 16h').to('minutes');
    if (miles != 8.04672) {
      throw new Error(`Unexpected number of miles: ${miles} != 8.04672`)
    }
    if (minutes != 6720) {
      throw new Error(`Unexpected number of minutes: ${minutes} != 6720`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('create', async function(t) {
  function code() {
    var assert = require('assert')
    require('create')(Array)

    // `Array2` is the prototype of our subclass
    var Array2 = Object.create(Array.prototype)

    // remove() impl from http://ejohn.org/blog/javascript-array-remove
    Array2.remove = function (from, to) {
      var rest = this.slice((to || from) + 1 || this.length);
      this.length = from < 0 ? this.length + from : from;
      return this.push.apply(this, rest);
    }

    // now we can create an instance of Array2
    var a = Array.create(Array2)

    // add some items to it
    a.push(1, 2, 3)
    a.push('foo', 'bar')
    // [1, 2, 3, 'foo', 'bar']

    a.remove(1)
    // [1, 3, 'foo', 'bar']
    assert.deepEqual(a, [1, 3, 'foo', 'bar'])
  }

  const result = await run_code(code)
  t.pass()
})

test('cross', async function(t) {
  function code() {
    var cross = require('cross');
    const a = [3, -3, 1]
    const b = [4, 9, 2]
    const x = cross([], a, b)
    if (x[0] !== -15 || x[1] !== -2 || x[2] !== 39) {
      throw new Error(`Unexpected result: ${x} != [-15, -2, 39]`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('curry', async function(t) {
  function code() {
    var curry = require('curry')
    var sum = function() {
      var nums = [].slice.call(arguments);
      return nums.reduce(function(a, b) { return a + b });
    }

    var sum3 = curry.to(3, sum);
    var sum4 = curry.to(4, sum);

    const s3 = sum3(1, 2)(3)
    if (s3 !== 6) {
      throw new Error(`Expected 6 but got ${s3}`)
    }
    const s4 = sum4(1)(2)(3, 4)
    if (s4 !== 10) {
      throw new Error(`Expected 10 but got ${s4}`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('deep', async function(t) {
  function code() {
    var assert = require('assert');
    var deep = require('deep');

    assert(deep.isPlainObject({}));
    assert(deep.isPlainObject(new Object));
    assert(!deep.isPlainObject(Buffer.alloc(8)));
    assert(!deep.isPlainObject([]));
    assert(!deep.isPlainObject(new function(){}));

    x = {
      a: 1,
      b: [ 2, 3, function(arg) { return arg; } ]
    };
    y = deep.clone(x);
    assert.deepEqual(y, x);

    a = b = [1, 2, 3];
    assert(deep.equals(a, b));

    a = [1, 2, 3];
    b = [1, 2, 3];
    assert(deep.equals(a, b));

    a = [1, 2, 3];
    b = [1, 2, 4];
    assert(!deep.equals(a, b));

    a = [1, 2, {x: 3, y: 4}];
    b = [1, 2, {x: 3, y: 4}];
    assert(deep.equals(a, b));

    a = {x: 1, y: [2, 3], z: {a: 4, b: 5}};
    b = {z: {a: 4, b: 5}, y: [2, 3], x: 1};
    assert(deep.equals(a, b));

    x = { a: { b: [ { c: 5 } ] } }
    deep.set(x, ['a', 'b', 0, 'c'], 'hello');
    assert.deepEqual(x, { a: { b: [ { c: 'hello' } ] } });

    x = {
      a: 1,
      b: [ 2, 3, 'hello' ]
    };
    y = deep.transform(
      x,
      function(obj) { return typeof obj == 'string' },
      function(obj) { return obj.length }
    );
    assert.deepEqual(y, { a: 1, b: [2, 3, 5] });
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('em', async function(t) {
  function code() {
    var Path = require('em').Path
    var path = Path.create('/foo').join('bar/docroot/').join('index.html');
    const expectedDir = '/foo/bar/docroot'
    const actualDir = path.dirname()
    if (actualDir != expectedDir) {
      throw new Error(
        `Expected '${expectedDir}', but got '${actualDir}'`
      )
    }
    const expectedName = 'index'
    const actualName = path.basename('.html')
    if (actualName != expectedName) {
      throw new Error(
        `Expected '${expectedName}', but got '${actualName}'`
      )
    }
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('escodegen', async function(t) {
  function code() {
    var escodegen = require('escodegen');
    const expected = '40 + 2';
    const actual = escodegen.generate({
      type: 'BinaryExpression',
      operator: '+',
      left: { type: 'Literal', value: 40 },
      right: { type: 'Literal', value: 2 }
    });
    if (actual != expected) {
      throw new Error(
        `Expected '${expected}', but got '${actual}'`
      )
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('figlet', async function(t) {
  function code() {
    var figlet = require('figlet');

    figlet('Hello World!!', function(err, data) {
      if (err) {
        console.log('Something went wrong...');
        console.dir(err);
        return;
      }
      console.log(data)
    });
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('flat', async function(t) {
  function code() {
    var flatten = require('flat')

    const f = flatten({
      key1: {
        keyA: 'valueI'
      },
      key2: {
        keyB: 'valueII'
      },
      key3: { a: { b: { c: 2 } } }
    })

    // Expected: {
    //             'key1.keyA': 'valueI',
    //             'key2.keyB': 'valueII',
    //             'key3.a.b.c': 2
    //           }
    if (f['key1.keyA'] !== 'valueI' || f['key2.keyB'] !== 'valueII' ||
        f['key3.a.b.c'] !== 2) {
      throw new Error(`Unepected result: ${f}`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('fuzzy', async function(t) {
  function code() {
    var assert = require('assert');
    var fuzzy = require('fuzzy');
    var list = ['baconing', 'narwhal', 'a mighty bear canoe'];
    var results = fuzzy.filter('bcn', list)
    const actual = results.map(function(el) { return el.string; });
    const expected = ['baconing', 'a mighty bear canoe'];
    assert.deepEqual(actual, expected);
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('hh', async function(t) {
  function code() {
    var hh = require('hh');
    function test(item) {
      return item
    }

    f = hh(test, 5);
    if (f() !== 5) {
      throw new Error(`Unexpected result: ${f()} != 5`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

// Server test needs a client/finish
test.skip('hyperquest', async function(t) {
  function code() {
    var http = require('http');
    var hyperquest = require('hyperquest');

    var server = http.createServer(function (req, res) {
        res.write(req.url.slice(1) + '\n');
        setTimeout(res.end.bind(res), 3000);
    });

    server.listen(5000, function () {
        var pending = 20;
        for (var i = 0; i < 20; i++) {
            var r = hyperquest('http://localhost:5000/' + i);
            r.pipe(process.stdout, { end: false });
            r.on('end', function () {
                if (--pending === 0) server.close();
            });
        }
    });

    process.stdout.setMaxListeners(0); // turn off annoying warnings
  }

  const result = await run_code(code)
  t.pass()
})

test('immutable', async function(t) {
  function code() {
    const { Map } = require('immutable');
    const map1 = Map({ a: 1, b: 2, c: 3 });
    const map2 = map1.set('b', 50);
    if (map1.get('b') !== 2)
      throw new Error(`Unexpected result: ${map1.get('b')} != 2`)
    if (map2.get('b') !== 50)
      throw new Error(`Unexpected result: ${map2.get('b')} != 2`)
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('inflection', async function(t) {
  function code() {
    var assert = require('assert');
    var inflection = require('inflection');

    assert.equal(inflection.pluralize('person'), 'people');
    //assert.equal(inflection.pluralize('octopus'), "octopi");
    assert.equal(inflection.pluralize('Hat'), 'Hats');
    assert.equal(inflection.pluralize('person', 'guys'), 'guys');

    assert.equal(inflection.inflect('people', 1), 'person');
    //assert.equal(inflection.inflect('octopi', 1), 'octopus');
    assert.equal(inflection.inflect('Hats', 1), 'Hat');
    assert.equal(inflection.inflect('guys', 1 , 'person'), 'person');
    assert.equal(inflection.inflect('person', 2), 'people');
    //assert.equal(inflection.inflect('octopus', 2), 'octopi');
    assert.equal(inflection.inflect('Hat', 2), 'Hats');
    assert.equal(inflection.inflect('person', 2, null, 'guys'), 'guys');
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('invariant', async function(t) {
  function code() {
    var invariant = require('invariant');

    invariant(5 == 5, 'This will not throw');

    var errorThrown = true
    try {
      invariant(2 == 3, 'This will throw an error with this message');
      errorThrown = false
    } catch (err) {
    }

    if (!errorThrown) {
      throw new Error('Expected a thrown error on failing invariant')
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('itsa', async function(t) {
  function code() {
    const { itsa } = require("itsa");

    const schema = itsa.object({
      name: itsa.string(),
      email: itsa.email(),
      age: itsa.any(
        itsa.number().between(18, 200),
        null,
        undefined,
      ),
      colors: itsa.array(
        itsa.any("red", "green", "blue"),
      ).notEmpty(),
    });

    const result = schema.validate({ name: "Bob", email: "bob@example.com" });
    if (result.ok !== false) {
      throw new Error('Result should be not OK')
    }
    if (result.message !== "colors: Expected array but found undefined") {
      throw new Error(`Unexpected error message: ${result.message}`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('jssoup', async function(t) {
  function code() {
    var assert = require('assert');
    var JSSoup = require('jssoup').default;

    checkDef = function(x) {
      assert(x !== null && x !== undefined);
      return x;
    };

    var soup = new JSSoup('<html><head>hello</head></html>');
    var tag = checkDef(soup.find('head'));
    assert.equal(tag.name, 'head');
    tag.name = 'span';
    assert.equal(tag.toString(), '<span>hello</span>');

    var soup = new JSSoup('<tag id="hi" class="banner">hello</tag>');
    var tag = checkDef(soup.nextElement);
    assert.deepEqual(tag.attrs, {id: 'hi', class: 'banner'});
    tag.attrs.id = 'test';
    assert.equal(tag.toString(),
      '<tag id="test" class="banner">hello</tag>');

    var data = '<div>\n' +
               '  <a>1</a>\n' +
               '  <b>2</b>\n' +
               '  <c>3</c>\n' +
               '</div>';
    var soup = new JSSoup(data);
    var div = checkDef(soup.nextElement);
    var b = checkDef(checkDef(div.nextElement).nextElement);
    assert(b.toString(), '2');
    var a = checkDef(b.previousElement);
    assert(b.toString(), '1');

    var soup = new JSSoup(data);
    var div = checkDef(soup.nextElement);
    var a = checkDef(div.nextElement);
    var b = checkDef(a.nextSibling);
    var c = checkDef(b.nextSibling);
    assert(c.nextSibling == undefined);

    var soup = new JSSoup(data);
    var a = checkDef(soup.find("a"));
    assert.equal(a.nextSiblings.toString(), '<b>2</b>,<c>3</c>');
    var c = checkDef(soup.find("c"));
    assert.equal(c.previousSiblings, '<a>1</a>,<b>2</b>');
  }

  const result = await run_code(code)
  t.pass()
})

// Doesn't work -- this needs to have a seperate process send stuff
// and the server needs to close
test.skip('kado', async function(t) {
  function code() {
    'use strict'
    // import kado
    const kado = require('kado')
    // create application
    const app = kado.getInstance()
    // create a webserver
    const http = new kado.HyperText.HyperTextServer()
    // register the webserver
    app.http.addEngine('http', http.createServer(app.router))
    // register a route
    app.get('/', (req, res) => { res.end('Hello') })
    // start the application and listen
    app.start().then(() => app.listen())
  }

  const result = await run_code(code)
  t.pass()
})

test('lazy', async function(t) {
  function code() {
    var Lazy = require('lazy');

    var lazy = new Lazy;
    lazy.filter(function (item) {
        return item % 2 == 0
      }).take(5).map(function (item) {
        return item*2;
      }).join(function (xs) {
        console.log(xs);
      });

    [0,1,2,3,4,5,6,7,8,9,10].forEach(function (x) {
      lazy.emit('data', x);
    });
  }

  const result = await run_code(code)
  t.pass()
})

test('lru', async function(t) {
  function code() {
    var assert = require('assert');
    var LRU = require('lru');

    var cache = new LRU(2),
      evicted

    cache.on('evict',function(data) { evicted = data });

    cache.set('foo', 'bar');
    assert.equal(cache.get('foo'), 'bar');

    cache.set('foo2', 'bar2');
    assert.equal(cache.get('foo2'), 'bar2');

    cache.set('foo3', 'bar3');
    assert.deepEqual(evicted, { key: 'foo', value: 'bar' });
    assert.equal(cache.get('foo3'), 'bar3');
    assert.equal(cache.remove('foo2'), 'bar2');
    assert.equal(cache.remove('foo4'), undefined);
    assert.equal(cache.length, 1);
    assert.deepEqual(cache.keys, ['foo3']);

    cache.clear()
    assert.equal(cache.length, 0);
    assert.deepEqual(cache.keys, []);
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('map', async function(t) {
  function code() {
    const map = require('map')
    const increment = map(a => a + 1)
    const list = [1, 2, 3]
    const incrementedList = increment(list)
    for (i = 0; i < incrementedList.length; i++) {
      if (incrementedList[i] != (i+2)) {
        throw new Error(`Increment map failed at index ${i}`)
      }
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('markdown', async function(t) {
  function code() {
    var markdown = require( "markdown" ).markdown
    const expected = '<p>Hello <em>World</em>!</p>'
    const actual = markdown.toHTML('Hello *World*!')
    if (expected !== actual) {
      throw new Error(`Unexpected result: ${expected} != ${actual}`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('md5', async function(t) {
  function code() {
    var md5 = require('md5')
    const expected = '5eb63bbbe01eeed093cb22bb8f5acdc3'
    const actual = md5('hello world')
    if (expected !== actual) {
      throw new Error(`Unexpected result: ${expected} != ${actual}`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('memoize', async function(t) {
  function code() {
    var assert = require('assert')
    var memoize = require('memoize')

    var date = memoize(function(seed, cb) {
      setTimeout(function() {
        cb(null, Date.now())
      }, 100)
    })

    date(1, function(err, d1) { // given a set of arguments
      date(1, function(err, d2) { // same arguments
        assert.equal(d2, d1)
        date(2, function(err, d3) { // we changed the arguments
          assert.notEqual(d3, d2);
        })
      })
    })
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('merge-objects', async function(t) {
  function code() {
    var assert = require('assert');
    var merge = require('merge-objects');

    var object1 = {a: 1, b: [2, 3]};
    var object2 = {b: [4, 5], c: 6};

    var result = merge(object1, object2);
    assert.deepEqual(result, {a: 1, b: [2, 3, 4, 5], c: 6})
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('minimatch', async function(t) {
  function code() {
    var minimatch = require("minimatch")

    if (!minimatch("bar.foo", "*.foo"))
      throw new Error('*.foo does not match "bar.foo"')
    if (minimatch("bar.foo", "*.bar"))
      throw new Error('*.bar erroneously matches "bar.foo"')
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('ms', async function(t) {
  function code() {
    var assert = require('assert')
    var ms = require('ms')

    assert.equal(ms('2 days'), 172800000)
    assert.equal(ms('1d'), 86400000)
    assert.equal(ms('10h'), 36000000)
    assert.equal(ms('2.5 hrs'), 9000000)
    assert.equal(ms('2h'), 7200000)
    assert.equal(ms('1m'), 60000)
    assert.equal(ms('5s'), 5000)
    assert.equal(ms('1y'), 31557600000)
    assert.equal(ms('100'), 100)
    assert.equal(ms('-3 days'), -259200000)
    assert.equal(ms('-1h'), -3600000)
    assert.equal(ms('-200'), -200)

    assert.equal(ms(60000), "1m")
    assert.equal(ms(2 * 60000), "2m")
    assert.equal(ms(-3 * 60000), "-3m")
    assert.equal(ms(ms('10 hours')), "10h")

    assert.equal(ms(60000, { long: true }), "1 minute")
    assert.equal(ms(2 * 60000, { long: true }), "2 minutes")
    assert.equal(ms(-3 * 60000, { long: true }), "-3 minutes")
    assert.equal(ms(ms('10 hours'), { long: true }), "10 hours")
  }

  const result = await run_code(code)
  t.pass()
})

test('mustache', async function(t) {
  function code() {
    var Mustache = require('mustache');

    var view = {
      title: "Joe",
      calc: function() {
        return 2 + 4;
      }
    };

    const expected = 'Joe spends 6';
    const actual = Mustache.render("{{title}} spends {{calc}}", view);
    if (expected !== actual) {
      throw new Error(`Unexpected result: '${expected}' != '${actual}'`);
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('needle', async function(t) {
  function code() {
    var needle = require('needle');

    needle.get('http://www.google.com', function(error, response) {
      if (!error && response.statusCode == 200)
        console.log(response.body);
    });
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('numeral', async function(t) {
  function code() {
    const numeral = require('numeral')
    var n = numeral('23rd');
    if (n.value() !== 23) {
      throw new Error(
        `Expected value(23) != actual value(${n.value()})`
      )
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('pino', async function(t) {
  function code() {
    const logger = require('pino')()

    logger.info('hello world')

    const child = logger.child({ a: 'property' })
    child.info('hello child!')
  }

  const result = await run_code(code)
  t.pass()
});

// This doesn't work when run without instrumentation
test.skip('plate', async function(t) {
  function code() {
    var plate = require('plate')
    var template = new plate.Template('hello {{ world }}')
    var xxx
    template.render({world:'everyone'}, function(err, data) {
      xxx = data
    })

    if (xxx !== 'hello everyone') {
      throw new Error(
        `Expected 'hello everyone', but rendered '${xxx}'`
      )
    }
  }

  const result = await run_code(code)
  t.pass()
});

test('pretty', async function(t) {
  function code() {
    var assert = require('assert');
    var pretty = require('pretty');
    const input = '<!DOCTYPE html> <html lang="en"> <head>\n' +
                  '<meta charset="UTF-8"> <title>Home</title>\n' +
                  '</head> <body> This is content. </body> </html>\n';

    const actual = pretty(input, {ocd: true});
    const expected = '<!DOCTYPE html>\n' +
                     '<html lang="en">\n' +
                     '  <head>\n' +
                     '    <meta charset="UTF-8">\n' +
                     '    <title>Home</title>\n' +
                     '  </head>\n' +
                     '  <body> This is content. </body>\n' +
                     '</html>';
    assert.equal(actual, expected);
  }

  const result = await run_code(code)
  t.pass()
})

test('progress', async function(t) {
  function code() {
    var assert = require('assert');
    var ProgressBar = require('progress');

    var count = 0;
    var bar = new ProgressBar(':bar', { total: 10 });
    var timer = setInterval(function () {
      bar.tick();
      count++;
      if (bar.complete) {
        clearInterval(timer);
        assert.equal(count, 10);
      }
    }, 100);
  }

  const result = await run_code(code)
  t.pass()
})

test('pump', async function(t) {
  function code() {
    var pump = require('pump')
    var fs = require('fs')

    var source = fs.createReadStream('/dev/random')
    var dest = fs.createWriteStream('/dev/null')

    pump(source, dest, function(err) {
      console.log('pipe finished', err)
    })

    setTimeout(function() {
      dest.destroy() // when dest is closed pump will destroy source
    }, 1000)
  }

  const result = await run_code(code)
  t.pass()
})

test('qute', async function(t) {
  function code() {
    const qute = require('qute');
    const queue = qute({ maxConcurrency: 1 });
    var expected = new Set();
    expected.add('OK 1');
    expected.add('OK 2');

    queue.push(
      () => new Promise((resolve) => {
        setTimeout(() => resolve('OK 1'), 1000);
      }),
      () => new Promise((resolve) => {
        setTimeout(() => resolve('OK 2'), 1000);
      })
    ).then((result) => {
      console.log('hello: ' + result.length);
      for (i = 0; i < result.length; i++) {
        console.log('deleting: ' + result[i]);
        expected.delete(result[i]);
      }
      if (expected.size != 0) {
        throw new Error('Should have enumerated all expected values');
      }
    });
  }

  const result = await run_code(code)
  t.pass()
})

test('qs', async function(t) {
  function code() {
    var assert = require('assert');
    var qs = require('qs');

    var obj = qs.parse('a=c');
    assert.deepEqual(obj, { a: 'c' });

    var str = qs.stringify(obj);
    assert.equal(str, 'a=c');

    assert.deepEqual(qs.parse('foo[bar]=baz'), {
      foo: {
        bar: 'baz'
      }
    });

    var protoObject = qs.parse('a[hasOwnProperty]=b',
      { allowPrototypes: true });
    assert.deepEqual(protoObject, { a: { hasOwnProperty: 'b' } });

    assert.deepEqual(qs.parse('foo[bar][baz]=foobarbaz'), {
      foo: {
        bar: {
          baz: 'foobarbaz'
        }
      }
    });

    var expected = {
      a: {
        b: {
          c: {
            d: {
              e: {
                f: {
                  '[g][h][i]': 'j'
                }
              }
            }
          }
        }
      }
    };
    var string = 'a[b][c][d][e][f][g][h][i]=j';
    assert.deepEqual(qs.parse(string), expected);

    var deep = qs.parse('a[b][c][d][e][f][g][h][i]=j',
      { depth: 1 });
    assert.deepEqual(deep,
      { a: { b: { '[c][d][e][f][g][h][i]': 'j' } } });

    var limited = qs.parse('a=b&c=d', { parameterLimit: 1 });
    assert.deepEqual(limited, { a: 'b' });
    var delimited = qs.parse('a=b;c=d', { delimiter: ';' });
    assert.deepEqual(delimited, { a: 'b', c: 'd' });
    var regexed = qs.parse('a=b;c=d,e=f', { delimiter: /[;,]/ });
    assert.deepEqual(regexed, { a: 'b', c: 'd', e: 'f' });
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('randomstring', async function(t) {
  function code() {
    var randomstring = require('randomstring')

    str = randomstring.generate({
      length: 12,
      charset: 'alphabetic'
    });

    if (str.length != 12 || str.match(/^[a-z]*$/i) == null) {
      throw new Error(`Malformed random string: ${str}`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('reflect', async function(t) {
  function code() {
    var assert  = require('assert');
    var Reflect = require('reflect');

    var ast = Reflect.parse("var a = 4 + 7");

    assert.equal(Reflect.stringify(ast, "  "),
      'var a = 4 + 7;\n');
  }

  const result = await run_code(code)
  t.pass()
})

test('reselect', async function(t) {
  function code() {
    var { createSelector } = require('reselect');
    var assert = require('assert');

    const selectShopItems = state => state.shop.items
    const selectTaxPercent = state => state.shop.taxPercent

    const selectSubtotal = createSelector(selectShopItems, items =>
      items.reduce((subtotal, item) => subtotal + item.value, 0)
    )

    const selectTax = createSelector(
      selectSubtotal,
      selectTaxPercent,
      (subtotal, taxPercent) => subtotal * (taxPercent / 100)
    )

    const selectTotal = createSelector(
      selectSubtotal,
      selectTax,
      (subtotal, tax) => ({ total: subtotal + tax })
    )

    const exampleState = {
      shop: {
        taxPercent: 8,
        items: [
          { name: 'apple', value: 1.2 },
          { name: 'orange', value: 0.95 }
        ]
      }
    }

    assert.equal(selectSubtotal(exampleState), 2.15);
    assert.equal(selectTax(exampleState), 0.172);
    assert.equal(selectTotal(exampleState).total, 2.322);
  }

  const result = await run_code(code)
  t.pass()
})

test('semver', async function(t) {
  function code() {
    const assert = require('assert')
    const semver = require('semver')

    assert.equal(semver.valid('1.2.3'), '1.2.3')
    assert.equal(semver.valid('a.b.c'), null)
    assert.equal(semver.clean('  =v1.2.3   '), '1.2.3')
    assert(semver.satisfies('1.2.3', '1.x || >=2.5.0 || 5.0.0 - 7.2.3'))
    assert(!semver.gt('1.2.3', '9.8.7'))
    assert(semver.lt('1.2.3', '9.8.7'))
    assert.equal(semver.minVersion('>=1.0.0'), '1.0.0')
    assert.equal(semver.valid(semver.coerce('v2')), '2.0.0')
    assert.equal(semver.valid(semver.coerce('42.6.7.9.3-alpha')),
      '42.6.7')
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('sprint', async function(t) {
  function code() {
    var sprint = require('sprint');
    const str = sprint('%2$s %1$s', 'a', 'b');
    if (str !== 'b a') {
      throw new Error(`Unexpected result: '${str}' != 'b a'`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('sqlite3', async function(t) {
  function code() {
    const assert = require('assert');
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(':memory:');

    index = 0;
    db.serialize(() => {
      db.run("CREATE TABLE lorem (info TEXT)");

      const stmt = db.prepare("INSERT INTO lorem VALUES (?)");
      for (let i = 0; i < 10; i++) {
        stmt.run("Ipsum " + i);
      }
      stmt.finalize();

      db.each("SELECT rowid AS id, info FROM lorem", (err, row) => {
        assert.equal(row.id, index + 1);
        assert.equal(row.info, "Ipsum " + index);
        index++;
      });
    }) ;

    db.close();
  }

  const result = await run_code(code)
  t.pass()
})

test('sha1', async function(t) {
  function code() {
    var sha1 = require('sha1');
    const expected = '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed'
    const actual = sha1('hello world');
    if (expected !== actual) {
      throw new Error(`Unexpected result: ${expected} != ${actual}`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

// When run uninstrumented, throws "window not defined". I don't
// think this works in node
test.skip('showdown', async function(t) {
  function code() {
    var assert = require('assert');
    var showdown  = require('showdown');
    var converter = new showdown.Converter();

    // Required for makeMd() to work!
    const { JSDOM } = require( "jsdom" );
    const { window } = new JSDOM( "" );

    var input    = '# hello, markdown!';
    var expected = '<h1 id="hellomarkdown">hello, markdown!</h1>';
    var actual   = converter.makeHtml(input);
    assert.equal(actual, expected);

    var input  = '<a href="https://patreon.com/showdownjs">Please Support us!</a>';
    var expected = '[Please Support us!](<https://patreon.com/showdownjs>)';
    var actual = converter.makeMarkdown(input);
    assert.equal(actual, expected);
  }

  const result = await run_code(code)
  t.pass()
})

// This uses modules, so needs import support
test.skip('slash', async function(t) {
  function code() {
    var path = require('path');
    var slash = require('slash');

    var expected = 'hello\\world/foo/bar';
    var actual = path.join("hello\\world", path.join('foo', 'bar'));
    if (expected !== actual) {
      throw new Error(`Unexpected result: ${expected} != ${actual}`);
    }
    var expected = 'hello/world/foo/bar';
    var actual = slash(actual);
    if (expected !== actual) {
      throw new Error(`Unexpected result: ${expected} != ${actual}`);
    }
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('slug', async function(t) {
  function code() {
    var assert = require('assert');
    var slug = require('slug');

    assert.equal(slug('i love unicode'), 'i-love-unicode');
    assert.equal(slug('i love unicode', '_'), 'i_love_unicode');

    slug.charmap['♥'] = 'freaking love';
    assert.equal(slug('I ♥ UNICODE'), 'i-freaking-love-unicode');

    slug.reset();
    assert.equal(slug('I ♥ UNICODE'), 'i-unicode');

    assert.equal(slug('Telephone-Number'), 'telephone-number');
    assert.equal(slug('Telephone-Number', {lower: false}),
      'Telephone-Number');

    slug.extend({'☢': 'radioactive'});
    assert.equal(slug('unicode ♥ is ☢'), 'unicode-is-radioactive');

    slug.reset();
    assert.equal(slug('unicode ♥ is ☢'), 'unicode-is');

    assert.equal(slug('one 1 two 2 three 3'), 'one-1-two-2-three-3');
    assert.equal(slug('one 1 two 2 three 3', { remove: /[0-9]/g }),
      'one-two-three');
  }

  const result = await run_code(code)
  t.pass()
})

test('stream-spigot', async function(t) {
  function code() {
    var spigot = require("stream-spigot")
    var stream = spigot.array(["ABC", "DEF", "G"])

    let streamToString = function(stream) {
      const chunks = [];
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      })
    }

    streamToString(stream).then(result => {
      if (result !== 'ABCDEFG') {
        throw new Error(`Unexpected result: '${result}' != 'ABCDEFG'`)
      }
    })
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('striptags', async function(t) {
  function code() {
    var striptags = require('striptags');
    const html =
        '<a href="https://example.com">' +
            'lorem ipsum <strong>dolor</strong> <em>sit</em> amet' +
        '</a>';
    const expected = 'lorem ipsum dolor sit amet';
    const actual = striptags(html);
    if (expected !== actual) {
      throw new Error(`Unexpected result: ${expected} != ${actual}`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

// This test doesn't work late at night -- I think date() and timestamp()
// handle time zones differently, so they don't alway work? I
// got consistent failures both with and without instrumentation
// at 10:52 PM
test.skip('time-stamp', async function(t) {
  function code() {
    const assert = require('assert');
    const sprint = require('sprint');
    const timestamp = require('time-stamp');
    const now = new Date();
    const fy = now.getFullYear();
    const fy_utc = now.getUTCFullYear();
    const M = now.getMonth() + 1;
    const M_utc = now.getUTCMonth() + 1;
    const d = now.getDate();
    const d_utc = now.getUTCDate();
    const h = now.getHours();
    const h_utc = now.getUTCHours();
    const m = now.getMinutes();
    const m_utc = now.getUTCMinutes();

    assert.equal(timestamp(),
      sprint('%04d-%02d-%02d', fy, M, d));
    assert.equal(timestamp.utc(),
      sprint('%04d-%02d-%02d', fy_utc, M_utc, d_utc));
    assert.equal(timestamp('YYYYMMDD'),
      sprint('%04d%02d%02d', fy, M, d));
    assert.equal(timestamp.utc('YYYYMMDD'),
      sprint('%04d%02d%02d', fy_utc, M_utc, d_utc));
    assert.equal(timestamp('YYYYMMDD:mm'),
      sprint('%04d%02d%02d:%02d', fy, M, d, m));
    assert.equal(timestamp.utc('YYYYMMDD:mm'),
      sprint('%04d%02d%02d:%02d', fy_utc, M_utc, d_utc, m_utc));
    assert.equal(timestamp('[YYYY:MM:DD]'),
      sprint('[%04d:%02d:%02d]', fy, M, d));
    assert.equal(timestamp('[YYYY:MM:DD]'),
      sprint('[%04d:%02d:%02d]', fy_utc, M_utc, d_utc));
    assert.equal(timestamp('[YYYY:MM:DD:HH]'),
      sprint('[%04d:%02d:%02d:%02d]', fy, M, d, h));
    assert.equal(timestamp.utc('[YYYY:MM:DD:HH]'),
      sprint('[%04d:%02d:%02d:%02d]', fy_utc, M_utc, d_utc, h_utc));
  }

  const result = await run_code(code)
  t.pass()
})

test('tinycolor2', async function(t) {
  function code() {
    var assert = require("assert");
    var tinycolor = require("tinycolor2");

    var color = tinycolor("red");
    assert.equal(color.toHex(), 'ff0000');
    assert.equal(color.toPercentageRgbString(),
      "rgb(100%, 0%, 0%)");
    assert(color.isValid());

    var color = tinycolor("rgb (0, 255, 0)");
    assert.equal(color.toHex(), '00ff00');
    assert(color.isValid());

    var color = tinycolor("not a color");
    assert(!color.isValid());

    var color = tinycolor("blue");
    color.setAlpha(.5);
    assert.equal(color.toRgbString(),
      "rgba(0, 0, 255, 0.5)");

    assert.equal(tinycolor("#f00").lighten().toString(),
      "#ff3333");
    assert.equal(tinycolor("#f00").brighten().toString(),
      "#ff1919");
    assert.equal(tinycolor("#f00").darken().toString(),
      "#cc0000");
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('tix', async function(t) {
  function code() {
    check = function(expected, actual) {
      if (expected !== actual) {
        throw new Error(`Expected ${expected}, but got ${actual}`)
      }
    }
    var Tix = require('tix');

    var ids = new Tix();

    var id = ids.take(); // 0
    check(0, id)

    var anotherId = ids.take(); // 1
    check(1, anotherId)

    if (!ids.has(1)) {
      throw new Error('Expected ids to have 1')
    }
    if (ids.has(2)) {
      throw new Error('Expected ids to not have 2')
    }

    var id = ids.take(); // 2
    check(2, id)

    if (!ids.has(2)) {
      throw new Error('Expected ids to have 2')
    }

    ids.release(1);

    if (ids.has(1)) {
      throw new Error('Expected ids to not have 1')
    }

    var id = ids.take() // 1
    check(1, id)
  }

  const result = await run_code(code)
  t.pass()
})

test('traverse', async function(t) {
  function code() {
    var traverse = require('traverse');

    var obj = {
        a : [1,2,3],
        b : 4,
        c : [5,6],
        d : { e : [7,8], f : 9 },
    };

    var leaves = traverse(obj).reduce(function (acc, x) {
      if (this.isLeaf) acc.push(x);
        return acc;
    }, []);
    if (leaves.length != 9)
      throw new Error(`Wrong number of elements: ${leaves.length} != 9`)
    for (i = 1; i < leaves.length; i++) {
      if (leaves[i-1] != i) {
        throw new Error(
          `Expected ${i} at leaves[${i-1}], but was ${leaves[i-1]}`
        )
      }
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('twas', async function(t) {
  function code() {
    var assert = require('assert');
    var twas = require('twas');
    assert.equal(twas(Date.now() - (5 * 1000)), '5 seconds ago');
    assert.equal(twas(Date.now() - (5 * 60000)), '5 minutes ago');
    assert.equal(twas(Date.now() - (5 * 3600000)), '5 hours ago');
    assert.equal(twas(Date.now() - (5 * 86400000)), '5 days ago');
    assert.equal(twas(Date.now() - 2628000000), 'a month ago');
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('url', async function(t) {
  function code() {
    var url = require('url')
    const expected = 'http://example.com/two'
    const actual = url.resolve('http://example.com/one', '/two')
    if (expected !== actual) {
      throw new Error(`Unexpected result: ${expected} != ${actual}`)
    }
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('validator', async function(t) {
  function code() {
    var assert = require('assert');
    var validator = require('validator');

    assert(validator.isEmail('foo@bar.com'));
    assert(validator.isAlphanumeric('aBcDeEfFgGHHHH0982130000'));
    assert(validator.isCurrency('$1,033.24'));
  }

  const result = await run_code(code)
  t.pass()
})

test('when', async function(t) {
  function code() {
    var assert = require('assert');
    var when = require('when');
    var rest = require('rest');

    function sum(x, y) { return x + y; }
    function times10(x) {return x * 10; }

    function getRemoteNumberList() {
      // Get a remote array [1, 2, 3, 4, 5]
      //return rest('http://example.com/numbers').then(JSON.parse);
      return [1, 2, 3, 4, 5];
    }

    when.reduce(when.map(getRemoteNumberList(),
        times10), sum).done(function(result) {
      assert.equal(result, 150)
    });
  }

  const result = await run_code(code)
  t.pass()
})

test('xml', async function(t) {
  function code() {
    var assert = require('assert');
    var xml = require('xml');

    var elem = xml.element({ _attr: { decade: '80s', locale: 'US'} });
    var stream = xml({ toys: elem }, { stream: true });
    const expected = ['<toys decade="80s" locale="US">',
	             '<toy>Transformers</toy>',
	             '<toy>GI Joe</toy>',
	             '<toy><name>He-man</name></toy>',
	             '</toys>'];

    elem.push({ toy: 'Transformers' });
    elem.push({ toy: 'GI Joe' });
    elem.push({ toy: [{name:'He-man'}] });
    elem.close();

    stream.on('data', chunk => {
        assert.equal(chunk, expected.shift());
    });

    return new Promise((resolve, reject) => {
        stream.on('close', () => {
            assert.deepEqual(expected, []);
            resolve();
        });
        stream.on('error', reject);
    });
  }

  const result = await run_code(code)
  t.pass()
})

test('xpath', async function(t) {
  function code() {
    var xpath = require('xpath')
    var dom = require('xmldom').DOMParser

    var xml = "<book><title>Harry Potter</title></book>"
    var doc = new dom().parseFromString(xml)
    var nodes = xpath.select("//title", doc)

    if (nodes[0].localName != 'title') {
      throw new Error(`Unexpected localName: ${nodes[0].localName} != 'title'`)
    }
    if (nodes[0].firstChild.data != 'Harry Potter') {
      throw new Error(
        `Unexpected firstChild.data: ${nodes[0].firstChild.data} != 'Harry Potter'`
      )
    }
  }

  const result = await run_code(code)
  t.pass()
})

test('xregexp', async function(t) {
  function code() {
    var assert = require('assert');
    var XRegExp = require('xregexp');

    // Using named capture and flag x for free-spacing and line comments
    const date = XRegExp(
        `(?<year>  [0-9]{4} ) -?  # year
         (?<month> [0-9]{2} ) -?  # month
         (?<day>   [0-9]{2} )     # day`, 'x');

    // XRegExp.exec provides named backreferences on the result's groups property
    let match = XRegExp.exec('2021-02-22', date);
    assert.equal(match.groups.year, 2021);

    // It also includes optional pos and sticky arguments
    let pos = 3;
    const result = [];
    while (match = XRegExp.exec('<1><2><3>4<5>', /<(\d+)>/, pos, 'sticky')) {
      result.push(match[1]);
      pos = match.index + match[0].length;
    }
    assert.deepEqual(result, ['2', '3']);

    // XRegExp.replace allows named backreferences in replacements
    assert.equal(
      XRegExp.replace('2021-02-22', date, '$<month>/$<day>/$<year>'),
      '02/22/2021');
    assert.equal(XRegExp.replace('2021-02-22', date, (...args) => {
      // Named backreferences are on the last argument
      const groups = args[args.length - 1];
      return `${groups.month}/${groups.day}/${groups.year}`;
    }), '02/22/2021');

    // XRegExps compile to RegExps and work with native methods
    assert(date.test('2021-02-22'));
    // However, named captures must be referenced using numbered backreferences
    // if used with native methods
    assert.equal('2021-02-22'.replace(date, '$2/$3/$1'), '02/22/2021');

    // Use XRegExp.forEach to extract every other digit from a string
    const evens = [];
    XRegExp.forEach('1a2345', /\d/, (match, i) => {
      if (i % 2) evens.push(+match[0]);
    });
    assert.deepEqual(evens, [2, 4]);

    // Use XRegExp.matchChain to get numbers within <b> tags
    var m = XRegExp.matchChain('1 <b>2</b> 3 <B>4 \n 56</B>', [
      XRegExp('<b>.*?</b>', 'is'),
      /\d+/
    ]);
    assert.deepEqual(m, ['2', '4', '56']);

    // You can also pass forward and return specific backreferences
    const html =
      `<a href="https://xregexp.com/">XRegExp</a>
       <a href="https://www.google.com/">Google</a>`;
    var m = XRegExp.matchChain(html, [
      {regex: /<a href="([^"]+)">/i, backref: 1},
      {regex: XRegExp('(?i)^https?://(?<domain>[^/?#]+)'), backref: 'domain'}
    ]);
    assert.deepEqual(m, ['xregexp.com', 'www.google.com']);

    // Merge strings and regexes, with updated backreferences
    assert.equal(
      XRegExp.union(['m+a*n', /(bear)\1/, /(pig)\1/], 'i', {conjunction: 'or'}),
      '/m\\+a\\*n|(bear)\\1|(pig)\\2/i'
    );
  }

  const result = await run_code(code)
  t.pass()
})

test('xstate', async function(t) {
  function code() {
    var assert = require('assert');
    var { createMachine, interpret } = require('xstate');

    // Stateless machine definition
    // machine.transition(...) is a pure function used by the interpreter.
    const toggleMachine = createMachine({
      id: 'toggle',
      initial: 'inactive',
      states: {
        inactive: { on: { TOGGLE: 'active' } },
        active: { on: { TOGGLE: 'inactive' } }
      }
    });

    // Machine instance with internal state
    const toggleService = interpret(toggleMachine)
      .onTransition((state) => console.log(state.value))
      .start();

    assert.equal(toggleService.send('TOGGLE').value, 'active');
    assert.equal(toggleService.send('TOGGLE').value, 'inactive');
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('xtend', async function(t) {
  function code() {
    var assert = require('assert')
    var extend = require("xtend")

    // extend returns a new object. Does not mutate arguments
    var combination = extend({
      a: "a",
      b: "c"
    }, {
      b: "b"
    })

    assert.deepEqual(combination, { a: 'a', b: 'b' })
  }

  const result = await run_code(code)
  t.pass()
})

test('yaml', async function(t) {
  function code() {
    const assert = require('assert');
    const YAML = require('yaml');
    var expected = [ true, false, 'maybe', null ];
    var actual = YAML.parse('[ true, false, maybe, null ]\n');
    assert.deepEqual(actual, expected);

    var expected =
      'number: 3\nplain: string\nblock: |\n  two\n  lines\n'
    var actual = YAML.stringify(
      { number: 3, plain: 'string', block: 'two\nlines\n' })
    assert.deepEqual(actual, expected);
  }

  const result = await run_code(code)
  t.pass()
})

// Pass
test('zipmap', async function(t) {
  function code() {
    var assert = require('assert');
    var zipmap = require('zipmap');

    var keys = ['a', 'b', 'c'];
    var vals = [1, 2, 3];

    var map = zipmap(keys, vals);
    assert.deepEqual(map, { a: 1, b: 2, c: 3 });
  }

  const result = await run_code(code)
  t.pass()
})

test('function-bind on call on exec', async function(t) {
  function code() {
    var bind = require('function-bind');
    var $exec = bind.call(Function.call, RegExp.prototype.exec);
    $exec(/^%?[^%]*%?$/, "foo")
  }
  await t.notThrowsAsync(run_code(code))
})


test('redefine globalThis bug', async function(t) {
  await t.notThrowsAsync(run_file_test("redefine_global_this"))
})

test('stealthy require bug', async function(t) {
  await t.notThrowsAsync(run_file_test("stealthy_require_bug"))
})

test('proxyquire bug', async function(t) {
  await t.notThrowsAsync(run_file_test("proxyquire_bug"))
})
