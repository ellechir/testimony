var Runner = require('./testrunner');
var deepEqual = require('deep-equal');
var defined = require('defined');
var extend = require('shallow-extend');
var pick = require('shallow-pick');
var path = require('path');
var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var has = require('./util').has;
var nextTick = require('./util').nextTick;


module.exports = Test;


var getTestArgs = function(name_, opts_, cb_) {
    var name = '(anonymous)';
    var opts = {};
    var cb;

    for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];
        var t = typeof arg;
        if (t === 'string') {
            name = arg;
        }
        else if (t === 'object') {
            opts = arg || opts;
        }
        else if (t === 'function') {
            cb = arg;
        }
    }
    return { name: name, opts: opts, cb: cb };
};

function Test(name_, opts_, cb_) {
    var args = getTestArgs(name_, opts_, cb_);

    this.name = args.name || '(anonymous)';
    this.assertCount = 0;
    this.only = args.opts.only || false;
    this._skip = args.opts.skip || false;
    this._plan = undefined;
    this._cb = args.cb;
    this._subtestRunner = new Runner();
    this._ok = true;

    for (var prop in this) {
        this[prop] = (function bind(self, val) {
            if (typeof val === 'function') {
                return function bound() {
                    return val.apply(self, arguments);
                };
            }
            else return val;
        })(this, this[prop]);
    }
}
inherits(Test, EventEmitter);

Test.prototype.run = function() {
    this.started = true;

    if (!this._cb || this._skip) {
        return this._end();
    }

    this.emit('prerun');

    try {
        this._cb(this);
    } catch (err) {
        this.error(err);
        this._end();
        return;
    }

    //not ending here because of some async assertions can still be waiting
};

Test.prototype.test = function(name, opts, cb) {
    var self = this;
    var t = new Test(name, opts, cb);
    this._subtestRunner.push(t);
    this.emit('subtest', t);
    t.on('prerun', function() {
        //each subtest declaration is counted as a separate assert, is it right?
        self.assertCount++;
    });

    if (!self._pendingAsserts()) {
        nextTick(function() {
            self._end();
        });
    }
};

Test.prototype.comment = function(msg) {
    this._emitResult({
        type: 'message',
        operator: 'comment',
        message: msg
    });
};

Test.prototype.plan = function(n) {
    this._plan = n;
    this.emit('plan', n);
};

Test.prototype.end = function(err, msg, extra) {
    var self = this;
    if (arguments.length >= 1) {
        this.ifError(err, msg, extra);
    }

    if (this.calledEnd) {
        this.fail('.end() called twice');
    }
    this.calledEnd = true;

    self._end();
};

Test.prototype._end = function() {
    var self = this;

    if (this._subtestRunner.state == 'ready') {
        this._subtestRunner.once('done', function() {self._end();});
        this._subtestRunner.runTests();
        return;
    } else if (this._subtestRunner.state != 'done') {
        //this can happen if after all planned assertions we call end()
        return;
    }

    if (!this.ended) {
        this.emit('end');
    }
    var pendingAsserts = this._pendingAsserts();
    if (this._planned() && pendingAsserts) {
        this._planError = true;
        this.fail('plan != count', {
            expected: this._plan,
            actual: this._plan - pendingAsserts
        });
    }
    this.ended = true;
};

Test.prototype._exit = function() {
    if (!this.started) {
        this.emit('prerun');
        this.fail('test exited without starting', {
            exiting: true
        });
    } else if (this._planned() && this.assertCount !== this._plan) {
        this._planError = true;
        this.fail('plan != count', {
            expected: this._plan,
            actual: this.assertCount,
            exiting: true
        });
    } else if (!this.ended) {
        this.fail('test exited without ending', {
            exiting: true
        });
    }
};

Test.prototype._pendingAsserts = function() {
    return this._plan === undefined
        ? 1 //always treating an absence of plan as some assert pending
        : this._plan - (this._subtestRunner.testsLeft() + this.assertCount);
};


