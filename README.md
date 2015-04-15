# level-blocked

[Blocked data storage](http://en.wikipedia.org/wiki/Block_(data_storage))
on top of [LevelUp](https://github.com/rvagg/node-levelup).

[![build status](https://secure.travis-ci.org/juliangruber/level-blocked.png)](http://travis-ci.org/juliangruber/level-blocked)

[![testling badge](https://ci.testling.com/juliangruber/level-blocked.png)](https://ci.testling.com/juliangruber/level-blocked)

## work in progress

The writing part still is missing.

## key design

```js
'<key>\xffblocks\xff<block index>'
```

## api

### var blocks = blocked(db, [blockSize])

* `db`: A [LevelUp](https://github.com/rvagg/node-levelup) database.
* `blockSize`: Each block's maximum size in bytes, defaults to `1024`.

```js
var level = require('level');
var blocked = require('level-blocked');

var db = level(__dirname + '/db');
var blocks = blocked(db, 3);
```

### blocks.createReadStream(key[, opts])

Streaming read access.

* `key`: The address of your data
* `opts.start`: The first byte to read
* `opts.end`: The last byte to read

```js
blocks.write('key', 'value', function(err){
  if (err) throw err;

  blocks.createReadStream('key').on('data', function(block) {
    console.log('block: %s', block);
    // => block: val
    // => block: ue
  });
});
```

### blocks.read(key[, opts], cb)

Callback / buffered read access.

* `key`: The address of your data
* `opts.start`: The first byte to read
* `opts.end`: The last byte to read

```js
blocks.write('key', 'value', function(err){
  if (err) throw err;

  blocks.read('key', function(err, block) {
    if (err) throw err;
    console.log('block: %s', block);
    // => block: value
  });
});
```

## installation

With [npm](https://npmjs.org) do:

```bash
npm install level-blocked
```

## license

(MIT)

Copyright (c) 2013 Julian Gruber &lt;julian@juliangruber.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
