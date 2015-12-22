'use strict';
let errors = require("./errors");

function AbstractError(name, info, message) {
    let msg = message ? " : " + message : "";
    this.message = errors[info] + msg;
    this.name = name || "AbstractError";
    Error.call(this);
    Error.captureStackTrace(this, AbstractError);
}

AbstractError.prototype = Object.create(Error.prototype);
AbstractError.prototype.constructor = AbstractError;

module.exports = AbstractError;