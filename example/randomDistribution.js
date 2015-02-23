var test = require('../').test;

test('Testing Random Generator', function(t) {
    var min = 3;
    var max = 7;
    var sample;

    getRandomSampleAsync(min, max, function(err, result) {
        sample = result;
        t.comment('got sample, starting subtests...');
        t.end(err);
    });

    t.test('Wrong boundaries check', function(assert) {
        assert.throwing(
            function() {getRandomSampleAsync(5, 3)},
            'Error: bad boundaries',
            'should not allow reverse boundaries');
        assert.throwing(
            function() {getRandomSampleAsync(5, 5)},
            'Error: bad boundaries',
            'should not allow min == max');
        assert.end();
    });


    t.test('Sample mean check', function(assert) {
        var expectedMean = avg([min, max]);
        var actualMean = avg(sample);

        //can't compare this things directly, we can only check the accuracy
        assert.ok(Math.abs(actualMean - expectedMean) < 0.01,
            'should expect 0.01 accuracy');
        assert.end();
    });

    function avg(sample) {
        return sample.reduce(function(a, b) {return a + b}) / sample.length;
    }
});

function getRandomSampleAsync(min, max, cb) {
    if (!(max > min)) throw new Error('bad boundaries');

    var sample = [];

    setTimeout(function() {
        for (var i = 0; i < 10000; i++) {
            sample.push(Math.random() * (max - min) + min);
        }
        cb(null, sample);
    }, 100);
}
