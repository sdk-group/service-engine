'use strict'

let Promise = require('bluebird');
let _ = require('lodash');

let EventRegistry = require(_base + '/Engine/EventRegistry.js');

let PermissionLogic = require('./permission-logic.js');
let queue = require('global-queue');

/**
 * Abstract service
 */

class AbstractService {
	constructor({
		event_group = ''
	}) {
		this.event_names = event_group ? this.getEvents(event_group) : {};

		this.required_permissions = new PermissionLogic();
		this.setChannels(queue)
			.state('created');

	}
	getName() {
		return this.constructor.name;
	}

	state(name) {
		if(!name) return this.state_id;

		this.state_id = name.toLowerCase();

		switch(this.state_id) {
			case 'created':
				break;
			case 'init':
				break;
			case 'waiting':
				break;
			case 'working':
				break;
			case 'paused':
				break;
			default:
				throw new Error('unknown state');
				break;
		}

		return this;
	}

	getEvents(event_group) {
		return EventRegistry.getEvents(event_group);
	}
	addPermission(name, params) {
		this.required_permissions.add(name, params);
		return this;
	}
	launch() {
		return this.required_permissions.request()
			.then((result) => {
				this.state('waiting');

				if(result === true) {
					console.log('%s: can start now', this.getName());
					this.start();
				} else {
					console.log('%s: some permissions dropped, start is delayed', this.getName());
				}
				return result;
			})
			.catch(() => {
				console.log('%s: Could not get permissions for service, everything is really bad', this.getName());
				return false;
			});
	}

	setChannels(queue) {
		this.required_permissions.setChannels(queue)
		this.emitter = queue;
		return this;
	}

	init(config) {
		this.config = config || {};

		if(!this.emitter) return Promise.reject('%s: U should set channels before', this.getName());

		this.required_permissions.dropped(() => {
			if(this.state() === 'working') {
				console.log('%s: oh no, so bad', this.getName());
				this.pause();
				this.state('waiting');
			}
		});

		this.required_permissions.restored(() => {
			if(this.state() === 'waiting') {
				this.start();
				console.log('%s: excellent...', this.getName());
			}
		});

		this.state('init');

		return Promise.resolve(true);
	}

	start() {
		//@TODO: What should it do in current context?
		//@TODO: requestPermissions() here
		if(this.state() === 'working') throw new Error('Running already!');
		this.state('working');

		return this;
	}

	pause() {
		//@TODO: What should it do in current context?
		this.state('paused');

		return this;
	}

	resume() {
		//@TODO: What should it do in current context?
		//this.state('waiting');
		//set waiting, call permissions, get

		return this;
	}
	get paused() {
		return !this.isWorking();
	}
	isWorking() {
		return this.state() === 'working';
	}
}

module.exports = AbstractService;