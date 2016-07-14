function timeout(ms) {
    return new Promise(res => {
        setTimeout(() => {
            res();
        }, ms);
    });
}

function logErrors(fn, prefix = '') {
    return (...args) => {
        try {
            fn(...args);
        } catch (err) {
            console.error(prefix, err);
        }
    }
}

module.exports.timeout = timeout;
module.exports.logErrors = logErrors;
