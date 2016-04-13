'use strict'
let Promise = require('bluebird');
let _ = require('lodash');
let getEvents = require('../../Model/Events/events.js');

let modules = [];

let getPermissionModel = function(module_name) {
	//coz cashing is slightly faster
	if(modules.hasOwnProperty(module_name)) {
		return modules[module_name];
	}

	modules[module_name] = require(_base + '/Engine/Model/Permission/' + /*_.upperFirst*/ (module_name) + '.js');

	return modules[module_name];
}

class ServicePermissionUtils {
	constructor(queue) {
		this.emitter = queue;

		this.service_permissions = [];
	}

	add(name, data) {
		let model = getPermissionModel(name);
		let permission = new model(data);
		this.service_permissions.push(permission);
	}

	setChannels(queue) {
		this.emitter = queue;
	}

	request() {
		if(!this.service_permissions.length) return Promise.resolve(true);

		let messages = [];

		_(this.service_permissions).forEach(permission => {
			let request_message = permission.requestMessage();
			messages.push(request_message);
		}).value();

		let request_permission_task = getEvents('permission').request;

		let p = this.emitter
			.addTask(request_permission_task, messages)
			.then((result) => {
				if(result === true || result.valid === true) {
					return true;
				} else {
					let details = result.details;

					for(var i = 0; i < details.length; i += 1) {
						if(!details[i].valid) {
							this.service_permissions[i].drop();
						}
					}

					return false;
				}
			})
			.catch(() => {
				throw new Error('Auth error');
			});

		return p;
	}

	dropped(callback) {
		if(!this.service_permissions.length) return;


		_(this.service_permissions).forEach(permission => {

			permission.onDrop(this.emitter, (d) => {
				console.log('Oh no its dropped, should shutdown everything', d);
				callback.call(null);
			});
		}).value();

	}

	restored(callback) {
		if(!this.service_permissions.length) return;


		_(this.service_permissions).forEach(permission => {

			permission.onRestore(this.emitter, (d) => {

				if(this.isAllUp()) {
					callback.call(null);
				} else {
					//pessimistic permission cheking
					//we can lose some events (or can not?)
					this.request().then((result) => {
						if(result === true) {
							callback.call(null);
						} else {
							//silence
						}
					});
				}
			});

		}).value();

	}

	isAllUp() {
		for(var i = 0; i < this.service_permissions.length; i += 1) {
			if(this.service_permissions[i].isDropped()) return false;
		}
		return true;
	}
}

module.exports = ServicePermissionUtils;
