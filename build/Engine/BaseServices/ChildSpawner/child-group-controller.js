'use strict';
let Promise = require('bluebird');
let child_process = require('child_process');

let getEvents = require(_base + '/Engine/Model/Events/events.js');

class ChildGroupController {
  constructor(queue) {
    this.process = child_process.fork(__dirname + '/process/process.js');
    this.queue = queue;

    queue.addAdapter('ipc', this.process);

    this.event_names = getEvents('child_process');

    let system_event = this.event_names.system(this.process.pid);

    queue.emit(system_event, {
      sub_event: 'base_settings',
      _base: _base
    });

    this.group_spawned = new Promise((resolve, reject) => {
      queue.on(system_event, d => {
        if (d.sub_event === 'spawned') {
          resolve(d);
        }
      });
    });
  }
  spawn(config) {
    let init = this.event_names.init(this.process.pid);

    this.initialized = this.group_spawned.then(() => {
      return this.queue.addTask(init, config);
    });

    return this.initialized;
  }
  launch() {
    let launch = this.event_names.launch(this.process.pid);

    return this.queue.addTask(launch, {});
  }
  ready() {
    return this.group_spawned;
  }
}

module.exports = ChildGroupController;