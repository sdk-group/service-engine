'use strict'
let Abstract = require('../Abstract/abstract.js');

let path = require("path");

let Couchbird = require("Couchbird");
let db = Couchbird();

function compareNumbers(a, b) {
	return a - b;
}


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
		this.task_class = "Task"; //_.upperFirst(_.camelCase(this.key));
		this.task_expiration = _.parseInt(params.task_expiration) || 60 * 60 * 6;
		this.from = _.parseInt(moment()
			.startOf('day')
			.format('x'));
		this.max_parallel_queries = cfg.max_parallel_queries || 1000;
		this.solo_tasks = {};

		this.emitter.on(this.event_names.add_task, (data) => this.runOrScheduleTask(data));
		this.emitter.on(this.event_names.cancel_task, (data) => this.cancelTask(data));
		this.emitter.listenTask(this.event_names.now, (data) => this.now());
		this.emitter.listenTask(this.event_names.add_task, (data) => this.runOrScheduleTask(data));
		this.emitter.listenTask(this.event_names.cancel_task, (data) => this.cancelTask(data));

		this._db = db.bucket(cfg.buckets.main);

		return Promise.resolve(true);
	}

	launch() {
		return this.startup()
			.then((res) => true);
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
				initial: 0,
				expiry: this.task_expiration + task.stime / 1000
			})
			.then((res) => {
				task['@id'] = `${task['@id']}-${(res.value || 0)}`;
				let opts = {};
				opts[task['@id']] = {
					expiry: this.task_expiration + task.stime / 1000
				};
				console.log("STORING", task['@id']);
				inmemory_cache.set(task['@id'], task, this.task_expiration + task.stime / 1000);
				return this._db.insertNodes(task, opts);
			})
			.catch((err) => {
				console.log("ERR STORING TASK", err.stack);
				global.logger && logger.error(
					err, {
						module: 'taskrunner',
						method: 'store-task',
						task
					});
				return false;
			});
	}

	completeTask({
		task,
		result,
		existent = true
	}) {
		task.completed = result;
		// console.log("-----------------------------------------");
		// console.log("COMPLETED TASK", result, existent, task);
		// console.log("-----------------------------------------");
		if (existent)
			inmemory_cache.get(task['@id']) && inmemory_cache.set(task['@id'], -1, this.task_expiration);
		return this.remove_on_completion ? (existent ? this._db.remove(task['@id']) : Promise.resolve(true)) : this.storeTask(task);
	}

	debounceTask(task) {
		return this.getTaskLookup(task)
			.then((previous_task) => {
				return previous_task && (inmemory_cache.get(previous_task) || this._db.get(previous_task)
					.then(r => r && r.value));
			})
			.then((prev_task) => {
				// console.log("_____________________________________________________");
				// console.log("PREV TASK", prev_task, task);
				if (prev_task) {
					inmemory_cache.get(prev_task['@id']) && inmemory_cache.set(prev_task['@id'], -1, this.task_expiration);
					return this._db.remove(prev_task['@id']);
				}
				return !prev_task;
			})
			.then((res) => {
				return res ? this.createTaskLookup(task) : false;
			});
	}

	cancelTask(task_data) {
		let task = this.makeTask(task_data);
		let lookup_key = this.taskLookupKey(task);
		return this.getTaskLookup(task)
			.then(tsk => {
				// console.log("CANCEL TASK", task, tsk);
				if (!tsk)
					return false;
				inmemory_cache.get(tsk) && inmemory_cache.set(tsk, -1, this.task_expiration);
				inmemory_cache.get(lookup_key) && inmemory_cache.del(lookup_key);
				return this._db.removeNodes([tsk, lookup_key]);
			})
			.then((res) => {
				return this.settleNext();
			});
	}

	maybeRescheduleTask(task) {
		// console.log("RESCHE", task);
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
		let cached = inmemory_cache.get(lookup_key);
		return cached && Promise.resolve(cached) || this._db.getNodes(lookup_key)
			.then((res) => {
				let r = (res && res[lookup_key] && res[lookup_key].value && res[lookup_key].value.content || false);
				r && inmemory_cache.set(lookup_key, r, this.task_expiration + task.stime / 1000);
				return r;
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
		let opts = {};
		opts[lookup['@id']] = {
			expiry: this.task_expiration + task.stime / 1000
		};
		inmemory_cache.set(lookup_key, lookup.content, this.task_expiration + task.stime / 1000);
		return this._db.upsertNodes(lookup, opts);
	}

	runOrScheduleTask(task_data) {
		let delta = task_data.time * 1000;
		let stime = _.now() + delta;
		if (!task_data.ahead)
			stime = stime + this.ahead_delta;
		task_data.stime = stime;
		// console.log("ADD TASK ", task_data);

		if (delta < this.immediate_delta || delta < 0) {
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

		let key = `${this.key}-${_.parseInt(stime / this.interval)}`;
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
		let task = this.makeTask(task_data);
		// console.log("SCHEDULE TASK", task);

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
		// console.log("RUNTASK", module_name, task_name, task_type, params);
		let opts = _.cloneDeep(params);
		opts.ts_now = _.now();
		switch (task_type) {
		case 'emit':
			this.emitter.emit(task_name, opts);
			return Promise.resolve(true);
			break;
		case 'command':
			this.emitter.command(task_name, opts);
			return Promise.resolve(true);
			break;
		case 'add-task':
			return this.emitter.addTask(module_name, opts)
				.then((res) => {
					return true;
				})
				.catch((err) => {
					console.log("TASK ERRORED", (module_name || task_name), err.stack);
					return false;
				});
			break;
		}
	}

	runTasks() {
		// console.log("RUNNING TASKS");
		let from = this.from;
		let to = this.to = _.now() + this.ahead_delta;

		let task_content;
		let uniq_tasks;
		// let tm;
		// let diff;

		return this.getTasks()
			.then((tasks) => {
				// console.log("RUNNING TASKS", tasks);
				console.log("RUNNING TASKS", _.map(tasks, '@id'));
				task_content = _(tasks)
					.filter((task) => {
						return (task.stime < to && !task.completed);
					})
					.orderBy('stime', 'desc')
					.value();


				uniq_tasks = _(task_content)
					.uniqWith((v, ov) => {
						return (v.identifier == ov.identifier) && v.solo && ov.solo;
					})
					.keyBy('@id')
					.value();


				// console.log("TASK", _.map(task_content, 'stime'));
				// console.log("TASK", _.map(task_content, 'identifier'));
				// console.log("UNIQ", _.map(uniq_tasks, 'stime'));
				// console.log("UNIQ", _.map(uniq_tasks, 'identifier'));
				// console.log("TASK CONTENT", task_content);
				// console.log("RRRRRR", res);
				return Promise.map(_.values(uniq_tasks), (task) => {
					return this.maybeRescheduleTask(task);
				});
			})
			.then((res) => {
				// console.log("RESCHE RES", res, _.values(task_content));
				return Promise.mapSeries(_.values(task_content), (task) => {
					// console.log(uniq_tasks[task['@id']]);
					return Promise.resolve(uniq_tasks[task['@id']] ? this.runTask(task) : true);
				})

			})
			.then((res) => {
				// console.log("GOTTASKS", res);
				return Promise.map(_.values(res), (task_result, key) => {
					let task = _.cloneDeep(task_content[key]);
					task.completed = task_result;
					return this.completeTask({
						task,
						result: !!task_result,
						existent: true
					});
				});
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
				global.logger && logger.error(
					err, {
						module: 'taskrunner',
						method: 'run-tasks'
					});
				return false;
			});
	}

	getTasks() {
		// console.log("FROM", this.from, "TO", this.to, "NOW", _.now());
		let intervals = _.range(_.parseInt(this.from / this.interval) - 1, _.parseInt(_.now() / this.interval) + 1);
		let cnt_keys = _.map(intervals, k => `counter-${this.key}-${k}`);
		let cached;
		return this._db.getNodes(cnt_keys)
			.then(counters => {
				let keys = [],
					ck = Object.keys(counters),
					l = ck.length,
					c_key, c_val, key;
				while (l--) {
					c_key = ck[l];
					c_val = counters[c_key];
					if (!c_val) continue;
					c_val = c_val.value + 1;
					key = _(c_key)
						.split('-')
						.slice(1)
						.join('-');
					while (c_val--) {
						keys.push(`${key}-${c_val}`);
					}
				}
				cached = inmemory_cache.mget(keys);
				// return cached;
				let missing = _.filter(keys, key => _.isUndefined(cached[key]));
				console.log(keys, missing);
				console.log("MISSING------------------------>>>>>>>>>", missing.length, "/", keys.length);
				return this._db.getNodes(missing);
			})
			.then((tasks) => {
				return _(tasks)
					.filter((tsk, tsk_key) => {
						let v = tsk && tsk.value;
						(v) ?
						inmemory_cache.set(tsk_key, v, this.task_expiration + v.stime / 1000):
							inmemory_cache.set(tsk_key, -1, this.task_expiration);
						return !!v;
					})
					.concat(_.filter(_.values(cached), t => t != -1))
					.sortBy('stime')
					.value();
			});
	}

	startup() {

		let from = this.from;;
		let to = this.to = _.now() - this.interval;
		// console.log("ЫFROM", this.from, "TO", this.to, "NOW", _.now());
		this.from = this.to;


		let task_content;
		let uniq_tasks;
		let intervals = _.range(_.parseInt(from / this.interval) - 2, _.parseInt(_.now() / this.interval));
		let cnt_keys = _.map(intervals, k => `counter-${this.key}-${k}`);
		return this._db.getNodes(cnt_keys)
			.then(counters => {
				let keys = [],
					ck = Object.keys(counters),
					l = ck.length,
					c_key, c_val, key;
				while (l--) {
					c_key = ck[l];
					c_val = counters[c_key];
					if (!c_val) continue;
					c_val = c_val.value + 1;
					key = _(c_key)
						.split('-')
						.slice(1)
						.join('-');
					while (c_val--) {
						keys.push(`${key}-${c_val}`);
					}
				}
				let chunked = _.chunk(keys, this.max_parallel_queries);

				return Promise.mapSeries(chunked, (ks) => {
						return this._db.getNodes(ks)
							.then((tasks) => {
								return _(tasks)
									.values()
									.compact()
									.map('value')
									.sortBy('stime')
									.value();
							});
					})
					.then((tasks) => {
						// console.log("RUNNING TASKS", tasks);
						// console.log("RUNNING TASKS", _.map(_.flatten(tasks), '@id'));
						task_content = _(tasks)
							.flatten()
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

						// console.log("UNIQ", _.size(uniq_tasks));
						// console.log("TASK CONTENT", task_content);
						// console.log("RRRRRR", res);
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
					});
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
				global.logger && logger.error(
					err, {
						module: 'taskrunner',
						method: 'startup'
					});
				console.log("ERR STARTUP TASKS", err.stack);
				return false;
			});;
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
				// console.log(_.map(tasks, 'identifier'));
				// console.log("NEXT", last, next_mark, this.t_interval);
				clearTimeout(this.timer);
				this.timer = setTimeout(() => {
					this.runTasks();
				}, this.t_interval);
				return Promise.resolve(true);
			});
	}
}

module.exports = Taskrunner;