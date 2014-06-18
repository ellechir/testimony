var tap = require('tap');
var testimony = require('../');

tap.test('testimony only test', function (tt) {
    var harness = new testimony.Harness({ exit: false });
    var tc = tap.createConsumer();
    var ran = [];

    var rows = []
    tc.on('data', function (r) { rows.push(r) })
    tc.on('end', function () {
        var rs = rows.map(function (r) {
            if (r && typeof r === 'object') {
                return { id: r.id, ok: r.ok, name: r.name.trim() };
            }
            else {
                return r;
            }
        })

        tt.deepEqual(rs, [
            'TAP version 13',
            'run success',
            { id: 1, ok: true, name: 'assert name'},
            'tests 1',
            'pass  1',
            'ok'
        ])
        tt.deepEqual(ran, [ 3 ]);

        tt.end()
    })

    harness.createStream().pipe(tc)

    harness.test("never run fail", function (t) {
        ran.push(1);
        t.equal(true, false)
        t.end()
    })

    harness.test("never run success", function (t) {
        ran.push(2);
        t.equal(true, true)
        t.end()
    })

    harness.only("run success", function (t) {
        ran.push(3);
        t.ok(true, "assert name")
        t.end()
    })
})
