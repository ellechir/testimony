var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var through = require('through');
var has = require('./util').has;
var nextTick = require('./util').nextTick;
var extend = require('shallow-extend');


module.exports = TestRunner;


inherits(TestRunner, EventEmitter);
function TestRunner() {
    this.tests = [];
    this.state = 'ready';
    this._only = null;
    this._stream = through();
    this._testsPending = [];
    this._nextTest = 0;
}

TestRunner.prototype.createStream = function(opts) {
    return this._stream.pipe(through());
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

TestRunner.prototype._watch = function(test) {
    var self = this;
    var info = {
        testName: test.name,
        testId: test.id,
        parentId: test.parentId
    };

    test.once('prerun', function() {
        self._stream.push(extend({type: 'test'}, info));
    });

    test.on('subtest', function(subtest) {
        self._watch(subtest);
    });

    test.on('result', function(result) {
        self._stream.push(extend({}, result, info));
    });

    test.on('end', function() {
        self._stream.push(extend({type: 'end'}, info));
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
    this._stream.end();
};

TestRunner.prototype.testsLeft = function() {
    return this.state == 'ready' || this.state == 'prerun'
        ? this.tests.length
        : this._testsPending.length;
};
