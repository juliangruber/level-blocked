var test = require('tape');
var memdb = require('memdb');
var blocked = require('..');

test('without options', function (t) {
  t.plan(3);

  var db = memdb();
  var blocks = blocked(db, 3);

  db.batch()
  .put('key\xffblocks\xff0', new Buffer('val'))
  .put('key\xffblocks\xff1', new Buffer('ue'))
  .write(function(err) {
    t.error(err, 'db.batch');

    blocks.read('key', function(err, block) {
      t.error(err);
      t.equal(block.toString(), 'value', 'whole value');
    });
  });
});

test('with options', function (t) {
  t.plan(3);

  var db = memdb();
  var blocks = blocked(db, 3);

  db.batch()
  .put('key\xffblocks\xff0', new Buffer('val'))
  .put('key\xffblocks\xff1', new Buffer('ue'))
  .write(function(err) {
    t.error(err, 'db.batch');

    blocks.read('key', {
      start: 1,
      end: 3
    }, function(err, block) {
      t.error(err);
      t.equal(block.toString(), 'alu', 'part of value');
    });
  });
});

test('not found', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 3);

  blocks.read('key', function(err, value) {
    t.ok(err, 'error');
    t.ok(err.notFound, 'error.notFound');
  });
});

