var test = require('tape');
var memdb = require('memdb');
var blocked = require('..');

test('single block', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 1024);

  db.put('key\xffblocks\xff0', new Buffer('value'), function(err) {
    t.error(err, 'db.put');

    blocks.createReadStream('key').on('data', function(block) {
      t.equal(block.toString(), 'value', 'value of data event');
    });
  });
});

test('multiple blocks', function (t) {
  t.plan(3);

  var db = memdb();
  var blocks = blocked(db, 3);

  db.batch()
  .put('key\xffblocks\xff0', new Buffer('val'))
  .put('key\xffblocks\xff1', new Buffer('ue'))
  .write(function(err) {
    t.error(err, 'db.batch');

    var i = 0;
    blocks.createReadStream('key').on('data', function(block) {
      if (i == 0) {
        t.equal(block.toString(), 'val', 'first value');
      } else {
        t.equal(block.toString(), 'ue', 'second value');
      }
      i++;
    });
  });
});

test('start at first block', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 1024);

  db.put('key\xffblocks\xff0', new Buffer('value'), function(err) {
    t.error(err, 'db.put');

    blocks.createReadStream('key', { start: 0 })
    .on('data', function(block) {
      t.equal(block.toString(), 'value', 'first block');
    });
  });
});

test('start inside first block', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 1024);

  db.put('key\xffblocks\xff0', new Buffer('value'), function(err) {
    t.error(err, 'db.put');

    blocks.createReadStream('key', { start: 2 })
    .on('data', function(block) {
      t.equal(block.toString(), 'lue', 'part of first block');
    });
  });
});

test('start at second block', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 3);

  db.batch()
  .put('key\xffblocks\xff0', new Buffer('val'))
  .put('key\xffblocks\xff1', new Buffer('ue'))
  .write(function(err) {
    t.error(err, 'db.batch');

    blocks.createReadStream('key', { start: 3 })
    .on('data', function(block) {
      t.equal(block.toString(), 'ue', 'second block');
    });
  });
});

test('start inside second block', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 3);

  db.batch()
  .put('key\xffblocks\xff0', new Buffer('val'))
  .put('key\xffblocks\xff1', new Buffer('ue'))
  .write(function(err) {
    t.error(err, 'db.batch');

    blocks.createReadStream('key', { start: 4 })
    .on('data', function(block) {
      t.equal(block.toString(), 'e', 'part of second block');
    });
  });
});

test('start out of bounds', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 1024);

  db.put('key\xffblocks\xff0', new Buffer('value'), function(err) {
    t.error(err, 'db.put');

    blocks.createReadStream('key', { start: 5 })
    .on('data', function() {
      t.fail();
    })
    .on('end', function() {
      t.ok(true, 'empty');
    });
  });
});

test('end at first block', function (t) {
  t.plan(3);

  var db = memdb();
  var blocks = blocked(db, 1024);

  db.put('key\xffblocks\xff0', new Buffer('value'), function(err) {
    t.error(err, 'db.put');

    blocks.createReadStream('key', { end: 0 })
    .on('data', function(block) {
      t.equal(block.toString(), 'v', 'part of first block');
    })
    .on('end', function() {
      t.ok(true, 'empty');
    });
  });
});

test('end inside first block', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 1024);

  db.put('key\xffblocks\xff0', new Buffer('value'), function(err) {
    t.error(err, 'db.put');

    blocks.createReadStream('key', { end: 2 })
    .on('data', function(block) {
      t.equal(block.toString(), 'val', 'part of first block');
    });
  });
});

test('end at second block', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 3);

  db.batch()
  .put('key\xffblocks\xff0', new Buffer('val'))
  .put('key\xffblocks\xff1', new Buffer('ue'))
  .write(function(err) {
    t.error(err, 'db.batch');

    blocks.createReadStream('key', { end: 2 })
    .on('data', function(block) {
      t.equal(block.toString(), 'val', 'first block');
    });
  });
});

test('end inside second block', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 3);

  db.batch()
  .put('key\xffblocks\xff0', new Buffer('val'))
  .put('key\xffblocks\xff1', new Buffer('ue'))
  .write(function(err) {
    t.error(err, 'db.batch');

    var data = '';
    blocks.createReadStream('key', { end: 3 })
    .on('data', function(block) {
      data += block.toString();
    })
    .on('end', function() {
      t.equal(data.toString(), 'valu', 'first and part of second block');
    })
  });
});

test('end out of bounds', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 1024);

  db.put('key\xffblocks\xff0', new Buffer('value'), function(err) {
    t.error(err, 'db.put');

    blocks.createReadStream('key', { end: 999 })
    .on('data', function(block) {
      t.equal(block.toString(), 'value');
    })
  });
});

test('start and end', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 3);

  db.batch()
  .put('key\xffblocks\xff0', new Buffer('val'))
  .put('key\xffblocks\xff1', new Buffer('ue'))
  .write(function(err) {
    t.error(err, 'db.batch');

    var value = '';
    blocks.createReadStream('key', { start: 1, end: 3 })
    .on('data', function(block) {
      value += block.toString();
    })
    .on('end', function() {
      t.equal(value.toString(), 'alu', 'parts of both blocks');
    });
  });
});

test('not found', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 3);

  blocks.createReadStream('key')
  .on('data', function () {
    t.fail();
  })
  .on('error', function (err) {
    t.ok(err, 'error');
    t.ok(err.notFound, 'error.notFound');
  });
});

