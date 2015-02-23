var test = require('../').test;

test('first test', function(assert) {
    assert.test('first subtest', function(a) {
        a.plan(2);
        a.ok(true, 'first subtest check');

        setTimeout(function() {
            a.ok(true, 'first subtest check delayed');
        }, 100);
    });

    assert.comment('this will be generated before executing subtest');

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

test('second test', function (assert) {
    assert.plan(2);
    setTimeout(function () {
        assert.test('second subtest async', function(a) {
            someAsyncFunction(function(err, res) {
                a.equal(res, 'response from async callback');
                a.end(err);
            });
        });
    }, 100);
    assert.ok(true, 'first assertion to be made');
});

function someAsyncFunction(callback) {
    setTimeout(function() {
        callback(null, 'response from async callback');
    }, 100);
}
