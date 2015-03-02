var Runner = require('./testrunner');
var Assertions = require('./assert');
var defined = require('defined');
var extend = require('shallow-extend');
var pick = require('shallow-pick');
var path = require('path');
var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var util = require('./util');
var nextTick = require('./util').nextTick;


module.exports = Test;

//'static' id counter
var TEST_ID = 0;


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


inherits(Test, EventEmitter);
function Test(name_, opts_, cb_) {
    var args = getTestArgs(name_, opts_, cb_);

    this.id = ++TEST_ID;
    this.parentId = args.opts.parentId;
    this.name = args.name || '(anonymous)';
    this.assertCount = 0;
    this.only = args.opts.only || false;
    this.skipped = args.opts.skip || false;
    this.timeout = args.opts.timeout;
    this._plan = undefined;
    this._cb = args.cb;
    this._subtestRunner = new Runner();
    this._ok = true;

    //mixing assertions in
    mixinAssertions(this);

    //binding all own methods, overriding occasionally `Assertions` methods
    //clashing with own ones
    util.bindPrototype(this, Test);
}

/**
 * Functions plugging all the assertions into the test object.
 * Each assertion will take the following form:
 *
 *     function(arg1, ...argN, [message])
 *
 * where `arg1, ...argN` are the arguments necessary for the corresponding
 * assertion (e.g. only one argument for `ok()`)
 */
function mixinAssertions(test) {
    util.eachOwnFunction(Assertions.prototype, function(fn, key) {
        if (fn.length < 1) return;

        //exposing the assertion method
        test[key] = function(/*args..., message*/) {
            var args = Array.prototype.slice.call(arguments, 0, fn.length - 1);
            var message = arguments[fn.length - 1];

            //adding callback as the last arg
            args.push(function(err, params) {
                test._assert(!err, extend({}, params, {
                    operator: key,
                    message: message || (params && params.message) || ''
                }));
            });

            fn.apply(test, args);
        };
    });
}

Test.prototype.run = function() {
    this.started = true;

    if (!this._cb || this.skipped) {
        //todo print the comment message? or move it into the runner completely?
        return this._end();
    }

    this.emit('prerun');

    try {
        if (this.timeout !== undefined) {
            this.timeoutAfter(this.timeout);
        }
        this._cb(this);
    } catch (err) {
        this._fail('error during test execution: ' + err, {
            error: err
        });
        this._end();
        return;
    }

    //not ending here because of some async assertions can still be waiting
};

Test.prototype.test = function(name, opts, cb) {
    var self = this;

    var args = getTestArgs.apply(null, arguments);
    args.opts.parentId = this.id;
    var t = new Test(args.name, args.opts, args.cb);

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

Test.prototype.timeoutAfter = function(ms) {
    var self = this;
    if (!ms) throw new Error('timeoutAfter requires a timespan');

    var timeout = setTimeout(function() {
        self._fail('test timed out after ' + ms + 'ms');
        self.end();
    }, ms);

    this.once('end', function() {
        clearTimeout(timeout);
    });
};

Test.prototype.comment = function(msg) {
    this._emitResult({
        type: 'message',
        operator: 'comment',
        message: msg
    });
};

Test.prototype.plan = function(n) {
    //todo check whether the old plan was there
    //or some assertions were already made
    this._plan = n;
    this.emit('plan', n);
};

Test.prototype.end = function(err, msg, extra) {
    if (err) {
        this._assert(!err, {
            operator: 'end',
            error: err,
            message: msg || 'end() got an error: ' + err,
            extra: extra
        });
    }

    if (this.calledEnd) {
        this._fail('end() called twice');
    }
    this.calledEnd = true;

    this._end();
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
        this._fail('plan != count', {
            expected: this._plan,
            actual: this._plan - pendingAsserts
        });
    }
    this.ended = true;
};

Test.prototype._exit = function() {
    if (!this.started) {
        this.emit('prerun');
        this._fail('test exited without starting', {
            exiting: true
        });
    } else if (this._planned() && this.assertCount !== this._plan) {
        this._planError = true;
        this._fail('plan != count', {
            expected: this._plan,
            actual: this.assertCount,
            exiting: true
        });
    } else if (!this.ended) {
        this._fail('test exited without ending', {
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

Test.prototype._fail = function(msg, extra) {
    this._assert(false, {
        message: msg,
        operator: 'fail',
        extra: extra
    });
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
        self._fail('plan != count', {
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
        message: opts.message && '' + opts.message || ''
    });

    extend(res, pick(opts, 'id', 'actual', 'expected', 'skip'));

    if (util.has(opts, 'ok')) {
        res.ok = !!opts.ok;
        if (!res.ok) {
            res.error = opts.error;
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
