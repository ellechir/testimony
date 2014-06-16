var defined = require('defined');
var createDefaultStream = require('./lib/default_stream');
var Test = require('./lib/test');
var Results = require('./lib/results');
var through = require('through');
var nextTick = require('./lib/util').nextTick;

var canEmitExit = typeof process !== 'undefined' && process
    && typeof process.on === 'function' && process.browser !== true;

var canExit = typeof process !== 'undefined' && process
    && typeof process.exit === 'function';



exports = module.exports = (function () {
    var harness;
    var lazyLoad = function () {
        return getHarness().apply(this, arguments);
    };

    lazyLoad.only = function () {
        return getHarness().only.apply(this, arguments);
    };

    lazyLoad.createStream = function (opts) {
        if (!opts) opts = {};
        if (!harness) {
            var output = through();
            getHarness({ stream: output, objectMode: opts.objectMode });
            return output;
        }
        return harness.createStream(opts);
    };

    return lazyLoad;

    function getHarness (opts) {
        if (!opts) opts = {};
        opts.autoclose = !canEmitExit;
        if (!harness) harness = createExitHarness(opts);
        return harness;
    }
})();

function createExitHarness (conf) {
    if (!conf) conf = {};
    var harness = createHarness({
        autoclose: defined(conf.autoclose, false)
    });

    var stream = harness.createStream({ objectMode: conf.objectMode });
    var es = stream.pipe(conf.stream || createDefaultStream());
    if (canEmitExit) {
        es.on('error', function (err) { harness._exitCode = 1 });
    }

    var ended = false;
    stream.on('end', function () { ended = true });

    if (conf.exit === false) return harness;
    if (!canEmitExit || !canExit) return harness;

    var _error;

    process.on('uncaughtException', function (err) {
        if (err && err.code === 'EPIPE' && err.errno === 'EPIPE'
        && err.syscall === 'write') return;

        _error = err;

        throw err;
    });

    process.on('exit', function (code) {
        if (_error) {
            return;
        }

        if (!ended) {
            var only = harness._results._only;
            for (var i = 0; i < harness._tests.length; i++) {
                var t = harness._tests[i];
                if (only && t.name !== only) continue;
                t._exit();
            }
        }
        harness.close();
        process.exit(code || harness._exitCode);
    });

    return harness;
}

exports.createHarness = createHarness;
exports.Test = Test;
exports.test = exports; // tap compat
exports.test.skip = Test.skip;

var exitInterval;

function createHarness(opts) {
    opts = opts || {};

    var results = Results();
    if (opts.autoclose !== false) {
        //todo move this logic into results
        results.once('done', function () { results.close() });
    }

    //todo things look really ugly, just make it a real class
    var harness = function(name, conf, cb) {
        var test = new Test(name, conf, cb);
        harness._tests.push(test);
        harness._results.push(test);
        listenTest(test);
        return test;

        function listenTest(t) {
            t.on('test', listenTest);
            t.on('result', function (r) {
                if (r.type == 'assert' && !r.ok) {
                    harness._exitCode = 1;
                }
            });
        }
    };

    harness._results = results;
    harness._tests = [];
    harness._exitCode = 0;
    harness._only = '';

    harness.createStream = function(opts) {
        return harness._results.createStream(opts);
    };

    harness.only = function(name) {
        //todo handle empty name correctly
        if (harness._only) throw new Error('there can only be one only test');
        harness._results.only(name);
        harness._only = name;
        return harness.apply(null, arguments);
    };

    harness.close = function() {
        harness._results.close();
    };

    return harness;
}
