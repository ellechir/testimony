var testimony = require('../');

testimony.test('only2 test 1', function (t) {
    t.end();
});

testimony.test('only2 test 2', {only: true}, function (t) {
    t.end();
});
