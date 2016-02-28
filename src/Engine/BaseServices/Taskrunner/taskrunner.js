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
		this.default_interval = this.interval;
		this.ahead_delta = params.ahead_delta || 1000;
		this.immediate_delta = params.immediate_delta || 1000;
		this.remove_on_completion = params.remove_on_completion || true;
		this.task_class = "Task";
		this.emitter.on(this.event_names.add_task, (data) => this.addTask(data));
		this.emitter.listenTask(this.event_names.now, (data) => this.now());
		setTimeout(() => {
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

	now() {
		return Promise.resolve(_.now());
	}

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
		console.log("STORING", key, time, stime, task_name, module_name, task_name, params, completed);
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
		let delta = (time - now) * 1000;
		console.log("DELTA", delta);
		let stime = _.now() + delta;
		let key = _.join([this.key, task_type, stime], '--');
		if(delta < this.immediate_delta) {
			return this.runTask({
					module_name,
					task_name,
					task_type,
					params
				})
				.then((res) => {
					return this.remove_on_completion ? Promise.resolve(true) :
						this.storeTask({
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
		params.ts_now = _.now();
		if(task_type == 'emit') {
			this.emitter.emit(task_name, params);
			return Promise.resolve(true);
		} else {
			return this.emitter.addTask(module_name, params)
				.then((res) => {
					return true;
				})
				.catch((err) => {
					console.log("TASK ERRORED", (module_name || task_name), err.stack);
					return false;
				});
		}
	}

	runTasks() {
		let from = _.now();
		let to = from + this.ahead_delta;
		from = from - this.interval * 1.5;
		let task_content;
		return this.getTasks({
				from,
				to
			})
			.then((tasks) => {
				console.log("RUNNING TASKS", _.map(tasks, 'key'), from, to, this.interval);
				task_content = _.keyBy(tasks, 'key');
				return Promise.props(_.mapValues(task_content, (task) => {
					return this.runTask(task);
				}));
			})
			.then((res) => {
				return Promise.props(_.mapValues(res, (task_result, key) => {
					let task = task_content[key];
					task.completed = task_result;
					return this.remove_on_completion && task_result ? this._db.remove(key) : this.storeTask(task);
				}));
			})
			.then((res) => {
				return this.getNext({
					from: (_.max(_.concat(_.map(task_content, 'stime'), _.now())))
				});
			})
			.then((res) => {
				console.log("PREV INT", this.interval, res[0] && (res[0].avg - _.now()), res);
				this.interval = res[0] && res[0].avg ? (res[0].avg - _.now()) : this.default_interval;
				setTimeout(() => {
					this.runTasks();
				}, this.interval);

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
		let query = `SELECT meta().id as \`key\`, module_name, task_name, task_type, time, stime, params FROM ${bname} WHERE type='${this.task_class}' AND stime > ${_.parseInt(from)} AND stime < ${_.parseInt(to)} AND completed=false`;
		let q = N1qlQuery.fromString(query);
		return this._db.N1QL(q);
	}

	getNext({
		from,
		delta
	}) {
		let bname = this._db.bucket_name;
		let query = `SELECT AVG(stime) as avg FROM ${bname} WHERE type='${this.task_class}' AND stime > ${_.parseInt(from)} AND completed=false ORDER BY stime ASC LIMIT 3`;
		let q = N1qlQuery.fromString(query);
		return this._db.N1QL(q);
	}
}

module.exports = Facehugger;