'use strict'

let util = require('util');
let AbstractPermission = require('./abstract.js');

const NAME = 'ip';

class IpPermission extends AbstractPermission {
    constructor(ip) {
        super();
        this.ip = ip;
        this.is_dropped = true;

    }

    static keyToString(key_obj) {
        return key_obj.toString();
    }

    static getName() {
        return NAME;
    }

    requestMessage() {
        return {
            key: this.ip,
            permission: NAME
        };
    }

    keyToString() {
        return this.ip;
    }

    getName() {
        return IpPermission.getName();
    }
}

module.exports = IpPermission;