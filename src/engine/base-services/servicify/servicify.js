'use strict'

const _ = require('lodash');
const StateMachine = require('./service-state-machine.js');

const FAILURE_MESSAGE = {
	reason: 'imho, service is down',
	status: false
};

class Servicify extends StateMachine {
	constructor(model, broker, config) {
		super(broker);
		this.service_name = config.name || ;
		let events = config.events || {};
		EventRegistry.addGroup(events);

		let Model = config.module;
		this.module = new Model();
		this.module.emitter = queue;

		_.forEach(config.permissions, (permission) => {
			this.addPermission(permission.name, permission.params);
		});

		if (config.exposed) {
			let controller_name = config.name || _.kebabCase(Model.name);

			queue.listenTask(controller_name, (data_and_action) => this.isWorking() ? this.getAction(data_and_action) : FAILURE_MESSAGE);
		}

		_.forEach(config.tasks, (task) => {
			if (!(this.module[task.handler] instanceof Function)) throw new Error('no such method');

			let method = this.module[task.handler].bind(this.module);
			let name = task.name || _.kebabCase(task.handler);
			queue.listenTask(name, (data) => this.isWorking() ? method(data) : FAILURE_MESSAGE);
		});
	}
	getNameString() {
		return `${this.constructor.name} of ${this.module.constructor.name} named ${this.getName()}`;
	}
	getName() {
		return this.service_name;
	}
	init(config) {
		let init = _.isFunction(this.module.init) ? this.module.init(config) : true;

		return Promise.resolve(init);
	}
	launch() {
		let launch = _.isFunction(this.module.launch) ? this.module.launch() : true

		let result = Promise.resolve(launch).then((res) => {
			this.start();
			return res;
		});

		return result
	}
	getAction(data) {
		let kebab = 'action-' + data._action;
		let method_name = _.camelCase(kebab);

		let mod = this.module;
		let method = mod[method_name];
		if (!_.isFunction(method))
			throw new Error(`No method ${method_name} in module ${mod.constructor.name}`);

		return method.call(mod, data);
	}
}


module.exports = Servicify;
