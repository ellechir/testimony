var test = require('../').test;

test('arrays comparison', function(assert) {
    var arrays = [
        [1, 2],
        [[1, 2], 3, 4],
        [[[1, 2], 3, 4], 5, 6],
        [[[[1, 2], 3, 4], 5, 66], 7, 8]
    ];

    for (var i = 1; i < arrays.length; i++) {
        assert.deepEqual(arrays[i][0], arrays[i -1]);
    }

    assert.end();
});
