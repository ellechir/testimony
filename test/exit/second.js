var test = require('../../').test;

test('first', function (t) {
    t.plan(1);
    t.ok(true);
});

test('second', function (t) {
    t.plan(2);
    t.ok(true);
});
