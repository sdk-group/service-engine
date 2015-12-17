'use strict'

let Promise = require('bluebird');
let Pinger = require('./ping-single.js');
let _ = require('lodash');

class PingInspector {
    constructor(params, emitters) {
        let self = this;
        this.stop = false;

        if (!params.hasOwnProperty('ip')) {
            throw new Error('ip_range param required');
            return;
        }
        this.ip = params.ip;

        this.pingers = [];
        //bluebird generator there
        _(this.ip).forEach((ip) => {
            let options = {
                interval: params.interval,
                less_then: params.less_then,
                key_data: ip
            };
            self.pingers.push(new Pinger(options, emitters));
        }).value();

    }


    stop() {
        _(this.pingers).forEach(pinger => pinger.stop()).value();
    }

    start() {
        _(this.pingers).forEach(pinger => pinger.start()).value();
    }
}

module.exports = PingInspector;