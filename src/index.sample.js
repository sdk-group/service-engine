'use strict'

require('./boot.js');
require("./hosts.js");

let config = require('./config/db_config.json');
let Auth = require('iris-auth');
let Couchbird = require('Couchbird')(config.couchbird); //singletone inits here
let IrisInit = require("resource-management-framework").initializer(config.buckets.main);

Auth.configure({
	data: config.buckets.main,
	session: config.buckets.auth
});


let Engine = require('./Engine/Engine.js');
let EventRegistry = require('./Engine/EventRegistry.js');
let event_list = require('./Engine/Model/Events/event-list.js');

EventRegistry.init(event_list);
Engine.config = {
	config_key: "iris://config#service_groups",
	bucket: config.buckets.main
};

Engine.launch();