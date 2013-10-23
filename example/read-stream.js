var memdb = require('memdb');
var blocked = require('..');

var db = memdb();
var blocks = blocked(db, 3);

db.batch()
.put('key\xffblocks\xff0', new Buffer('val'))
.put('key\xffblocks\xff1', new Buffer('ue'))
.write(function(err) {
  if (err) throw err;

  blocks.createReadStream('key').on('data', function(block) {
    console.log('block: %s', block);
  });
});

