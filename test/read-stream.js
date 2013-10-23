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

