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
