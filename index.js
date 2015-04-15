var Readable = require('stream').Readable
  || require('readable-stream').Readable;
var Writable = require('stream').Writable
  || require('readable-stream').Writable;
var once = require('once');
var debug = require('debug')('level-blocked');
var min = Math.min;
var floor = Math.floor;
var ceil = Math.ceil;

module.exports = Blocked;

function Blocked(db, blockSize) {
  if (!(this instanceof Blocked)) return new Blocked(db, blockSize);

  this.db = db;
  this.blockSize = blockSize || 1024;
}

Blocked.prototype.createReadStream = function(key, opts) {
  if (!opts) opts = {};
  debug('read "%s" %j', key, opts);

  var rs = Readable();
  var db = this.db;

  var start = opts.start || 0;
  var endSet = typeof opts.end != 'undefined';

  var startAt = {
    idx: floor((start || 0) / this.blockSize),
    offset: (start || 0) % this.blockSize
  };
  debug('start at %j', startAt);

  var endAt = {
    idx: endSet
      ? (opts.end > 0 ? floor(opts.end / this.blockSize) : 0)
      : Infinity,
    offset: endSet
      ? opts.end % this.blockSize
      : Infinity
  };
  debug('end at %j', endAt);

  var idx = startAt.idx;

  rs._read = function() {
    debug('read');

    if (idx > endAt.idx) {
      debug('end');
      return rs.push(null);
    }

    db.get(join(key, 'blocks', idx), function(err, block) {
      if (err) {
        if (!err.notFound || err.notFound && idx == 0) {
          rs.emit('error', err);
        } else {
          debug('end');
          rs.push(null);
        }
        return;
      }

      if (start != 0 && idx == startAt.idx) {
        block = block.slice(startAt.offset);
      }
      if (idx == endAt.idx) {
        block = block.slice(0, min(block.length, endAt.offset + 1));
      }
      if (!block.length) return rs.push(null);

      idx++;
      debug('push %s', block);
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

Blocked.prototype.createWriteStream = function(key, opts) {
  if (!opts) opts = {};

  var self = this;
  var ws = Writable();
  var offset = opts.start || 0;

  ws._write = function(buf, enc, cb) {
    self.write(key, buf, {
      start: offset
    }, function(err) {
      if (err) return cb(err);
      offset += buf.length;
      cb();
    });
  };

  return ws;
};

Blocked.prototype.write = function(key, buf, opts, cb) {
  if (typeof opts == 'function') {
    cb = opts;
    opts = {};
  }
  if (!opts) opts = {};
  if (!Buffer.isBuffer(buf)) buf = new Buffer(buf);

  var self = this;
  var batch = opts.batch || self.db.batch();
  var start = opts.start || 0;

  var startBlock = {
    idx: floor(start / self.blockSize),
    offset: start % self.blockSize
  };
  startBlock.key = join(key, 'blocks', startBlock.idx);
  var endBlockIdx = ceil((start + buf.length) / self.blockSize) - 1;

  self.fillBlocksUntil(key, startBlock.idx, batch, function(err, lastBlockIdx) {
    if (err) t.error(err);

    self.db.get(startBlock.key, function(err, block) {
      if (err && !err.notFound) return cb(err);

      var writeNow = min(self.blockSize, buf.length);
      var sourceStart = 0;
      var targetStart = startBlock.offset;
      var targetEnd = writeNow + (startBlock.idx * self.blockSize) - start;

      if (!block) {
        var len = writeNow;
        if (startBlock.idx == lastBlockIdx) len += (startBlock.idx * self.blockSize) - start;
        block = new Buffer(len);
        if (startBlock.idx == lastBlockIdx) block.fill('\x00', 0, (startBlock.idx * self.blocksize) - start);
      }

      buf.copy(block, targetStart, sourceStart, writeNow);
      batch.put(startBlock.key, block);

      var bytesLeft = buf.length - writeNow;
      if (startBlock.idx == endBlockIdx) return batch.write(cb);

      for (var idx = startBlock.idx + 1; idx <= endBlockIdx; idx++) {
        var offset = buf.length - bytesLeft;
        console.log('offset', offset, 'end', min(self.blockSize, bytesLeft))
        batch.put(
          join(key, 'blocks', idx),
          buf.slice(offset, offset + min(self.blockSize, bytesLeft))
        );
        bytesLeft -= self.blockSize;
      }
      batch.write(cb);
    });
  });
};

Blocked.prototype.fillBlocksUntil = function(key, idx, batch, cb) {
  cb = once(cb);
  var self = this;
  var last;

  self.db.createKeyStream({
    gt: key + '\xffblocks\xff',
    lt: key + '\xffblocks\xff\xff',
    limit: 1,
    reverse: true
  })
  .on('error', cb)
  .on('data', function(k) {
    last = Number(k.split('\xff').pop());
  })
  .on('end', function() {
    if (last == idx) return cb(null, last);

    for (var i = last || 0; i <= idx; i++) {
      var b = Buffer(self.blockSize);
      b.fill('\x00');
      batch.put(join(key, 'blocks', i), b);
    }
    cb(null, last);
  });
}

function join() {
  return [].slice.call(arguments).join('\xff');
}

