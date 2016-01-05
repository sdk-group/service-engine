let EventRegistry = require('./build/Engine/EventRegistry.js');
let event_list = require('./build/Engine/Model/Events/event-list.js');
EventRegistry.init(event_list);

module.exports = {
	Engine: require('./build/Engine/Engine'),
	EventRegistry: EventRegistry
};