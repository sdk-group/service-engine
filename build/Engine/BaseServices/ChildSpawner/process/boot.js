'use strict';

let Promise = require('bluebird');

let boot = function (queue) {

    let base_settings_received = new Promise((resolve, reject) => {
        queue.on('system.child_process.' + process.pid, d => {
            if (d.sub_event !== 'base_settings') return;

            global._base = d._base;

            resolve();
        });
    });

    return base_settings_received;
};
module.exports = boot;