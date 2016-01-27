'use strict'

let _ = require('lodash');
let queue = require('global-queue');

let Abstract = require('../Abstract');
//@FIXIT: not implemented yet
let EventRegistry = require('../../EventRegistry.js');


const FAILURE_MESSAGE = {
	reason: 'service down',
	status: 'failed'
};

class Servicify extends Abstract {
	constructor(config) {
		super({});
		let events = config.events || {};
		EventRegistry.addGroup(events);

		let Model = config.module;
		this.module = new Model();

		_.forEach(config.permissions, (permission) => {
			this.addPermission(permission.name, permission.params);
		});

		if(config.exposed) {
			let controller_name = config.name || _.kebabCase(Model.name);

			queue.listenTask(controller_name, (data_and_action) => this.isWorking() ? this.getAction(data_and_action) : FAILURE_MESSAGE);
		}

		_.forEach(config.tasks, (task) => {
			if(!(this.module[task.handler] instanceof Function))
				throw new Error('no such method');

			let method = this.module[task.handler].bind(this.module);
			let name = task.name || _.kebabCase(task.handler);

			queue.listenTask(name, (data) => this.isWorking() ? method(data) : FAILURE_MESSAGE);
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

	getAction(data) {
		let kebab = 'action-' + data._action;
		let method_name = _.camelCase(kebab);

		let module = this.module;
		let method = module[method_name];
		if(!_.isFunction(method))
			throw new Error('no such method');

		return method.call(module, data);
	}
}


module.exports = Servicify;