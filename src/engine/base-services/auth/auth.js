'use strict'

let Abstract = require('../Abstract/abstract.js');
let util = require('util');
let Promise = require('bluebird');
let PermissionList = require('../PermissionHolder/permission-holder.js');

class Auth extends Abstract {
	constructor() {
		super({
			event_group: 'doctor'
		});

	}
	setChannels(options) {
		this.list = new PermissionList();
		super.setChannels(options);

		this.list.setChannels(options);

		return this;
	}

	init(config) {
		this.config = config || {};
		if(!this.emitter) return Promise.reject('U should set channels before');

		let request_task = this.getEvents('permission').request;

		this.emitter.listenTask(request_task, data => this.check(data));

		return this.list.init();
	}

	start() {
		super.start();
		this.list.start();

		return this;
	}

	pause() {
		//@TODO: Dunno what should they do when paused or resumed
		super.pause();
		this.list.pause();

		return this;
	}

	/**
	 * own API
	 */
	check(asked_permissions) {
		asked_permissions = util.isArray(asked_permissions) ? asked_permissions : [asked_permissions];

		if(asked_permissions.length === 0) {}
		let valid = true;
		let confirmation_list = {
			valid: true,
			details: []
		};

		let len = asked_permissions.length;
		for(var i = 0; i < len; i += 1) {
			let name = asked_permissions[i].permission;
			let key = asked_permissions[i].key;
			let info = {
				name: name,
				key: key,
				valid: true
			};

			if(!this.list.exists(name, key)) {
				valid = false;
				info.reason = 'not-exists';
				info.valid = false;
			} else
			if(this.list.isDropped(name, key)) {
				valid = false;
				info.reason = 'dropped';
				info.valid = false;
			}

			confirmation_list.details.push(info);
		}
		confirmation_list.valid = valid;
		return confirmation_list;
	}
}

module.exports = Auth;
