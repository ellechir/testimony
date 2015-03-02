# testimony

[![build status](https://secure.travis-ci.org/maslennikov/testimony.png)
](http://travis-ci.org/maslennikov/testimony)
&nbsp;
[![npm version](http://img.shields.io/npm/v/testimony.svg?style=flat)
](https://npmjs.org/package/testimony "View on npm")

Lightweight stream-oriented test framework largely inspired by
[tape](https://github.com/substack/tape)

# Install

With [npm](https://npmjs.org) do:

```
npm install testimony
```

# Example

``` js
var test = require('testimony').test;

test('Testing Random Generator', function(t) {
    var min = 3;
    var max = 7;
    var sample;

    getRandomSampleAsync(min, max, function(err, result) {
        sample = result;
        t.comment('got sample, starting subtests...');
        t.end(err);
    });

    t.test('Wrong boundaries check', function(assert) {
        assert.throws(function() {getRandomSampleAsync(5, 3)}, 'Error: bad boundaries',
            'should not allow reverse boundaries');
        assert.throws(function() {getRandomSampleAsync(5, 5)}, 'Error: bad boundaries',
            'should not allow min == max');
        assert.end();
    });


    t.test('Sample mean check', function(assert) {
        var expectedMean = avg([min, max]);
        var actualMean = avg(sample);

        //can't compare this things directly, we can only check the accuracy
        assert.ok(Math.abs(actualMean - expectedMean) < 0.01,
            'should expect 0.01 accuracy');
        assert.end();
    });

    function avg(sample) {
        return sample.reduce(function(a, b) {return a + b}) / sample.length;
    }
});

function getRandomSampleAsync(min, max, cb) {
    if (!(max > min)) throw new Error('bad boundaries');

    var sample = [];

    setTimeout(function() {
        for (var i = 0; i < 10000; i++) {
            sample.push(Math.random() * (max - min) + min);
        }
        cb(null, sample);
    }, 100);
}
```

```
$ node example/randomDistribution.js
TAP version 13
# Testing Random Generator
# got sample, starting subtests...
# Wrong boundaries check
ok 1 should not allow reverse boundaries
ok 2 should not allow min == max
# Sample mean check
ok 3 should expect 0.01 accuracy

1..3
# tests 3
# pass  3

# ok
```

# Test Execution

By default the framework is meant to facilitate creation of stand-alone
executable modules which don't need any further `runner` or harness.

To create a series of simple tests that will be executed one by one, the
following will be enough:

``` js
var test = require('testimony').test

test('First Test', function(t) {
    //test body here
});

test('Second Test', function(t) {
    //test body here
});
```

The test body function gets one argument - an instance of the current
test. Since testing asynchronous code is a very common task and test assertions
can be made long after the test body function returns, the following approach
was chosen to signalize the test end: either defining the *assertion plan* (how
much assertions are to be made) at the test beginning with `test.plan()` or
*explicitly finishing the test* after the last assertion is made with
`test.end()`. The test won't be considered finished until the assertion plan is
fulfilled or the `test.end()` method is called and will be hanging preserving
the following tests from the start.

Example with `end()`:

``` js
var test = require('testimony').test;

test('Timing Test', function(assert) {
    assert.equal(typeof Date.now, 'function', 'Date.now() exists');
    var start = Date.now();

    setTimeout(function() {
        assert.equal(Date.now() - start, 100, 'will randomly pass and fail');
        assert.end();
    }, 100);
});
```

# Subtests

Each test can have optionally multiple subtests. This is achieved by calling
`test.test()` method taking same arguments as the high-level `test()` function.

**Important:** subtests are executed *after* the body of the parent-test is run
and the parent test was finished in one of the described above ways.

Even if the body of the parent test consists only of subtest declarations, it is
necessary to use either `test.plan()` or `test.end()` to explicitly mark the
parent test end.

When using `test.plan()` method, treat each subtest as a single assertion,
regardless of how much assertions will be made inside the subtest body.

Subtests can be also declared asynchronously.

Example:

```js
test('Subtests Demo', function (assert) {
    assert.plan(2); //one for assert.ok(), one for assert.test()

    setTimeout(function () {
        assert.test('second subtest async', function(a) {
            someAsyncFunction(function(err, res) {
                a.equal(res, 'response from async callback');
                a.end(err);
            });
        });
    }, 100);
    assert.ok(true, 'first assertion to be made');
});
```


# Test Methods

The assertion methods in `testimony` are heavily influenced or copied from the
methods in [tape](https://github.com/substack/tape).

```
var test = require('testimony').test
```

## test([name], [opts], fn)

Create a new test with an optional `name` string and optional `opts` object.
`fn(t)` fires with the new test object `t` once all preceeding tests have
finished. See [Test Execution](#test-execution).

Available `opts` options are:
- `opts.skip: true|false`: The test will be generated but never run.
- `opts.only: true|false`: The only test to be run for the process, others get
  ignored.
- `opts.timeout: msec`. Set a timeout for the test after which it will fail
  unless ended before. See `test.timeoutAfter()`.

Subtests are created with the `test.test([name], [opts], fn)` method with the
same signature.

## test.plan(n)

Declare that `n` assertions should be run. `t.end()` will be called
automatically after the `n`th assertion. If there are any more assertions coming
after the `n`th, they will generate errors.

## test.end([err])

Declare the end of a test explicitly. If `err` is passed in `t.end` will assert
that it is falsy. If there are any more assertions after `t.end()` is called,
they will generate errors.

## test.fail([msg])

Generate a failing assertion with a message `msg`.

## test.pass([msg])

Generate a passing assertion with a message `msg`.

## t.timeoutAfter(ms)

Automatically timeout the test after `ms` ms.

## test.skip([msg])

Generate an assertion that will be skipped over.

## test.ok(value, [msg])

Assert that `value` is truthy with an optional description message `msg`.

Aliases: `test.assert()`, `test.truthy()`

## test.notOk(value, [msg])

Assert that `value` is falsy with an optional description message `msg`.

Aliases: `t.falsy()`

## test.noError(err, [msg])

Assert that `err` is falsy with an optional description message `msg`.

## test.equal(actual, expected, [msg])

Assert that `actual === expected` with an optional description `msg`.

## test.notEqual(actual, notExpected, [msg])

Assert that `actual !== notExpected` with an optional description `msg`.

## test.deepEqual(actual, expected, [msg])

Assert that `actual` and `expected` have the same structure and nested values using
[node's deepEqual() algorithm](https://github.com/substack/node-deep-equal)
with strict comparisons (`===`) on leaf nodes and an optional description
`msg`.

## test.notDeepEqual(actual, notExpected, [msg])

Assert that `actual` and `expected` do not have the same structure and nested values using
[node's deepEqual() algorithm](https://github.com/substack/node-deep-equal)
with strict comparisons (`===`) on leaf nodes and an optional description
`msg`.

## test.deepLooseEqual(actual, expected, [msg])

Assert that `actual` and `expected` have the same structure and nested values using
[node's deepEqual() algorithm](https://github.com/substack/node-deep-equal)
with loose comparisons (`==`) on leaf nodes and an optional description `msg`.

Can be used for loose equality check for simple values also.

Aliases: `test.looseEqual()`

## test.notDeepLooseEqual(actual, notExpected, [msg])

Assert that `actual` and `expected` do not have the same structure and nested values using
[node's deepEqual() algorithm](https://github.com/substack/node-deep-equal)
with loose comparisons (`==`) on leaf nodes and an optional description `msg`.

Can be used for loose equality check for simple values also.

Aliases: `test.notLooseEqual()`

## test.throwing(fn, [expected], [msg])

Assert that the function call `fn()` throws an exception. If `expected` is
present and is a `RegExp` instance, the caught error will be tested to match the
given regexp, otherwise the simple equality check is made. If `expected` is
missing, then any caught error will suffice. An optional descriptive message
`msg` can be passed.

## test.notThrowing(fn, [msg])

Assert that the function call `fn()` does not throw any exception. An optional
descriptive message `msg` can be passed.


# Under the hood

```js
var testimony = require('testimony');
var Harness = testimony.Harness
var Test = testimony.Test
```

Tests are responsible for running the testing function (that one passed to the
test() as a callback) and keeping track on assertions. Their sequential run and
reports producing is the area of the `Harness` class. The `require('testimony')`
call returns an instance of the global harness which will run all registered
tests automatically and provide you with a convenient default tap-formatted
stdout.

Test registration is made with already known `Harness.test()` method. To get a
control of test harness, there are the following methods available:


## harness.test([name], [opts], fn)

This is the method described above - creates a new test and registers it with
the harness. It will be scheduled for execution according its sequence order and
considering `skip` and `only` flags passed to the `opts`.

## harness.run()

Triggers the execution of all registered tests.

## harness.close()

Ensures to finalize all tests handled by harness. All unfinished tests will be
considered failed. Global harness does this automatically before application
exit.

## harness.createStream([opts])

Creates a stream of output, bypassing the default output stream that writes
messages to standard output. By default `stream` will be a text stream of TAP
output, but you can get an object stream instead by setting `opts.objectMode` to
`true`. Notice that explicit creation of the object stream influences the global
harness behavior - it won't create any default stream.

Example of a custom tap-formatted stream:

```js
var testimony = require('testimony');
var path = require('path');

//just piping it to stdout straight away
testimony.createStream().pipe(process.stdout);

process.argv.slice(2).forEach(function (file) {
    require(path.resolve(file));
});
```

```
$ node example/stream/tap.js example/stream/test/*
TAP version 13
# (anonymous)
not ok 1 should be equal
  ---
    operator: equal
    expected: 'boop'
    actual:   'beep'
  ...
# (anonymous)
not ok 2 PI equals 3.14
  ---
    operator: equal
    expected: 3.141592653589793
    actual:   3.14
  ...
# Test function throwing error
ok 3 should throw

1..3
# tests 3
# pass  1
# fail  2
```

Example of an object stream:

```js
var testimony = require('testimony');
var path = require('path');

testimony.createStream({ objectMode: true }).on('data', function (row) {
    console.log(JSON.stringify(row))
});

process.argv.slice(2).forEach(function (file) {
    require(path.resolve(file));
});
```

```
$ node example/stream/object.js example/stream/test/y.js
{"type":"test","testName":"(anonymous)","testId":1}
{"type":"assert","operator":"equal","message":"should be equal","id":0,"actual":"beep","expected":"boop","ok":false,"testName":"(anonymous)","testId":1}
{"type":"end","testName":"(anonymous)","testId":1}
{"type":"test","testName":"(anonymous)","testId":2}
{"type":"assert","operator":"equal","message":"PI equals 3.14","id":0,"actual":3.14,"expected":3.141592653589793,"ok":false,"testName":"(anonymous)","testId":2}
{"type":"end","testName":"(anonymous)","testId":2}
{"type":"test","testName":"Test function throwing error","testId":3}
{"type":"assert","operator":"throwing","message":"should throw","id":0,"actual":{},"expected":"Error: boop","ok":true,"testName":"Test function throwing error","testId":3}
{"type":"end","testName":"Test function throwing error","testId":3}
```

# Transforming the output

There are several ways to transform and programmatically handle the `testimony`
output. The own stream-based formatter can be implemented, see
`lib/tapFormatter.js` and the harness output piped into it.

The second way is to use numerous tap-consumers, piping the tap-formatted text
output into them.  On the [tape](https://github.com/substack/tape) page, there
are several of them listed:

- https://github.com/scottcorgan/tap-spec
- https://github.com/scottcorgan/tap-dot
- https://github.com/substack/faucet
- https://github.com/juliangruber/tap-bail
- https://github.com/kirbysayshi/tap-browser-color
- https://github.com/gummesson/tap-json
- https://github.com/gummesson/tap-min
- https://github.com/calvinmetcalf/tap-nyan
- https://www.npmjs.org/package/tap-pessimist
- https://github.com/toolness/tap-prettify
- https://github.com/shuhei/colortape
- https://github.com/aghassemi/tap-xunit
- https://github.com/namuol/tap-difflet


# Note on Uncaught Exceptions

The framework will try to catch all errors occuring during the test
execution. The exception is uncaught errors thrown from the async routines -
these will cause the test execution to abort with the corresponding message (see
`example/throw.js`).
