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
    util.bindPrototype(this, Harness);
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

        harness.close();
        process.exit(code || harness._exitCode);
    });

    return harness;
}
