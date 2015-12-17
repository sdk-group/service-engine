'use strict'

let Abstract = require('../Abstract/abstract.js');
let _ = require("lodash");
let Error = require(_base + "/build/Model/Error/Lapsus")("BrokerError");

class Broker extends Abstract {
	constructor() {
		super({
			event_group: 'broker'
		});

		this.queues_required = {
			"event-queue": false,
			"task-queue": true
		};
		this.errname = Error.name;

	}

	setChannels(options) {
		super.setChannels(options);

		return this;
	}

	init(config) {
		this.config = config || {};
		if(!this.emitter && (this.queues_required['event-queue'] || this.queues_required['task-queue'])) {
			return Promise.reject(new Error("SERVICE_ERROR", 'U should set channels before'));
		}

		let tasks = [{
			name: this.event_names.resources,
			handler: this.list
		}];
		_.forEach(tasks, (task) => {
			this.emitter.listenTask(task.name, (data) => _.bind(task.handler, this)(data));
		});
		return Promise.resolve(true);
	}

	start() {
		super.start();
		this.paused = false;
		console.log('Broker : starting...');

		return this;
	}

	pause() {
		//@TODO: Dunno what should they do when paused or resumed
		super.pause();
		this.paused = true;

		return this;
	}

	resume() {
		//@TODO: Dunno what should they do when paused or resumed
		super.resume();
		this.paused = false;

		return this;
	}

	//API

	list({
		type: res_type, //e.g. timeslot
		start: from, //params for range
		end: to //
	}) {
		//temporary. Means that start and end contain ids of timeslots in db
		let dbrange = _.map(_.range(from, to + 1), (id) => {
			return this.identifier("resource", id);
		});

		return this.emitter.addTask(this.getEvents('dbface').request, {
			action: 'getMulti',
			params: [dbrange],
			id: false
		});
	}
}

module.exports = Broker;