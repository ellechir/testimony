module.exports.has = function(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
};

module.exports.nextTick = typeof setImmediate !== 'undefined'
    ? setImmediate
    : process.nextTick;
