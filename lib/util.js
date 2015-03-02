module.exports.has = function(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
};

module.exports.nextTick = typeof setImmediate !== 'undefined'
    ? setImmediate
    : process.nextTick;

module.exports.bind = Function.prototype.bind || function(/*thisArg, args*/) {
    var fn = this;
    var thisArg = arguments[0];
    var args = Array.prototype.slice.call(arguments, 1);

    return function() {
        fn.apply(thisArg, args);
    };
};

module.exports.eachOwnFunction = function(obj, callback) {
    for (var key in obj) {
        if (module.exports.has(obj, key) && typeof obj[key] == 'function') {
            callback(obj[key], key, obj);
        }
    }
};

module.exports.bindPrototype = function (obj, Parent) {
    module.exports.eachOwnFunction(Parent.prototype, function(fn, key) {
        obj[key] = module.exports.bind.call(fn, obj);
    });
};

module.exports.extendWithGetters = function(target, source) {
    for (var key in source) {
        if (!module.exports.has(source, key)) continue;

        (function(k) {
            Object.defineProperty(target, k, {get: function() {
                return source[k];
            }});
        })(key);
    }
};
