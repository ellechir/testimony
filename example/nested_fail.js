var test = require('../').test;

test('first test', function(assert) {
    assert.plan(4);

    assert.test('first subtest', function(a) {
        a.ok(true, 'first subtest check');

        setTimeout(function() {
            a.ok(true, 'first subtest check delayed');
            a.equal(3, 4, 'this will fail');
            a.end();
        }, 100);
    });

    var arrays = [
        [1, 2],
        [[1, 2], 3, 4],
        [[[1, 2], 3, 4], 5, 6],
        [[[[1, 2], 3, 4], 5, 6], 7, 8]
    ];

    for (var i = 1; i < arrays.length; i++) {
        assert.deepEqual(arrays[i][0], arrays[i -1],
                         'this will be before subtest');
    }
});

test('second test', function(assert) {
    assert.plan(2);
    setTimeout(function() {
        assert.ok(true);
        assert.test('second subtest delayed', function(a) {
            a.ok(true, 'this will pass');
            a.end(new Error('this will fail'));
        });
    }, 100);
});
