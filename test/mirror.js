var equal = require('deep-equal');

module.exports = mirror;

function mirror(db, want, cb) {
  var is = {};

  db.createReadStream()
  .on('data', function(kv) {
    is[kv.key] = kv.value.toString();
  })
  .on('end', function() {
    if (equal(is, want)) cb();
    else {
      cb(new Error('is: ' + JSON.stringify(is) + '\nwant: ' + JSON.stringify(want)));
    }
  });
}

