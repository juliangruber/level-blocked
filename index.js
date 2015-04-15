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
      debug('got %s', block);

      if (start != 0 && idx == startAt.idx) {
        debug('omit first %s bytes', startAt.offset);
        block = block.slice(startAt.offset);
      }
      if (idx == endAt.idx && endAt.offset < block.length) {
        debug('omit last %s bytes', block.length - endAt.offset - 1);
        block = block.slice(0, endAt.offset + 1);
      }
      if (!block.length) {
        debug('end');
        return rs.push(null);
      }

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
  debug('write to "%s" "%s" %j', key, buf, opts);

  var self = this;
  var batch = opts.batch || self.db.batch();
  var start = opts.start || 0;

  var startAt = {
    idx: floor(start / self.blockSize),
    offset: start % self.blockSize
  };
  startAt.key = join(key, 'blocks', startAt.idx);
  debug('start at %j', startAt);

  var endBlockIdx = ceil((start + buf.length) / self.blockSize) - 1;
  debug('end at {"idx":%s}', endBlockIdx);

  self.fillBlocksUntil(key, startAt.idx, batch, function(err, lastBlockIdx) {
    if (err) t.error(err);

    var writeNow = min(self.blockSize, buf.length);
    var sourceStart = 0;
    var targetStart = startAt.offset;
    var targetEnd = writeNow + (startAt.idx * self.blockSize) - start;
    
    self.db.get(startAt.key, function(err, block) {
      if (err && !err.notFound) return cb(err);

      if (!block) {
        block = new Buffer(writeNow + startAt.offset);
        block.fill('\x00');
      }
      debug('first block "%s"', block);

      debug('copy %s bytes from "%s" at %s to "%s" at %s', writeNow, buf, sourceStart, block, targetStart);
      buf.copy(block, targetStart, sourceStart, writeNow);

      debug('batch "%s" = "%s"', startAt.key, block);
      batch.put(startAt.key, block);

      var bytesLeft = buf.length - writeNow;
      if (startAt.idx == endBlockIdx || !bytesLeft) return batch.write(cb);

      for (var idx = startAt.idx + 1; idx <= endBlockIdx; idx++) {
        var offset = buf.length - bytesLeft;
        var _key = join(key, 'blocks', idx);
        var _value = buf.slice(offset, offset + min(self.blockSize, bytesLeft));
        debug('batch "%s" = "%s"', _key, _value);
        batch.put(_key, _value);
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
  debug('fill blocks for "%s" until %s', key, idx);

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

