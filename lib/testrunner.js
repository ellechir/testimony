var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var through = require('through');
var tapFormatter = require('./tapFormatter');
var has = require('./util').has;
var nextTick = require('./util').nextTick;


module.exports = TestRunner;


inherits(TestRunner, EventEmitter);
function TestRunner () {
    this.count = 0;
    this.fail = 0;
    this.pass = 0;
    this._only = null;
    this._stream = through();
    this.tests = [];
    this._testId = 0;
    this._nextTest = 0;
}

TestRunner.prototype.createStream = function (opts) {
    var self = this;
    opts = opts || {};

    var output = opts.objectMode
        ? self._stream.pipe(through())
        : self._stream.pipe(tapFormatter());

    return output;
};

TestRunner.prototype.runTests = function() {
    var self = this;

    nextTick(function next() {
        var test;

        while ((test = self._getNextTest())) {
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

TestRunner.prototype.push = function(test) {
    if (test.only) {
        if (this._only) {
            throw new Error('Trying to add `only` test twice');
        }
        this._only = test;
    }
    this.tests.push(test);
    this._watch(test);
};

TestRunner.prototype._watch = function(test, extra) {
    var self = this;
    extra = extra || {};
    //we can't use `self.tests.length` because of subtests
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

    test.on('subtest', function(subtest) {
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

TestRunner.prototype.close = function () {
    if (this.closed) {
        this._stream.emit('error', new Error('ALREADY CLOSED'));
    }

    for (var i = 0; i < this.tests.length; i++) {
        var t = this.tests[i];
        if (this._only && t != this._only) continue;
        t._exit();
    }

    this.closed = true;
    this._stream.push(null);
};

TestRunner.prototype._getNextTest = function() {
    if (this._nextTest == null) {
        return null;
    }

    if (this._only) {
        this._nextTest = null;
        return this._only;
    }

    return this.tests[this._nextTest++];
};
