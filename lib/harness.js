'use strict';

var Runner = require('./testrunner');
var Test = require('./test');
var util = require('./util');

module.exports = Harness;


function Harness(opts) {
    var self = this;
    opts = opts || {};

    this._runner = new Runner();
    this._exitCode = 0;

    if (opts.autoclose !== false) {
        self._runner.once('done', function () {self._runner.close()});
    }
};

Harness.prototype.test = function(name, conf, cb) {
    this._addTest(new Test(name, conf, cb));
};

Harness.prototype.only = function(name, conf, cb) {
    this._addTest(Test.only(name, conf, cb));
};

Harness.prototype.skip = function(name, conf, cb) {
    this._addTest(Test.skip(name, conf, cb));
};

Harness.prototype._addTest = function(test) {
    var self = this;

    this._runner.push(test);
    listenTest(test);

    function listenTest(t) {
        t.on('subtest', listenTest);
        t.on('result', function (r) {
            if (r.type == 'assert' && !r.ok) {
                self._exitCode = 1;
            }
        });
   }
};

Harness.prototype.createStream = function(opts) {
    return this._runner.createStream(opts);
};

Harness.prototype.run = function() {
    this._runner.runTests();
};

Harness.prototype.close = function() {
    this._runner.close();
};
