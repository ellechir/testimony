var testimony = require('../../');
var path = require('path');

testimony.createStream().pipe(process.stdout);

process.argv.slice(2).forEach(function (file) {
    require(path.resolve(file));
});
