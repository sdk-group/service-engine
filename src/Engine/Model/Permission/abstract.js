'use strict'

let getEvents = require(_base + '/build/Model/Events/events.js');
/**
 * Abstract permission, just for lulz
 * @param {Object} params permission specific params
 */
class AbstractPermission {
	constructor() {}
	static keyToString(key_obj) {
		throw new Error('Abstract method');
	}

	static makeKey(key_data) {
		return key_data;
	}

	static getName() {
		throw new Error('Abstract method');
	}

	static dropMessage(params) {
		return params;
	}

	static restoreMessage(params) {
		return params;
	}

	requestMessage(params) {
		let message = {};
		return message;
	}

	drop() {
		this.is_dropped = true;
	}

	restore() {
		this.is_dropped = false;
	}

	isDropped() {
		return this.is_dropped;
	}

	onRestore(queue, callback) {
		let event_name = this.getEventName('restored');

		queue.on(event_name, (d) => {
			this.restore();
			callback.call(null, d);
		});
	}

	onDrop(queue, callback) {
		let event_name = this.getEventName('dropped');

		queue.on(event_name, (d) => {
			this.drop();
			callback.call(null, d);
		});
	}

	getEventName(type) {
		if(type !== 'dropped' && type !== 'restored') throw new Error('unknown event: ' + type);
		let permission_events = getEvents('permission');
		let event_name = permission_events[type](this.getName(), this.keyToString());
		return event_name;
	}
}

module.exports = AbstractPermission;