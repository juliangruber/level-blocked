
# level-blocked

[Blocked data storage](http://en.wikipedia.org/wiki/Block_(data_storage)
on top of [LevelUp](https://github.com/rvagg/node-levelup).

[![build status](https://secure.travis-ci.org/juliangruber/level-blocked.png)](http://travis-ci.org/juliangruber/level-blocked)

## work in progress

There still are methods and options missing, but eventually the api will
mirror the relevant parts of the node.js [fs api](http://nodejs.org/api/fs.html)
as closely as possible.

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

### blocks.createReadStream(key)

```js
db.batch()
.put('key\xffblocks\xff0', new Buffer('val'))
.put('key\xffblocks\xff1', new Buffer('ue'))
.write(function(err) {
  if (err) throw err;

  blocks.createReadStream('key').on('data', function(block) {
    console.log('block: %s', block);
    // => block: val
    // => block: ue
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
