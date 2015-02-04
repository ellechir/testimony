var test = require('../').test;

test('timing test', function(assert) {
    assert.equal(typeof Date.now, 'function', 'Date.now() exists');
    var start = Date.now();

    setTimeout(function () {
        assert.equal(Date.now() - start, 100, 'will randomly pass and fail');
        assert.end();
    }, 100);
});
