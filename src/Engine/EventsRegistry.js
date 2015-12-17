'use strict'

let events = {};

class EventsRegistry {
  constructor() {
    throw new Error('singletone');
  }
  static addGroup(events) {
    events[events.group] = events.shorthands;
  }
  static getEvent(service, name) {
    if (!name) {
      return events[service];
    }
    return events[service][name];
  }
}


module.exports = EventsRegistry;