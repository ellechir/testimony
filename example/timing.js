var test = require('../').test;

test('timing test', function(assert) {
    assert.plan(2);

    assert.equal(typeof Date.now, 'function');
    var start = new Date;

    setTimeout(function () {
        assert.equal(new Date - start, 100);
    }, 100);
});
