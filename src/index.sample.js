'use strict'

require('./boot.js');
require("./hosts.js");

let config = require('./config/db_config.json');
let Auth = require('./Auth');
let Couchbird = require('Couchbird')(config.couchbird); //singletone inits here
let EventRegistry = require('./Engine//EventRegistry.js');

let event_list = require('./Engine/Model/Events/event-list.js');
let service_config = require('./local-service-config.js');

let loader = require(_base + '/config/loader')(config.buckets.main);

EventRegistry.init(event_list);
Auth.configure({
	data: config.buckets.main,
	session: config.buckets.auth
});

console.log("INDEX SC", service_config);

let Engine = require('./Engine/Engine.js');
Engine.config = service_config;
Engine.launch();