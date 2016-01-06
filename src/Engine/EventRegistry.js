'use strict'

let events_list = {};

class EventRegistry {
	constructor() {
		throw new Error('singletone');
	}
	static init(init_events) {
		events_list = init_events;
	}
	static addGroup(events) {
		events_list[events.group] = _.merge((events_list[events.group] || {}), events.shorthands);
	}
	static getEvents(service, name) {
		if(!name) {
			return events_list[service];
		}
		return events_list[service][name];
	}
}


module.exports = EventRegistry;