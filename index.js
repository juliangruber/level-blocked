var Readable = require('stream').Readable
  || require('readable-stream').Readable;
var once = require('once');

module.exports = Blocked;

function Blocked(db, blockSize) {
  if (!(this instanceof Blocked)) return new Blocked(db, blockSize);

  this.db = db;
  this.blockSize = blockSize || 1024;
}

Blocked.prototype.createReadStream = function(key, opts) {
  if (!opts) opts = {};

  var rs = Readable();
  var db = this.db;

  var start = opts.start || 0;
  var endSet = typeof opts.end != 'undefined';

  var startBlock = {
    idx: start
      ? Math.floor(start / this.blockSize)
      : 0,
    start: start
      ? start % this.blockSize
      : 0
  };

  var endBlock = {
    idx: endSet && opts.end > 0
      ? Math.floor(opts.end / this.blockSize)
      : -1,
    end: endSet && opts.end % this.blockSize
  };

  var idx = startBlock.idx;

  rs._read = function() {
    if (endSet && idx > endBlock.idx) return rs.push(null);

    db.get(join(key, 'blocks', idx), function(err, block) {
      if (err) {
        if (!err.notFound || err.notFound && idx == 0)
          rs.emit('error', err);
        else
          rs.push(null);
        return;
      }

      if (start != 0 && idx == startBlock.idx) {
        block = block.slice(startBlock.start);
      }
      if (endSet && idx == endBlock.idx) {
        block = block.slice(0, Math.min(block.length, endBlock.end + 1));
      }
      if (!block.length) return rs.push(null);

      idx++;
      rs.push(block);
    });
  };

  return rs;
};

Blocked.prototype.read = function(key, opts, cb) {
  if (typeof opts == 'function') {
    cb = opts;
    opts = {};
  }

  cb = once(cb);
  var chunks = [];

  this.createReadStream(key, opts)
  .on('error', cb)
  .on('data', function(chunk) {
    chunks.push(chunk);
  })
  .on('end', function() {
    cb(null, Buffer.concat(chunks));
  });
};

function join() {
  return [].slice.call(arguments).join('\xff');
}

