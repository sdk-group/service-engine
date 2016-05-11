module.exports = {
	doctor: {
		healthy: 'now.healthy',
		unhealthy: 'now.unhealthy',
		register: 'inspector.register'
	},
	dbface: {
		request: 'dbface.request'
	},
	arbiter: {
		getup: "arbiter.wake"
	},
	taskrunner: {
		add_task: "taskrunner.add.task",
		cancel_task: "taskrunner.cancel.task",
		now: "taskrunner.now"
	},
	facehugger: {
		request: 'facehugger.request'
	},
	permission: {
		dropped: function (name, key) {
			return 'permission.dropped.' + name + '.' + key;
		},
		restored: function (name, key) {
			return 'permission.restored.' + name + '.' + key;
		},
		request: 'permission.request'
	},
	child_process: {
		init: function (pid) {
			return 'child_process.' + pid + '.init';
		},
		system: function (pid) {
			return 'system.child_process.' + pid;
		},
		launch: function (pid) {
			return 'system.child_process.' + pid + '.launch';
		}
	}
};