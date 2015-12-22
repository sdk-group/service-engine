'use strict';

let Abstract = require('./abstract.js');
let Promise = require('bluebird');
let http = require("http");

let ping = function (url, port) {
    let promise = new Promise(function (resolve, reject) {
        let result;
        let options = {
            host: url,
            port: port || 80,
            path: '/'
        };
        let start = Date.now();
        let pingRequest = http.request(options, function () {
            result = Date.now() - start;
            resolve(result);
            pingRequest.abort();
        });
        pingRequest.on("error", function () {
            result = -1;
            reject(result);
            pingRequest.abort();
        });
        pingRequest.write("");
        pingRequest.end();
    });

    return promise;
};

class Single extends Abstract {
    constructor(params, emitters) {
        super(params, emitters);

        this.init({
            permission_watched: 'ip',
            inspector_name: 'ip/ping',
            key_data: params.key_data
        });

        this.interval = params.interval;
        this.timeout = params.less_then;
        this.selected_ip = params.key_data;
    }

    ping() {

        let self = this;

        let interval = this.interval;
        let timeout = this.timeout;
        let selected_ip = this.selected_ip;

        let forever_ping = Promise.coroutine(function* () {
            while (!self.stop) {
                yield Promise.delay(interval);

                yield ping(selected_ip).timeout(timeout, 'timeout').then(function (time) {
                    self.send('restore', 'online');
                }).catch(function (data) {
                    let is_timeout = data.hasOwnProperty("message") && data.message === 'timeout';
                    if (!is_timeout) throw data;
                    self.send('drop', is_timeout ? 'low-latency' : 'ping-error');
                });
            }
        });

        forever_ping();
    }

    start() {
        this.stop = false;
        this.ping();
    }

    stop() {
        this.stop = true;
    }
}

module.exports = Single;