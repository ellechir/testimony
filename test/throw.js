var falafel = require('falafel');
var testimony = require('../');
var tap = require('tap');

tap.test('throw test', function (tt) {
    tt.plan(1);

    var harness = new testimony.Harness({ exit : false });
    var tc = tap.createConsumer();

    var rows = [];
    tc.on('data', function (r) { rows.push(r) });
    tc.on('end', function () {
        var rs = rows.map(function (r) {
            if (r && typeof r === 'object') {
                return { id : r.id, ok : r.ok, name : r.name.trim() };
            }
            else return r;
        });
        tt.same(rs, [
            'TAP version 13',
            'thrower',
            { id: 1, ok: true, name: 'should be equal' },
            { id: 2, ok: false, name: 'error during test execution: Error: rawr' },
            'tests 2',
            'pass  1',
            'fail  1',
        ]);
    });

    harness.createStream().pipe(tc);
    harness.run();

    harness.test('thrower', function (t) {
        t.equal(1 + 1, 2);

        throw new Error('rawr');
    });
});
