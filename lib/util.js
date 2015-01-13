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

module.exports.bindPrototype = function (obj, Parent) {
    for (var key in Parent.prototype) {
        if (module.exports.has(Parent.prototype, key)) {
            obj[key] = (typeof Parent.prototype[key] == 'function')
                ? module.exports.bind.call(Parent.prototype[key], obj)
                : Parent.prototype[key];
        }
    }
};
