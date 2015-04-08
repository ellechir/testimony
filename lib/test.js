var Runner = require('./testrunner');
var Assertions = require('./assert');
var defined = require('defined');
var extend = require('shallow-extend');
var pick = require('shallow-pick');
var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var util = require('./util');
var nextTick = require('./util').nextTick;


module.exports = Test;

//'static' id counter
var TEST_ID = 0;


var getTestArgs = function(/*name, opts, body*/) {
    var args = Array.prototype.slice.call(arguments, 0);
    var name = '(anonymous)';
    var opts;
    var body;

    if (typeof args[0] == 'string') {
        name = args.shift();
    }
    if (typeof args[0] == 'object') {
        opts = args.shift();
    }
    body = args[0];

    return { name: name, opts: opts || {}, body: body };
};


inherits(Test, EventEmitter);
function Test(/*name, opts, body*/) {
    var args = getTestArgs.apply(null, arguments);

    this._opts = extend({
        id: ++TEST_ID,
        name: args.name || '(anonymous)'
    }, args.opts);

    this._assertCount = 0;
    this._plan = undefined;
    this._body = args.body;
    this._ok = true;
    this._subtestRunner = new Runner();

    //providing public read-only access to the opts through getters
    util.extendWithGetters(this, pick(this._opts,
        'id', 'parentId', 'name', 'only'));

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

    if (!this._body || this._opts.skip) {
        //todo print the comment message? or move it into the runner completely?
        return this._end();
    }

    this.emit('prerun');

    try {
        if (this._opts.timeout !== undefined) {
            this.timeoutAfter(this._opts.timeout);
        }
        this._body(this);
    } catch (err) {
        this._fail('error during test execution: ' + err, {
            error: err
        });
        this._end();
        return;
    }

    //not ending here because of some async assertions can still be waiting
};

Test.prototype.test = function(/*name, opts, body*/) {
    var self = this;

    var args = getTestArgs.apply(null, arguments);
    args.opts.parentId = this.id;
    var t = new Test(args.name, args.opts, args.body);

    this._subtestRunner.push(t);
    this.emit('subtest', t);
    t.on('prerun', function() {
        //each subtest declaration is counted as a separate assert, is it right?
        self._assertCount++;
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
    } else if (this._planned() && this._assertCount !== this._plan) {
        this._planError = true;
        this._fail('plan != count', {
            expected: this._plan,
            actual: this._assertCount,
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
        : this._plan - (this._subtestRunner.testsLeft() + this._assertCount);
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
        id: self._assertCount++,
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
    var res = extend({
        type: opts.type && '' + opts.type || '',
        operator: opts.operator && '' + opts.operator || '',
        message: opts.message && '' + opts.message || ''
    });

    extend(res, pick(opts, 'id', 'actual', 'expected', 'skip'));

    if (util.has(opts, 'ok')) {
        res.ok = !!opts.ok;
        if (!res.ok) {
            res.error = opts.error;
            extend(res, util.getStackTop());
        }
    }

    this.emit('result', res);
};
