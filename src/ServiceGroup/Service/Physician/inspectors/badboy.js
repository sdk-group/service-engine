'use strict'

let Abstract = require('./abstract.js');

class BadBoy extends Abstract {
    constructor(params, emitters) {
        super(params, emitters);
        console.log("i'm a bad boy");
        console.log("i'm dropping things");
        console.log("everybody hates me");

        this.init({
            permission_watched: params.permission_to_slay,
            inspector_name: 'everything/bad',
            key_data: params.key_data
        });

        this.execution_time = params.execution_time;
        this.revive_time = params.revive_time;
    }
    start() {
        this.paused = false;
        setTimeout(() => {
            console.log('Badboy: Executed!');
            if (!this.paused) this.send('drop', "i'm freaking bad, u know");
        }, this.execution_time);

        if (this.revive_time) {
            setTimeout(() => {
                console.log('Badboy: revived...');
                if (!this.paused) this.send('restore', "sometimes i'm doing good things");
            }, this.revive_time);
        }
    }
    stop() {
        this.paused = true;
    }
}

module.exports = BadBoy;