var Test = require('./lib/test');
var Harness = require('./lib/harness');
var GlobalHarness = require('./lib/globalHarness');


module.exports = new GlobalHarness();
module.exports.Harness = Harness;
module.exports.Test = Test;
