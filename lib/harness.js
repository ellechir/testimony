'use strict';

var Results = require('./results');
var Test = require('./test');
var util = require('./util');

module.exports = Harness;


function Harness(opts) {
    var self = this;
    opts = opts || {};

    this._results = Results();
    this._exitCode = 0;

    if (opts.autoclose !== false) {
        //todo move this logic into results?
        self._results.once('done', function () {self._results.close()});
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

    this._results.push(test);
    listenTest(test);

    function listenTest(t) {
        t.on('test', listenTest);
        t.on('result', function (r) {
            if (r.type == 'assert' && !r.ok) {
                self._exitCode = 1;
            }
        });
   }
};

Harness.prototype.createStream = function(opts) {
    return this._results.createStream(opts);
};

Harness.prototype.close = function() {
    this._results.close();
};
