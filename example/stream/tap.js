var Harness = require('../../').Harness;
var path = require('path');

var harness = new Harness();
harness.createStream().pipe(process.stdout);

process.argv.slice(2).forEach(function (file) {
    require(path.resolve(file));
});
