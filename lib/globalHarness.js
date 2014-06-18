'use strict';

var Harness = require('./harness');
var through = require('through');
var inherits = require('inherits');
var textDrainStream = require('./default_stream');
var util = require('./util');


var canEmitExit = typeof process !== 'undefined' && process
    && typeof process.on === 'function' && process.browser !== true;

var canExit = typeof process !== 'undefined' && process
    && typeof process.exit === 'function';


module.exports = GlobalHarness;

inherits(GlobalHarness, Harness);
function GlobalHarness(opts) {
    opts = opts || {};
    var self = this;

    Harness.call(this, {autoclose: !canEmitExit});
    bindPrototype(this, Harness);
    this._streamEnded = false;

    //WARNING this calls results.createStream() and triggers _runTests()
    var stream = this.createStream({objectMode: opts.objectMode});
    var endstream = stream.pipe(
            opts.stream || (opts.objectMode ? through() : textDrainStream()));

    if (canEmitExit) {
        endstream.on('error', function (err) { self._exitCode = 1 });
    }

    stream.on('end', function () { self._streamEnded = true });

    if (opts.exit !== false && canEmitExit && canExit) {
        addProcessHooks(this);
    }
}

function bindPrototype(obj, Parent) {
    for (var key in Parent.prototype) {
        if (util.has(Parent.prototype, key)) {
            obj[key] = (typeof Parent.prototype[key] == 'function')
                ? util.bind.call(Harness.prototype[key], obj)
                : Harness.prototype[key];
        }
    }
}

function addProcessHooks(harness) {
    harness._processError = null;

    process.on('uncaughtException', function (err) {
        if (err && err.code === 'EPIPE' && err.errno === 'EPIPE'
        && err.syscall === 'write') return;

        harness._processError = err;
        throw err;
    });

    process.on('exit', function (code) {
        if (harness._processError) {
            return;
        }

        if (!harness._streamEnded) {
            var only = harness._results._only;
            //todo move it to results.close()
            for (var i = 0; i < harness._tests.length; i++) {
                var t = harness._tests[i];
                //todo handle onlys more elegantly, this is just atrocious
                if (only && t.name !== only) continue;
                t._exit();
            }
        }
        harness.close();
        process.exit(code || harness._exitCode);
    });

    return harness;
}
