var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var through = require('through');
var tapFormatter = require('./tapFormatter');
var has = require('./util').has;
var nextTick = require('./util').nextTick;


module.exports = TestRunner;


inherits(TestRunner, EventEmitter);
function TestRunner() {
    this.tests = [];
    this.state = 'ready';
    this._only = null;
    this._stream = through();
    this._testId = 0;
    this._testsPending = [];
    this._nextTest = 0;
}

TestRunner.prototype.createStream = function(opts) {
    var self = this;
    opts = opts || {};

    var output = opts.objectMode
        ? self._stream.pipe(through())
        : self._stream.pipe(tapFormatter());

    return output;
};

TestRunner.prototype.runTests = function() {
    var self = this;

    if (self.state != 'ready') {
        throw new Error('runTests called twice');
    }

    self.state = 'prerun';

    nextTick(function() {
        self._testsPending = self.tests.slice(0);
        self.state = 'running';
        self._runTests();
    });
};

TestRunner.prototype._runTests = function() {
    var self = this;
    var test;

    while ((test = self._testsPending.shift())) {
        test.run();
        if (!test.ended) {
            return test.once('end', function() {
                nextTick(function() {self._runTests()});
            });
        }
    }
    self.state = 'done';
    self.emit('done');
};

TestRunner.prototype.push = function(test) {
    if (this._only) {
        if (test.only) throw new Error('Trying to add `only` test twice');
        return;
    }
    if (test.only) {
        this._only = test;
        this.tests = [];
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

TestRunner.prototype.close = function() {
    if (this.closed) {
        this._stream.emit('error', new Error('ALREADY CLOSED'));
    }

    for (var i = 0; i < this.tests.length; i++) {
        var t = this.tests[i];
        t._exit();
    }

    this.closed = true;
    this._stream.push(null);
};

TestRunner.prototype.testsLeft = function() {
    return this.state == 'ready' || this.state == 'prerun'
        ? this.tests.length
        : this._testsPending.length;
};
