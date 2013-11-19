var test = require('tape');
var blocked = require('..');
var memdb = require('memdb');
var mirror = require('./mirror');

test('create all new blocks', function(t) {
  t.plan(4);

  var db = memdb();
  var blocks = blocked(db, 3);
  var batch = db.batch();

  blocks.fillBlocksUntil('key', 2, batch, function(err, lastIdx) {
    t.error(err);
    t.ok(typeof lastIdx == 'undefined');

    batch.write(function(err) {
      t.error(err);

      mirror(db, {
        'key\xffblocks\xff0': '\x00\x00\x00',
        'key\xffblocks\xff1': '\x00\x00\x00',
        'key\xffblocks\xff2': '\x00\x00\x00'
      }, t.error.bind(t));
    });
  });
});

test('create some new blocks', function(t) {
  t.plan(5);

  var db = memdb();
  var blocks = blocked(db, 3);
  var batch = db.batch();

  db.put('key\xffblocks\xff0', '\x00\x00\x00', function(err) {
    t.error(err);

    blocks.fillBlocksUntil('key', 2, batch, function(err, lastIdx) {
      t.error(err);
      t.equal(lastIdx, 0);

      batch.write(function(err) {
        t.error(err);

        mirror(db, {
          'key\xffblocks\xff0': '\x00\x00\x00',
          'key\xffblocks\xff1': '\x00\x00\x00',
          'key\xffblocks\xff2': '\x00\x00\x00'
        }, t.error.bind(t));
      });
    });
  });
});

test('create no new blocks', function(t) {
  t.plan(5);

  var db = memdb();
  var blocks = blocked(db, 3);
  var batch = db.batch();

  db.put('key\xffblocks\xff0', '\x00\x00\x00', function(err) {
    t.error(err);

    blocks.fillBlocksUntil('key', 0, batch, function(err, lastIdx) {
      t.error(err);
      t.equal(lastIdx, 0);

      batch.write(function(err) {
        t.error(err);

        mirror(db, {
          'key\xffblocks\xff0': '\x00\x00\x00'
        }, t.error.bind(t));
      });
    });
  });
});

