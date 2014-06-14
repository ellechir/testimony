var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var through = require('through');
var tapFormatter = require('./tapFormatter');
var nextTick = typeof setImmediate !== 'undefined'
    ? setImmediate
    : process.nextTick;

module.exports = Results;
inherits(Results, EventEmitter);

function Results () {
    if (!(this instanceof Results)) return new Results;
    this.count = 0;
    this.fail = 0;
    this.pass = 0;
    this._stream = through();
    this.tests = [];
    this._testId = 0;
}

Results.prototype.createStream = function (opts) {
    var self = this;
    opts = opts || {};

    var output = opts.objectMode
        ? self._stream.pipe(through())
        : self._stream.pipe(tapFormatter());

    //todo things will get weird if we call createStream() twice, so maybe call
    //runTests() explicitly?
    self._runTests();

    return output;
};

Results.prototype._runTests = function() {
    var self = this;

    nextTick(function next() {
        var test;

        while ((test = getNextTest(self))) {
            test.run();
            //todo get rid of 'ended' and use solely 'end' event
            if (!test.ended) {
                return test.once('end', function() {
                    nextTick(next);
                });
            }
        }
        self.emit('done');
        //todo: do we need extra close() method or just finish stream here?
    });
};

Results.prototype.only = function (name) {
    if (this._only) {
        //todo duplicating functionality in index.js
        throw new Error('Trying to call only() twice');
    }
    this._only = name;
};

Results.prototype.push = function(test) {
    this.tests.push(test);
    this._watch(test);
    this.emit('_push', test);
};

Results.prototype._watch = function(test, extra) {
    var self = this;
    extra = extra || {};
    var id = self._testId++;

    test.once('prerun', function() {
        var row = {
            type: 'test',
            name: test.name,
            id: id
        };
        if (has(extra, 'parent')) {
            row.parent = extra.parent;
        }
        self._stream.push(row);
    });

    //todo rename 'test' to 'subtest'
    test.on('test', function(subtest) {
        self._watch(subtest, { parent: id });
    });

    test.on('result', function(result) {
        result.test = id;
        self._stream.push(result);
    });

    test.on('end', function() {
        self._stream.push({ type: 'end', test: id });
    });
};

Results.prototype.close = function () {
    var self = this;
    if (self.closed) self._stream.emit('error', new Error('ALREADY CLOSED'));
    self.closed = true;
    self._stream.push(null);
};

//todo make it a method
function getNextTest (results) {
    if (!results._only) {
        return results.tests.shift();
    }

    while (results.tests.length) {
        var t = results.tests.shift();
        if (t && t.name === results._only) {
            return t;
        }
    }

    return null;
}

function has (obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}