Test.prototype._planned = function() {
    return !this._planError && this._plan !== undefined;
};

Test.prototype._assert = function assert(ok, opts) {
    var self = this;
    self._ok = Boolean(this._ok && ok);

    var res = extend({}, opts, opts.extra, {
        id: self.assertCount++,
        ok: ok,
        type: 'assert'
    });

    self._emitResult(res);

    var pendingAsserts = self._pendingAsserts();

    if (self._planned() && pendingAsserts < 0) {
        self._planError = true;
        self.fail('plan != count', {
            expected: self._plan,
            actual: self._plan - pendingAsserts
        });
    } else if (!pendingAsserts) {
        if (res.exiting) {
            self._end();
        } else {
            nextTick(function() {
                self._end();
            });
        }
    }
};

/**
 * Emits a 'result' event with a properly formatted object attached
 */
Test.prototype._emitResult = function(opts) {
    var res = extend(this._readStack(), {
        type: opts.type && '' + opts.type || '',
        operator: opts.operator && '' + opts.operator || '',
        name: opts.message && '' + opts.message || ''
    });

    extend(res, pick(opts, 'id', 'actual', 'expected', 'skip'));

    if (has(opts, 'ok')) {
        res.ok = !!opts.ok;
        if (!res.ok) {
            res.error = defined(opts.error, new Error(res.name));
        }
    }

    this.emit('result', res);
};

/**
 * Tries to read current stacktrace to infer current runtime params
 */
Test.prototype._readStack = function() {
    var res = {};

    var e = new Error('exception');
    var err = (e.stack || '').split('\n');
    var dir = path.dirname(__dirname) + '/';

    for (var i = 0; i < err.length; i++) {
        var m = /^\s*\bat\s+(.+)/.exec(err[i]);
        if (!m) continue;

        var s = m[1].split(/\s+/);
        var filem = /(\/[^:\s]+:(\d+)(?::(\d+))?)/.exec(s[1]);
        if (!filem) {
            filem = /(\/[^:\s]+:(\d+)(?::(\d+))?)/.exec(s[3]);

            if (!filem) continue;
        }

        if (filem[1].slice(0, dir.length) === dir) continue;

        res.functionName = s[0];
        res.file = filem[1];
        res.line = Number(filem[2]);
        if (filem[3]) {
            res.column = filem[3];
        }

        res.at = m[1];
        break;
    }

    return res;
};

Test.prototype.fail = function(msg, extra) {
    this._assert(false, {
        message: msg,
        operator: 'fail',
        extra: extra
    });
};

Test.prototype.pass = function(msg, extra) {
    this._assert(true, {
        message: msg,
        operator: 'pass',
        extra: extra
    });
};

Test.prototype.skip = function(msg, extra) {
    this._assert(true, {
        message: msg,
        operator: 'skip',
        skip: true,
        extra: extra
    });
};

Test.prototype.ok
= Test.prototype['true']
= Test.prototype.assert
= function(value, msg, extra) {
    this._assert(value, {
        message: msg,
        operator: 'ok',
        expected: true,
        actual: value,
        extra: extra
    });
};

Test.prototype.notOk
= Test.prototype['false']
= Test.prototype.notok
= function(value, msg, extra) {
    this._assert(!value, {
        message: msg,
        operator: 'notOk',
        expected: false,
        actual: value,
        extra: extra
    });
};

Test.prototype.error
= Test.prototype.ifError
= Test.prototype.ifErr
= Test.prototype.iferror
= function(err, msg, extra) {
    this._assert(!err, {
        message: defined(msg, String(err)),
        operator: 'error',
        actual: err,
        extra: extra
    });
};

Test.prototype.equal
= Test.prototype.equals
= Test.prototype.isEqual
= Test.prototype.is
= Test.prototype.strictEqual
= Test.prototype.strictEquals
= function(a, b, msg, extra) {
    this._assert(a === b, {
        message: defined(msg, 'should be equal'),
        operator: 'equal',
        actual: a,
        expected: b,
        extra: extra
    });
};

