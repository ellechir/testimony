var tap = require("tap");
var testimony = require("../");

tap.test("tape assert.end as callback", function (tt) {
    var harness = new testimony.Harness({ exit: false });
    var tc = tap.createConsumer();

    var rows = [];
    tc.on("data", function (r) { rows.push(r) });
    tc.on("end", function () {
        var rs = rows.map(function (r) {
            return r && typeof r === "object" ?
                { id: r.id, ok: r.ok, name: r.name.trim() } :
                r;
        });

        tt.deepEqual(rs, [
            "TAP version 13",
            "do a task and write",
            { id: 1, ok: true, name: "should not be an error" },
            { id: 2, ok: true, name: "should be equal" },
            "do a task and write fail",
            { id: 3, ok: true, name: "should not be an error" },
            { id: 4, ok: true, name: "should be equal" },
            { id: 5, ok: false, name: "this end() will fail" },
            "tests 5",
            "pass  4",
            "fail  1"
        ]);

        tt.end();
    });

    harness.createStream().pipe(tc);
    harness.run();

    harness.test("do a task and write", function (assert) {
        fakeAsyncTask("foo", function (err, value) {
            assert.noError(err);
            assert.equal(value, "taskfoo");

            fakeAsyncWrite("bar", assert.end);
        });
    });

    harness.test("do a task and write fail", function (assert) {
        fakeAsyncTask("bar", function (err, value) {
            assert.noError(err);
            assert.equal(value, "taskbar");

            fakeAsyncWriteFail("baz", assert.end);
        });
    });
});

function fakeAsyncTask(name, cb) {
    cb(null, "task" + name);
}

function fakeAsyncWrite(name, cb) {
    cb(null);
}

function fakeAsyncWriteFail(name, cb) {
    cb(new Error("fail"), 'this end() will fail');
}
