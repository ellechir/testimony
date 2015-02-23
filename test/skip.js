var testimony = require('../');
var ran = 0;

testimony.test('do not skip this', { skip: false }, function(t) {
    t.pass('this should run');
    ran ++;
    t.end();
});

testimony.test('skip this', { skip: true }, function(t) {
    t.fail('this should not even run');
	ran++;
    t.end();
});

testimony.test('skip this too', {skip: true}, function(t) {
    t.fail('this should not even run');
	ran++;
    t.end();
});

testimony.test('skip this too', {skip: true}, function(t) {
    t.fail('this should not even run');
    t.end();
});

testimony.test('skip subtest', function(t) {
    ran ++;
    t.test('do not skip this', { skip: false }, function(t) {
        ran ++;
        t.pass('this should run');
        t.end();
    });
    t.test('skip this', { skip: true }, function(t) {
        t.fail('this should not even run');
        t.end();
    });
    t.end();
});

testimony.test('right number of tests ran', function(t) {
    t.equal(ran, 3, 'ran the right number of tests');
    t.end();
});
