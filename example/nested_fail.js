var test = require('../').test;

test('first test', function(assert) {
    assert.test('first subtest', function(a) {
        a.plan(2);
        a.ok(true, 'first subtest check');

        setTimeout(function() {
            a.fail('first subtest delayed fail');
        }, 100);
    });

    assert.comment('this will be printed before executing subtest');

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

    assert.end();
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
