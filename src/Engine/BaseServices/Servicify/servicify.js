'use strict'

let _ = require('lodash');
let queue = require('global-queue');

let Abstract = require('../Abstract');
//@FIXIT: not implemented yet
let EventRegistry = require('../../EventRegistry.js');
//
// const example = {
//   module: require('./some_module.js'),
//   name: 'mymodule',
//   permissions: [{
//     'name': 'some_name',
//     'params': {
//       some_params: 0
//     }
//   }],
//   tasks: [{
//     name: 'example.method.1',
//     method: 'exampleMethod1'
//   }, {
//     name: 'example.method.2',
//     method: 'exampleMethod2'
//   }],
//   events: {
//     group: 'someModuleEvents',
//     shorthands: {
//       'short': 'my.module.event'
//     }
//   }
// };

const FAILURE_MESSAGE = {
  reason: 'service down',
  status: 'failed'
};

class Servicify extends Abstract {
  constructor(config) {
    super({});
    EventRegistry.addGroup(config.events);

    let Model = config.module;
    this.module = new Model();

    _.forEach(config.permissions, (permission) => {
      this.addPermission(permission.name, permission.params);
    });

    if (!config.tasks || _.isEmpty(tasks)) {
      let controller_name = config.name || _.kebabCase(Model.name);

      queue.listenTask(controller_name, (data_and_action) => {
        return this.isWorking() ? this.getAction(data_and_action) : FAILURE_MESSAGE
      });
    }

    _.forEach(config.tasks, (task) => {
      if (!(this.module[task.handler] instanceof Function))
        throw new Error('no such method');

      let method = this.module[task.handler].bind(this.module);
      let name = task.name || _.kebabCase(task.handler);

      queue.listenTask(name, (data) => {
        return this.isWorking() ? method(data) : FAILURE_MESSAGE
      });
    });
  }
  getName() {
    return `${this.constructor.name} of ${this.module.constructor.name}`;
  }

  init(config) {
    return super.init(config)
      .then((res) => {
        return _.isFunction(this.module.init) ? this.module.init(config) : res;
      });
  }

  getAction({
    action: handler,
    data: data
  }) {
    let kebab = 'action-' + handler;
    let method_name = _.camelCase(kebab);
    let module = this.module;

    if (!(module[method_name] instanceof Function))
      throw new Error('no such method');

    return module[method_name].call(module, data);
  }
}


module.exports = Servicify;