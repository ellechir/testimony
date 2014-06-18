var testimony = require('../');

testimony.test('only2 test 1', function (t) {
    t.end();
});

testimony.only('only2 test 2', function (t) {
    t.end();
});
