'use strict'
let Abstract = require('../Abstract/abstract.js');

let path = require("path");

let Couchbird = require("Couchbird");
let N1qlQuery = Couchbird.N1qlQuery;
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
		key,
		stime,
		time,
		task_name,
		module_name,
		task_type,
		params,
		completed = false
	}) {
		return this._db.upsert(key, {
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
		let key = _.join([this.key, module_name, task_type], '--');
		let delta = (time - now) * 1000;
		let stime = _.now() + delta;
		if (delta < this.immediate_delta) {
			return this.runTask({
					module_name,
					task_name,
					task_type,
					params
				})
				.then((res) => {
					return this.storeTask({
						key,
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
				key,
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
		console.log("TASK", task_name, task_type);
		if (task_type == 'emit') {
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
		from = from - 2 * this.interval;
		let task_content;
		return this.getTasks({
				from,
				to
			})
			.then((tasks) => {
				console.log("RUNNING TASKS", tasks, from, to);
				task_content = _.keyBy(tasks, 'key');
				return Promise.props(_.mapValues(task_content, (task) => {
					return this.runTask(task);
				}));
			})
			.then((res) => {
				return Promise.props(_.mapValues(res, (task_result, key) => {
					let task = task_content[key];
					task.completed = task_result;
					return this.storeTask(task);
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
		let query = `SELECT meta().id as \`key\`, module_name, task_name, task_type, time, stime, params FROM ${bname} WHERE type='${this.task_class}' AND stime > ${_.parseInt(from)} AND stime < ${_.parseInt(to)} OR completed=false`;
		let q = N1qlQuery.fromString(query);
		return this._db.N1QL(q);
	}

}

module.exports = Facehugger;
