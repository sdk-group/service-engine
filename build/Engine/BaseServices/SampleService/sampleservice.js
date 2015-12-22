'use strict';

let Abstract = require('../Abstract/abstract.js');

class SampleService extends Abstract {
    constructor() {
        super({});
        this.addPermission('ip', 'ya.kz');
    }
    start() {
        super.start();
        console.log(process.pid, ': SampleService: Started!');
    }
    pause() {
        super.pause();
        console.log('SampleService: Paused!');
    }
}

module.exports = SampleService;