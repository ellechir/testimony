var test = require('../../../').test;
test(function (t) {
    t.plan(1);
    t.equal(3.14, Math.PI, 'PI equals 3.14');
});

test('Test function throwing error', function (t) {
    t.throwing(function() {throw new Error('boop')}, 'Error: boop');
    t.end();
});
