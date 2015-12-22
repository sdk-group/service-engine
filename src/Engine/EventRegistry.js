'use strict'

let events = {};

class EventRegistry {
	constructor() {
		throw new Error('singletone');
	}
	static init(init_events) {
		events = init_events;
	}
	static addGroup(events) {
		events[events.group] = events.shorthands;
	}
	static getEvents(service, name) {
		if(!name) {
			return events[service];
		}
		return events[service][name];
	}
}


module.exports = EventRegistry;