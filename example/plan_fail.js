var test = require('../').test;

test('too many', function(assert) {
    assert.plan(2);
    assert.equal(1, 1, 'too easy');
    assert.looseEqual(1, '1', 'loose equality should be checked explicitly');
    assert.comment('making one assertion over the plan...');
    assert.deepLooseEqual({a: 1}, {a: '1'}, 'also for deep loose equality');
});

test('too few', function(assert) {
    assert.plan(10);
    assert.equal(1, 1, 'too easy');
    assert.notEqual(1, '1', 'equality is checked strict');
    assert.notDeepEqual({a: 1}, {a: '1'}, 'deep equality is also checked strict');
    assert.comment('ending too early...');
});
