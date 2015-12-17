'use strict'

let _ = require('lodash');

let Abstract = require('../Abstract');
let ChGC = require('./child-group-controller.js');

class ChildSpawner extends Abstract {
  constructor() {
    super({});
    this.group_names = [];
    this.group_configs = [];
    this.groups = [];
  }
  init(configs) {
    let _parent = super.init(configs);
    let childs_initialized = [];

    //@TODO: rework this Promise naming
    childs_initialized.push(_parent);

    _.forEach(configs, (config, key) => {
      this.group_names.push(key);
      let group = new ChGC(this.emitter);

      this.groups.push(group);

      childs_initialized.push(group.spawn(config));
    });

    return Promise.all(childs_initialized);
  }
  launch() {
    return super.launch().then(() => Promise.all(_.map(this.groups, (group) => group.launch())))
  }
  start() {
    super.start();
    console.log('Spawner: Started!');
  }
  pause() {
    super.pause();
    console.log('Spawner: Paused!');
  }
}

module.exports = ChildSpawner;