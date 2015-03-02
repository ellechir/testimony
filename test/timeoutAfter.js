var testimony = require('../');
var tap = require('tap');

tap.test('timeoutAfter test', function (tt) {
    tt.plan(1);

    var harness = new testimony.Harness();
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
            'timeoutAfter',
            { id: 1, ok: false, name: 'test timed out after 12ms' },
            'timeoutOpts',
            { id: 2, ok: false, name: 'test timed out after 13ms' },
            'tests 2',
            'pass  0',
            'fail  2'
        ]);
    });

    harness.createStream().pipe(tc);
    harness.run();

    harness.test('timeoutAfter', function (t) {
        t.plan(1);
        t.timeoutAfter(12);
    });

    harness.test('timeoutOpts', {timeout: 13}, function (t) {
        t.plan(1);
    });
});
