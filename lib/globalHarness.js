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
    var self = this;
    self._opts = opts || {};

    Harness.call(this, {autoclose: !canEmitExit});
    util.bindPrototype(this, Harness);
    util.bindPrototype(this, GlobalHarness);


    if (self._opts.exit !== false && canEmitExit && canExit) {
        addProcessHooks(this);
    }
}

function addProcessHooks(harness) {
    process.on('uncaughtException', function(err) {
        console.error('\n\nUncaught exception: ' + err);
        console.error(err.stack);
        process.exit(1);
    });

    process.on('exit', function(code) {
        if (!code) {
            harness.close();
        }
        process.exit(code || harness._exitCode);
    });

    return harness;
}

/**
 * Redefining it here to trigger lazyRun functionality as soon as the first test
 * is registered
 */
GlobalHarness.prototype._addTest = function(/*...*/) {
    this._lazyRun();
    return Harness.prototype._addTest.apply(this, arguments);
};

/**
 * Need lazy start-up routine to give user time to decide about streams and
 * custom harness usage
 */
GlobalHarness.prototype._lazyRun = function() {
    var self = this;
    if (self._running) return;
    self._running = true;

    util.nextTick(function() {
        if (!self._stream) {
            //creating the default one
            var stream = self.createStream({objectMode: self._opts.objectMode});
            stream.pipe(self._opts.stream || (
                self._opts.objectMode ? through() : textDrainStream()));

        }
        self.run();
    });
};

GlobalHarness.prototype.createStream = function(opts) {
    var self = this;
    self._stream = Harness.prototype.createStream.apply(this, arguments);
    self._stream.on('error', function(err) { self._exitCode = 1 });
    return self._stream;
};