Test.prototype.notEqual
= Test.prototype.notEquals
= Test.prototype.notStrictEqual
= Test.prototype.notStrictEquals
= Test.prototype.isNotEqual
= Test.prototype.isNot
= Test.prototype.not
= Test.prototype.doesNotEqual
= Test.prototype.isInequal
= function(a, b, msg, extra) {
    this._assert(a !== b, {
        message: defined(msg, 'should not be equal'),
        operator: 'notEqual',
        actual: a,
        notExpected: b,
        extra: extra
    });
};

Test.prototype.deepEqual
= Test.prototype.deepEquals
= Test.prototype.isEquivalent
= Test.prototype.same
= function(a, b, msg, extra) {
    this._assert(deepEqual(a, b, { strict: true }), {
        message: defined(msg, 'should be equivalent'),
        operator: 'deepEqual',
        actual: a,
        expected: b,
        extra: extra
    });
};

Test.prototype.deepLooseEqual
= Test.prototype.looseEqual
= Test.prototype.looseEquals
= function(a, b, msg, extra) {
    this._assert(deepEqual(a, b), {
        message: defined(msg, 'should be equivalent'),
        operator: 'deepLooseEqual',
        actual: a,
        expected: b,
        extra: extra
    });
};

Test.prototype.notDeepEqual
= Test.prototype.notEquivalent
= Test.prototype.notDeeply
= Test.prototype.notSame
= Test.prototype.isNotDeepEqual
= Test.prototype.isNotDeeply
= Test.prototype.isNotEquivalent
= Test.prototype.isInequivalent
= function(a, b, msg, extra) {
    this._assert(!deepEqual(a, b, { strict: true }), {
        message: defined(msg, 'should not be equivalent'),
        operator: 'notDeepEqual',
        actual: a,
        notExpected: b,
        extra: extra
    });
};

Test.prototype.notDeepLooseEqual
= Test.prototype.notLooseEqual
= Test.prototype.notLooseEquals
= function(a, b, msg, extra) {
    this._assert(deepEqual(a, b), {
        message: defined(msg, 'should be equivalent'),
        operator: 'notDeepLooseEqual',
        actual: a,
        expected: b,
        extra: extra
    });
};

Test.prototype['throws'] = function(fn, expected, msg, extra) {
    if (typeof expected === 'string') {
        msg = expected;
        expected = undefined;
    }
    var caught = undefined;
    try {
        fn();
    }
    catch (err) {
        caught = { error: err };
        var message = err.message;
        delete err.message;
        err.message = message;
    }

    var passed = caught;

    if (expected instanceof RegExp) {
        passed = expected.test(caught && caught.error);
        expected = String(expected);
    }

    this._assert(passed, {
        message: defined(msg, 'should throw'),
        operator: 'throws',
        actual: caught && caught.error,
        expected: expected,
        error: !passed && caught && caught.error,
        extra: extra
    });
};

Test.prototype.doesNotThrow = function(fn, expected, msg, extra) {
    if (typeof expected === 'string') {
        msg = expected;
        expected = undefined;
    }
    var caught = undefined;
    try {
        fn();
    }
    catch (err) {
        caught = { error: err };
    }
    this._assert(!caught, {
        message: defined(msg, 'should not throw'),
        operator: 'throws',
        actual: caught && caught.error,
        expected: expected,
        error: caught && caught.error,
        extra: extra
    });
};

Test.skip = function(name_, _opts, _cb) {
    var args = getTestArgs.apply(null, arguments);
    args.opts.skip = true;
    return new Test(args.name, args.opts, args.cb);
};

Test.only = function(name_, _opts, _cb) {
    var args = getTestArgs.apply(null, arguments);
    args.opts.only = true;
    return new Test(args.name, args.opts, args.cb);
};
