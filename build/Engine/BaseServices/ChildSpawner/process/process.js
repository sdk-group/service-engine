'use strict';
let Queue = require('custom-queue');
let boot = require('./boot.js');

let queue = new Queue();

queue.addAdapter('ipc', process);

boot(queue).then(() => {
	let getEvents = require(_base + '/Engine/Model/Events/events.js');
	let ChildServiceGroup = require('./child-service-group.js');

	let event_names = getEvents('child_process');
	let ServiceGroup = {};
	let pid = process.pid;

	queue.listenTask(event_names.init(pid), config => {
		ServiceGroup = new ChildServiceGroup(config);
		ServiceGroup.setChannels(queue);
		return true;
	});

	console.log(event_names.launch(pid));
	queue.listenTask(event_names.launch(pid), config => {
		ServiceGroup.launch();

		return true;
	});

	queue.emit('system.child_process.' + process.pid, {
		sub_event: 'spawned',
		process_id: process.pid
	});
});