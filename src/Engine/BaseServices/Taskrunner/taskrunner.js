'use strict'
let Abstract = require('../Abstract/abstract.js');

let path = require("path");

let Couchbird = require("Couchbird");
let N1qlQuery = Couchbird.N1qlQuery;
let db = Couchbird();

class Taskrunner extends Abstract {
	constructor() {
		super({
			event_group: 'taskrunner'
		});
	}

	init(params, cfg) {
		super.init(params);
		this.key = params.key || "task";
		this.interval = (params.interval || 60) * 60000;
		this.t_interval = this.interval;
		this.ahead_delta = params.ahead_delta || 1000;
		this.immediate_delta = params.immediate_delta || 500;
		this.remove_on_completion = params.remove_on_completion || true;
		this.task_class = _.upperFirst(_.camelCase(this.key));
		this.from = _.now();

		this.emitter.on(this.event_names.add_task, (data) => this.addTask(data));
		this.emitter.listenTask(this.event_names.now, (data) => this.now());

		this._db = db.bucket(cfg.buckets.main);

		this.runTasks();

		return Promise.resolve(true);
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
		stime,
		solo = false,
		time,
		task_name,
		module_name,
		task_type,
		params,
		completed = false
	}) {
		let identifier = `${module_name}-${task_type}-${task_name}-${params._action}`;
		let key = `${this.key}-${_.parseInt(_.now() / this.interval)}`;
		let cnt_key = `counter-${key}`;
		let task = {
			"@id": key,
			"@type": this.task_class,
			identifier,
			stime,
			time,
			task_name,
			solo,
			module_name,
			task_type,
			params,
			completed
		};
		console.log("STORING", key, stime, params, completed);

		return this._db.counter(cnt_key, 1, {
				initial: 0
			})
			.then((res) => {
				task['@id'] = `${key}-${(res.value || 0)}`;
				return this._db.insertNodes(task);
			})
			.then((res) => {
				console.log("GOT CURR INT", this.t_interval, res);
				if (this.from > stime) {
					this.t_interval = stime - _.now();
					console.log("SET CURR INT", this.t_interval, res);
					clearTimeout(this.timer);
					this.timer = setTimeout(() => {
						this.runTasks();
					}, this.t_interval);
				}
			})
			.catch((err) => {
				console.log("ERR STORING TASK", err.stack);
				return false;
			});
	}

	addTask({
		now,
		ahead = true,
		time,
		task_name,
		solo,
		module_name,
		task_type,
		params
	}) {
		let delta = time * 1000;
		let stime = _.now() + delta;
		if (!ahead)
			stime = stime + this.ahead_delta;
		console.log("ADDING TASK", time, task_name, task_type, module_name, params, stime);
		if (delta < this.immediate_delta || delta < 0) {
			return this.runTask({
					module_name,
					task_name,
					task_type,
					params
				})
				.then((res) => {
					return this.remove_on_completion ? Promise.resolve(true) :
						this.storeTask({
							stime,
							time,
							solo,
							task_name,
							module_name,
							task_type,
							params,
							completed: res
						});
				});
		} else {
			return this.storeTask({
				stime,
				time,
				task_name,
				solo,
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
		let opts = _.cloneDeep(params);
		opts.ts_now = _.now();
		if (task_type == 'emit') {
			this.emitter.emit(task_name, opts);
			return Promise.resolve(true);
		} else {
			return this.emitter.addTask(module_name, opts)
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
		let from = this.from;;
		let to = this.to = _.now() + this.ahead_delta;

		let task_content;
		// let tm;
		// let diff;

		return this.getTasks()
			.then((tasks) => {
				console.log("RUNNING TASKS", _.map(tasks, '@id'), from, to, this.t_interval);
				task_content = _(tasks)
					.filter((task) => {
						return (task.stime > from && task.stime < to && !task.completed);
					})
					.value();
				console.log("TASK CONTENT", task_content);
				return Promise.props(_.mapValues(task_content, (task) => {
					return this.runTask(task);
				}));
			})
			.then((res) => {
				return Promise.props(_.mapValues(res, (task_result, key) => {
					let task = _.cloneDeep(task_content[key]);
					task.completed = task_result;
					return this.remove_on_completion ? this._db.remove(key) : this.storeTask(task);
				}));
			})
			.then((res) => {
				return this.settleNext();
			})
			.catch((err) => {
				console.log("ERR RUN TASKS", err.stack);
				return false;
			});
	}

	getTasks() {
		let intervals = _.range(_.parseInt(this.from / this.interval), _.parseInt(_.now() / this.interval) + 1);
		let cnt_keys = _.map(intervals, k => `counter-${this.key}-${k}`);

		return this._db.getNodes(cnt_keys)
			.then(counters => {
				let keys = [];
				_(counters)
					.map((res, cnt_key) => {
						if (!res) return;
						let nums = res.value + 1;
						let key = _(cnt_key)
							.split('-')
							.slice(1)
							.join('-');
						keys = _.concat(keys, _.map(_.range(nums), (num) => `${key}-${num}`));
					})
					.value();
				return this._db.getNodes(keys);
			})
			.then((tasks) => {
				return _(tasks)
					.values()
					.compact()
					.map('value')
					.sortBy('stime')
					.value();
			});
	}

	settleNext() {
		return this.getTasks()
			.then((tasks) => {
				let last = _(tasks)
					.map('stime')
					.map(_.parseInt)
					.sortBy()
					.find(t => (t > this.to));
				console.log("NEXT", last);
				let next_mark = (_.parseInt(_.now() / this.interval) + 1) * this.interval;
				this.t_interval = _.min([next_mark, last]) - _.now();
				this.from = this.to;
				this.timer = setTimeout(() => {
					this.runTasks();
				}, this.t_interval);
				return Promise.resolve(true);
			});
	}
}

module.exports = Taskrunner;
