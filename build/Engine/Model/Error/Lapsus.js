'use strict';

let makeError = require('make-error');
let BaseError = makeError.BaseError;
let errors = require("./errors");

class Lapsus extends BaseError {
    constructor(info, message) {
        let msg = errors[info] + (message ? " : " + message : "");
        super(msg);
    }
}

module.exports = function (name) {
    return makeError(name, Lapsus);
};