'use strict'
let Abstract = require('../Abstract/abstract.js');

let path = require("path");

let Couchbird = require("Couchbird");
let db = Couchbird();

class Taskrunner extends Abstract {
	constructor() {
		super({
			event_group: 'taskrunner'
		});
	}

	init(params, cfg) {
		super.init(params);
		this.key = _.kebabCase(params.key) || "task";
		this.interval = (params.interval || 60) * 60000;
		this.t_interval = this.interval;
		this.ahead_delta = params.ahead_delta || 1000;
		this.immediate_delta = params.immediate_delta || 500;
		this.remove_on_completion = params.remove_on_completion || true;
		this.task_class = _.upperFirst(_.camelCase(this.key));
		this.task_expiration = _.parseInt(params.task_expiration) || 0;
		this.from = _.parseInt(moment()
			.startOf('day')
			.format('x'));

		this.emitter.on(this.event_names.add_task, (data) => this.runOrScheduleTask(data));
		this.emitter.on(this.event_names.cancel_task, (data) => this.cancelTask(data));
		this.emitter.listenTask(this.event_names.now, (data) => this.now());
		this.emitter.listenTask(this.event_names.add_task, (data) => this.runOrScheduleTask(data));
		this.emitter.listenTask(this.event_names.cancel_task, (data) => this.cancelTask(data));

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

	storeTask(task) {
		let cnt_key = `counter-${task['@id']}`;

		return this._db.counter(cnt_key, 1, {
				initial: 0
			})
			.then((res) => {
				task['@id'] = `${task['@id']}-${(res.value || 0)}`;
				let opts = {};
				opts[task['@id']] = {
					expiry: this.task_expiration
				};
				// console.log("STORING", task, cnt_key);
				return this._db.insertNodes(task, opts);
			})
			.catch((err) => {
				console.log("ERR STORING TASK", err.stack);
				return false;
			});
	}

	completeTask({
		task,
		result,
		existent = true
	}) {
		task.completed = result;
		// console.log("COMPLETED TASK", task, result, existent, this.remove_on_completion);
		return this.remove_on_completion ? (existent ? this._db.remove(task['@id']) : Promise.resolve(true)) : this.storeTask(task);
	}

	debounceTask(task) {
		return this.getTaskLookup(task)
			.then((previous_task) => {
				// console.log("______________________________________________________________________________________");
				// console.log("PREV TASK", previous_task, task);
				return previous_task ? this._db.remove(previous_task) : Promise.resolve(true);
			})
			.then((res) => {
				return this.createTaskLookup(task);
			});
	}

	cancelTask(task_data) {
		let task = this.makeTask(task_data);
		let lookup_key = this.taskLookupKey(task);
		return this.getTaskLookup(task)
			.then(tsk => {
				// console.log("CANCEL TASK", task, tsk);
				return tsk ? this._db.removeNodes([tsk, lookup_key]) : Promise.resolve(false);
			})
			.then((res) => {
				return this.settleNext();
			});
	}

	maybeRescheduleTask(task) {
		return task.regular ? this.scheduleTask(task) : Promise.resolve(false);
	}

	maybeDebounceTask(task) {
		return task.solo ? this.debounceTask(task) : Promise.resolve(false);
	}

	maybeCreateCancellation(task) {
		return task.solo ? Promise.resolve(false) : this.createTaskLookup(task);
	}

	taskLookupKey(task) {
		return `lookup_task_${task.identifier}`;
	}

	getTaskLookup(task) {
		let lookup_key = this.taskLookupKey(task);
		return this._db.getNodes(lookup_key)
			.then((res) => {
				return _.get(res, `${lookup_key}.value.content`, false);
			});
	}

	createTaskLookup(task) {
		let lookup_key = this.taskLookupKey(task);
		let lookup = {
			"@id": lookup_key,
			"@category": this.task_class,
			"@type": "Lookup",
			"content": task['@id']
		};
		return this._db.upsertNodes(lookup);
	}

	runOrScheduleTask(task_data) {
		let delta = task_data.time * 1000;

		console.log("ADD TASK ", task_data);

		if (delta < this.immediate_delta || delta < 0) {
			let stime = _.now() + delta;
			if (!task_data.ahead)
				stime = stime + this.ahead_delta;
			task_data.stime = stime;

			return this.runTask(task_data)
				.then((res) => {
					return this.completeTask({
						task: task_data,
						result: res,
						existent: false
					});
				});
		} else {
			let t_id;
			return this.scheduleTask(task_data)
				.then((res) => {
					t_id = res;
					return this.settleNext();
				})
				.then(r => t_id);
		}
	}

	makeTask({
		cancellation_code,
		time,
		stime,
		task_name,
		solo = false,
		regular = false,
		module_name,
		task_type,
		params
	}) {
		// console.log("MAKE TASK", ahead, stime);
		let identifier = `${module_name}-${task_type}-${task_name}-${params._action}`;
		if (cancellation_code)
			identifier += `--${cancellation_code}`;

		let key = `${this.key}-${_.parseInt(_.now() / this.interval)}`;
		let task = {
			"@id": key,
			"@type": this.task_class,
			//debounce params
			identifier,
			solo,
			//cancellation params
			cancellation_code,
			//timings
			stime,
			time,
			//rescheduling
			regular,
			//emit
			task_name,
			//addtask
			module_name,
			task_type,
			//args
			params,
			completed: false
		};
		return task;
	}

	scheduleTask(task_data) {
		let delta = task_data.time * 1000;
		let stime = _.now() + delta;
		if (!task_data.ahead)
			stime = stime + this.ahead_delta;
		task_data.stime = stime;
		console.log("SCHEDULE TASK", task_data);
		let task = this.makeTask(task_data);

		return this.storeTask(task)
			.then((res) => {
				task['@id'] = _.keys(res)[0];
				return this.maybeDebounceTask(task);
			})
			.then((res) => {
				return this.maybeCreateCancellation(task);
			})
			.then(res => task['@id']);
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
		// console.log("RUNNING TASKS");
		let from = this.from;;
		let to = this.to = _.now() + this.ahead_delta;

		let task_content;
		let uniq_tasks;
		// let tm;
		// let diff;

		return this.getTasks()
			.then((tasks) => {
				console.log("RUNNING TASKS", tasks);
				// console.log("RUNNING TASKS", _.map(tasks, '@id'));
				task_content = _(tasks)
					.filter((task) => {
						return (task.stime < to && !task.completed);
					})
					.orderBy('stime', 'desc');


				uniq_tasks = task_content
					.uniqWith((v, ov) => {
						return v.identifier == ov.identifier && v.solo && ov.solo;
					})
					.keyBy('@id')
					.value();

				task_content = task_content
					.keyBy('@id')
					.value();

				console.log("UNIQ", uniq_tasks);
				console.log("TASK CONTENT", task_content);
			})
			.then((res) => {
				// console.log("RRRRRR", res);
				return Promise.map(_.values(uniq_tasks), (task) => {
					return this.maybeRescheduleTask(task);
				});
			})
			.then((res) => {
				return Promise.props(_.mapValues(task_content, (task) => {
					return uniq_tasks[task['@id']] ? this.runTask(task) : Promise.resolve(true);
				}));
			})
			.then((res) => {
				return Promise.props(_.mapValues(res, (task_result, key) => {
					let task = _.cloneDeep(task_content[key]);
					task.completed = task_result;
					return this.completeTask({
						task,
						result: !!task_result,
						existent: true
					});
				}));
			})
			.then((res) => {
				// console.log("FFFFF", res);
				return this.settleNext();
			})
			.then((res) => {
				this.from = this.to;
				return res;
			})
			.catch((err) => {
				console.log("ERR RUN TASKS", err.stack);
				return false;
			});
	}

	getTasks() {
		console.log("FROM", this.from, "TO", this.to, "NOW", _.now());
		let intervals = _.range(_.parseInt(this.from / this.interval) - 1, _.parseInt(_.now() / this.interval) + 2);
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
					.orderBy(_.parseInt, 'asc')
					.find(t => (t > this.to));
				let next_mark = (_.parseInt(_.now() / this.interval) + 1) * this.interval;
				this.t_interval = (last || next_mark) - _.now();
				// this.from = this.to;
				// console.log(tasks);
				console.log("NEXT", last, next_mark, this.t_interval);
				clearTimeout(this.timer);
				this.timer = setTimeout(() => {
					this.runTasks();
				}, this.t_interval);
				return Promise.resolve(true);
			});
	}
}

module.exports = Taskrunner;