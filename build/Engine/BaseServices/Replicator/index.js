'use strict';

let ways = {
	one: 'direct',
	two: 'bidirect'
};

let events = {
	replication: {
		create: function (way) {
			return 'replication.create.' + way;
		},
		remove: function (way) {
			return 'replication.remove.' + way;
		},
		pause: function (way) {
			return 'replication.pause.' + way;
		},
		resume: function (way) {
			return 'replication.resume.' + way;
		},
		settings: "replication.settings",
		stats: "replication.statistics"
	}
};

let tasks = [{
	name: events.replication.create(ways.one),
	handler: 'createOnewayReplication'
}, {
	name: events.replication.create(ways.two),
	handler: 'createTwowayReplication'
}, {
	name: events.replication.remove(ways.one),
	handler: 'removeOnewayReplication'
}, {
	name: events.replication.remove(ways.two),
	handler: 'removeTwowayReplication'
}, {
	name: events.replication.pause(ways.one),
	handler: 'pauseOnewayReplication'
}, {
	name: events.replication.pause(ways.two),
	handler: 'pauseTwowayReplication'
}, {
	name: events.replication.resume(ways.one),
	handler: 'resumeOnewayReplication'
}, {
	name: events.replication.resume(ways.two),
	handler: 'resumeTwowayReplication'
}, {
	name: events.replication.settings,
	handler: 'settings'
}, {
	name: events.replication.stats,
	handler: 'getReplicationState'
}];

module.exports = {
	module: require('./replicator.js'),
	permissions: [],
	tasks: tasks,
	events: {
		group: 'replication',
		shorthands: events.replication
	}
};