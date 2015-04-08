'use strict';

var resumer = require('resumer');
var inspect = require('object-inspect');
var has = require('./util').has;

module.exports = TapFormatter;

/**
 * A stream formatter for testimony results object stream converting raw objects
 * into TAP-compatible string stream.
 */
function TapFormatter() {
    var stream = resumer(onResult, onEnd);
    var passCount = 0;
    var failCount = 0;

    stream.queue('TAP version 13\n');
    return stream;


    function onResult(result) {
        if (result.type == 'assert') {
            result.ok ? passCount++ : failCount++;
        }
        this.push(formatResult(result, passCount + failCount));
    }

    function onEnd() {
        var assertionsCount = passCount + failCount;
        this.push('\n1..' + assertionsCount + '\n');
        this.push('# tests ' + assertionsCount + '\n');
        this.push('# pass  ' + passCount + '\n');
        if (failCount) {
            this.push('# fail  ' + failCount + '\n');
        } else {
            this.push('\n# ok\n');
        }

        this.push(null);
    }
}


function formatResult(result, id) {
    switch (result.type) {
    case 'test':
        return '# ' + result.testName + '\n';
    case 'message':
        return '# ' + result.message.trim().replace(/^#\s*/, '') + '\n';
    case 'assert':
        return formatAssertion(result, id);
    default:
        return ''; //silently ignoring everything else
    }
}

function formatAssertion(result, id) {
    var output = '';
    output += (result.ok ? 'ok ' : 'not ok ');
    output += id + ' ';
    output += result.message.trim().replace(/\s+/g, ' ') || '(unnamed assert)';

    if (result.skip) {
        output += ' # SKIP';
    }
    if (result.todo) {
        output += ' # TODO';
    }
    output += '\n';

    return result.ok ? output : output + formatAssertionError(result);
}

function formatAssertionError(result) {
    var output = '';
    var outer = '  ';
    var inner = outer + '  ';

    output += outer + '---\n';
    output += inner + 'operator: ' +
        (result.operator || '(unknown operator)') + '\n';

    if (has(result, 'expected') || has(result, 'actual')) {
        var ex = result.expected instanceof Error
                ? result.expected : inspect(result.expected);
        var ac = result.actual instanceof Error
                ? result.actual : inspect(result.actual);

        if (Math.max(ex.length, ac.length) > 65) {
            output += inner + 'expected:\n' + inner + '  ' + ex + '\n';
            output += inner + 'actual:\n' + inner + '  ' + ac + '\n';
        } else {
            output += inner + 'expected: ' + ex + '\n';
            output += inner + 'actual:   ' + ac + '\n';
        }
    }

    if (result.file) {
        output += inner + 'at: ' + result.functionName + ' '
            + '(' + [result.file, result.line, result.column].join(':')
            + ')' + '\n';
    }

    if (result.error) {
        output += inner + 'error: ' + result.error + '\n';
        if (!result.error.stack) return output;

        var lines = String(result.error.stack).split('\n');
        output += inner + 'stack:\n';
        output += inner + '  ' + lines[0] + '\n';
        for (var i = 1; i < lines.length; i++) {
            output += inner + lines[i] + '\n';
        }
    }

    output += outer + '...\n';

    return output;
}
