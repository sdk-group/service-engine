'use strict'
let Abstract = require('../Abstract/abstract.js');

let path = require("path");

let Couchbird = require("Couchbird");
let N1QLQuery = Couchbird.N1QLQuery;
let db = Couchbird();

class Facehugger extends Abstract {
	constructor() {
		super({
			event_group: 'taskrunner'
		});
	}

	init(params) {
		super.init(params);
		this.key = params.key || "task";
		this.interval = params.interval || 60000;
		this.ahead_delta = params.ahead_delta || 1000;
		this.immediate_delta = params.immediate_delta || 1000;
		this.task_class = "Task";
		this.emitter.on(this.event_names.add_task, (data) => this.addTask(data));
		setInterval(() => {
			this.runTasks();
		}, this.interval);
		return Promise.resolve(true);
	}

	initCouchbird(buckets) {
		this._db = db.bucket(buckets.main);
	}
	start() {
		super.start();
		console.log("Taskrunner: started");
		return this;
	}

	pause() {
		super.pause();
		console.log("Taskrunner: paused");

		return this;
	}

	resume() {
		super.resume();
		console.log("Taskrunner: resumed");

		return this;
	}

	/**
	 * own API
	 */

	storeTask({
		name,
		stime,
		time,
		task_name,
		module_name,
		task_type,
		params,
		completed = false
	}) {
		return this._db.upsert(name, {
				type: this.task_class,
				stime,
				time,
				task_name,
				module_name,
				task_type,
				params,
				completed
			})
			.catch((err) => {
				console.log("ERR STORING TASK", err.stack);
				return false;
			});
	}

	addTask({
		now,
		time,
		task_name,
		module_name,
		task_type,
		params
	}) {
		let name = _.join([this.key, module_name, task_type], '--');
		let delta = (time - now);
		let stime = _.now() + delta;
		if(delta < this.immediate_delta) {
			return this.runTask({
					module_name,
					task_name,
					task_type,
					params
				})
				.then((res) => {
					return this.storeTask({
						name,
						stime,
						time,
						task_name,
						module_name,
						task_type,
						params,
						completed: res
					});
				});
		} else {
			return this.storeTask({
				name,
				stime,
				time,
				task_name,
				module_name,
				task_type,
				params
			});
		}

	}

	runTask({
		module_name,
		task_name,
		task_type,
		params
	}) {
		if(task_type == 'emit') {
			this.emitter.emit(task_name, params);
			return Promise.resolve(true);
		} else {
			return this.emitter.addTask(module_name, params)
				.then((res) => {
					return true;
				})
				.catch((err) => {
					return false;
				});
		}
	}

	runTasks() {
		let from = _.now();
		let to = from + this.ahead_delta;
		from = from - this.interval;
		return this.getTasks({
				from,
				to
			})
			.then((tasks) => {
				console.log("RUNNING TASKS", tasks);
				return Promise.props(_.mapValues(tasks, (task) => {
					return this.runTask(task);
				}));
			})
			.catch((err) => {
				console.log("ERR RUN TASKS", err.stack);
				return false;
			});
	}

	getTasks({
		from,
		to
	}) {
		let bname = this._db.bucket_name;
		let query = `SELECT module_name, task_name, task_type, params FROM ${bname} WHERE type=${this.task_class} AND stime > ${_.parseInt(from)} AND stime < ${_.parseInt(to)}`;
		let q = N1qlQuery.fromString(query);
		return this._db.N1QL(q);
	}

}

module.exports = Facehugger;