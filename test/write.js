var test = require('tape');
var memdb = require('memdb');
var blocked = require('..');
var mirror = require('./mirror');

test('single block', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 1024);

  blocks.write('key', 'value', function(err) {
    t.error(err);

    mirror(db, {
      'key\xffblocks\xff0': 'value'
    }, t.error.bind(t));
  });
});

test('multiple blocks', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 3);

  blocks.write('key', 'value', function(err) {
    t.error(err);

    mirror(db, {
      'key\xffblocks\xff0': 'val',
      'key\xffblocks\xff1': 'ue'
    }, t.error.bind(t));
  });
});

test('start inside first block', function (t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 1024);

  blocks.write('key', 'value', {
    start: 1
  }, function(err) {
    t.error(err);

    mirror(db, {
      'key\xffblocks\xff0': '\x00value'
    }, t.error.bind(t));
  });
});

test('start at second block', function(t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 5);

  blocks.write('key', 'value', {
    start: 5
  }, function(err) {
    t.error(err);

    mirror(db, {
      'key\xffblocks\xff0': '\x00\x00\x00\x00\x00',
      'key\xffblocks\xff1': 'value'
    }, t.error.bind(t));
  });
});

test('start inside second block', function(t) {
  t.plan(2);

  var db = memdb();
  var blocks = blocked(db, 5);

  blocks.write('key', 'value', {
    start: 6
  }, function(err) {
    t.error(err);

    mirror(db, {
      'key\xffblocks\xff0': '\x00\x00\x00\x00\x00',
      'key\xffblocks\xff1': '\x00valu',
      'key\xffblocks\xff2': 'e'
    }, t.error.bind(t));
  });
});

