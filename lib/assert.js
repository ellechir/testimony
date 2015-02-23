'use strict';

var deepEqual = require('deep-equal');

/**
 * All functions exported in this module will become part of the Test class but
 * should not rely on the `this` context of the call. Each function's interface
 * should be the following:
 *
 *     function(arg1, ...argN, function callback(err, opts))
 *
 * where
 * - `err` is the assertion error or falsy value in case of successful assertion
 * - `opts` may have the following fields
 *     opts = {
 *         expected,
 *         notExpected,
 *         actual,
 *         skip
 *     }
 *
 * WARNING: All function arguments should be defined explicitly, so that
 * function's `length` property returns the correct value
 */

module.exports = Assertions;

function Assertions() {
}


Assertions.prototype.fail = function(cb) {
    cb(check(false), {
        message: 'fail'
    });
};

Assertions.prototype.pass = function(cb) {
    cb(check(true));
};

//todo move it to test, make it not visible by the plan()?
Assertions.prototype.skip = function(cb) {
    cb(check(true), {
        skip: true
    });
};

Assertions.prototype.ok
= Assertions.prototype.assert
= Assertions.prototype.truthy
= function(value, cb) {
    cb(check(value), {
        message: 'should be true',
        expected: true,
        actual: value
    });
};

Assertions.prototype.notOk
= Assertions.prototype.falsy
= function(value, cb) {
    cb(check(!value), {
        message: 'should be false',
        expected: false,
        actual: value
    });
};

Assertions.prototype.noError
= function(err, cb) {
    cb(check(!err), {
        message: 'should not be an error',
        expected: false,
        actual: err,
        error: err
    });
};

Assertions.prototype.equal = function(actual, expected, cb) {
    cb(check(actual === expected), {
        message: 'should be equal',
        actual: actual,
        expected: expected
    });
};

Assertions.prototype.notEqual = function(actual, notExpected, cb) {
    cb(check(actual !== notExpected), {
        message: 'should not be equal',
        actual: actual,
        notExpected: notExpected
    });
};

Assertions.prototype.deepEqual = function(actual, expected, cb) {
    cb(check(deepEqual(actual, expected, {strict: true})), {
        message: 'should be equivalent',
        actual: actual,
        expected: expected
    });
};

Assertions.prototype.deepLooseEqual
= Assertions.prototype.looseEqual
= function(actual, expected, cb) {
    cb(check(deepEqual(actual, expected)), {
        message: 'should be equivalent',
        actual: actual,
        expected: expected
    });
};

Assertions.prototype.notDeepEqual = function(actual, notExpected, cb) {
    cb(check(!deepEqual(actual, notExpected, {strict: true})), {
        message: 'should not be equivalent',
        actual: actual,
        notExpected: notExpected
    });
};

Assertions.prototype.notDeepLooseEqual
= Assertions.prototype.notLooseEqual
= function(actual, notExpected, cb) {
    cb(check(!deepEqual(actual, notExpected)), {
        message: 'should not be equivalent',
        actual: actual,
        expected: notExpected
    });
};

Assertions.prototype.throwing = function(fn, expected, cb) {
    if (arguments.length < 3) {
        cb = expected;
        expected = undefined;
    }

    var caught = null;
    try {
        fn();
    } catch (err) {
        caught = err;
    }

    var passed = expected instanceof RegExp
            ? expected.test(caught)
            : caught
            ? caught == expected
            : caught;

    cb(check(passed), {
        message: 'should throw',
        actual: caught,
        expected: expected && String(expected),
        error: !passed && caught
    });
};

Assertions.prototype.notThrowing = function(fn, cb) {
    var caught = null;
    try {
        fn();
    } catch (err) {
        caught = { error: err };
    }

    cb(check(!caught), {
        message: 'should not throw',
        actual: caught && caught.error,
        error: caught && caught.error
    });
};


function check(condition) {
    return condition ? null : new Error();
}
