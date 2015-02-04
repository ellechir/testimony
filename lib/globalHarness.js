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
    util.bindPrototype(this, GlobalHarness);


    if (opts.exit !== false && canEmitExit && canExit) {
        addProcessHooks(this);
    }

    util.nextTick(function() {
        if (!self._stream) {
            //creating the default one
            var stream = self.createStream({objectMode: opts.objectMode});
            stream.pipe(opts.stream || (
                opts.objectMode ? through() : textDrainStream()));

        }
        self.run();
    });
}

GlobalHarness.prototype.createStream = function(opts) {
    var self = this;
    self._stream = Harness.prototype.createStream.apply(this, arguments);
    self._stream.on('error', function(err) { self._exitCode = 1 });
    return self._stream;
};

function addProcessHooks(harness) {
    harness._processError = null;

    process.on('uncaughtException', function(err) {
        if (err && err.code === 'EPIPE' && err.errno === 'EPIPE'
        && err.syscall === 'write') return;

        harness._processError = err;
        throw err;
    });

    process.on('exit', function(code) {
        if (harness._processError) {
            return;
        }

        harness.close();
        process.exit(code || harness._exitCode);
    });

    return harness;
}
