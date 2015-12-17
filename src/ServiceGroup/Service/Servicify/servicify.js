'use strict'

let _ = require('lodash');

let Abstract = require('../Abstract/abstract.js');
let queue = require('global-queue');
//@FIXIT: not implemented yet
let EventRegistry = require(_base + '/EventRegistry.js');

const example = {
  module: require('./some_module.js'),
  permissions: [{
    'name': 'some_name',
    'params': {
      some_params: 0
    }
  }],
  tasks: [{
    name: 'example.method.1',
    method: 'exampleMethod1'
  }, {
    name: 'example.method.2',
    method: 'exampleMethod2'
  }],
  events: []
};

const FAILURE_MESSAGE = {
  reason: 'service down',
  status: 'failed'
};

class Servicify extends Abstract {
  constructor(config) {
    let Model = config.module;
    this.module = new Model();

    _.forEach(config.permissions, (permission) => {
      this.addPermission(permission.name, permission.params);
    });

    _.forEach(config.tasks, (task) => {
      if (!(this.module[task.method] instanceof Function))
        throw new Error('no such method');

      let method = this.module[task.method].bind(this.module);
      queue.listenTask(task.name, (data) => this.isWorking() ? method(data) : FAILURE_MESSAGE);
    });

  }
  init(config) {
    super.init(config);
    if (this.module.init) this.module.init(config);
  }
}


module.exports = Servicify;