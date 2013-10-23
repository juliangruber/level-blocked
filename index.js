var Readable = require('stream').Readable
  || require('readable-stream').Readable;

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

  var startIdx = start
    ? Math.floor(start / this.blockSize)
    : 0;
  var endIdx = endSet && opts.end > 0
    ? Math.floor(opts.end / this.blockSize)
    : -1;

  var blockStart = start
    ? start % this.blockSize
    : 0;
  var blockEnd = endSet && opts.end % this.blockSize;

  var idx = startIdx;

  rs._read = function() {
    if (endSet && idx > endIdx) return rs.push(null);

    db.get(join(key, 'blocks', idx), function(err, block) {
      if (err) {
        if (!err.notFound || err.notFound && idx == 0)
          rs.emit('error', err);
        else
          rs.push(null);
        return;
      }

      if (start != 0 && idx == startIdx) {
        block = block.slice(blockStart);
      }
      if (endSet && idx == endIdx) {
        block = block.slice(0, blockEnd + 1);
      }
      if (!block.length) return rs.push(null);

      idx++;
      rs.push(block);
    });
  };

  return rs;
}

function join() {
  return [].slice.call(arguments).join('\xff');
}

