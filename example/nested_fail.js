var test = require('../').test;

test('first test', function(assert) {
    assert.plan(3);

    var random = {
        min: 3,
        max: 7,
        sample: []
    };

    assert.test('first subtest', function(a) {
        a.ok(true, 'first subtest check');

        setTimeout(function() {
            a.ok(true, 'first subtest check delayed');
            a.equal(random.min, random.max, 'this will fail');
            a.end();
        }, 100);
    });


    assert.comment('this will be run before executing subtest');

    for (var i = 1; i < 10000; i++) {
        random.sample.push(rand(random.min, random.max));
    }

    var expectedMean = avg([random.min, random.max]);
    var actualMean = avg(random.sample);

    assert.equal(actualMean, expectedMean, 'beware of float comparison');
    assert.ok(Math.abs(actualMean - expectedMean) < 0.01);


    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }
    function avg(sample) {
        return sample.reduce(function(a, b) {return a + b}) / sample.length;
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
