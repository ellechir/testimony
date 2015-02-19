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

Assertions.prototype.skip = function(cb) {
    cb(check(true), {
        skip: true
    });
};

Assertions.prototype.ok
= Assertions.prototype.assert
= function(value, cb) {
    cb(check(value), {
        message: 'should be true',
        expected: true,
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

Assertions.prototype.equal = function(a, b, cb) {
    cb(check(a === b), {
        message: 'should be equal',
        actual: a,
        expected: b
    });
};

Assertions.prototype.notEqual = function(a, b, cb) {
    cb(check(a !== b), {
        message: 'should not be equal',
        actual: a,
        notExpected: b
    });
};

Assertions.prototype.deepEqual = function(a, b, cb) {
    cb(check(deepEqual(a, b, {strict: true})), {
        message: 'should be equivalent',
        actual: a,
        expected: b
    });
};

Assertions.prototype.deepLooseEqual
= Assertions.prototype.looseEqual
= function(a, b, cb) {
    cb(check(deepEqual(a, b)), {
        message: 'should be equivalent',
        actual: a,
        expected: b
    });
};

Assertions.prototype.notDeepEqual = function(a, b, cb) {
    cb(check(!deepEqual(a, b, {strict: true})), {
        message: 'should not be equivalent',
        actual: a,
        notExpected: b
    });
};

Assertions.prototype.notDeepLooseEqual
= Assertions.prototype.notLooseEqual
= function(a, b, cb) {
    cb(check(!deepEqual(a, b)), {
        message: 'should not be equivalent',
        actual: a,
        expected: b
    });
};

Assertions.prototype['throws'] = function(fn, expected, cb) {
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

Assertions.prototype.doesNotThrow = function(fn, expected, cb) {
    if (typeof expected == 'function' && !cb) {
        cb = expected;
        expected = undefined;
    }
    var caught = null;
    try {
        fn();
    } catch (err) {
        caught = { error: err };
    }

    cb(check(!caught), {
        message: 'should not throw',
        actual: caught && caught.error,
        expected: expected && String(expected),
        error: caught && caught.error
    });
};


function check(condition) {
    return condition ? null : new Error();
}
