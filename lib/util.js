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
