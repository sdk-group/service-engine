'use strict'

require('./boot.js');
require("./hosts.js");

let config = require('./config/db_config.json');
let Auth = require('./Auth');
let Couchbird = require('Couchbird')(config.couchbird); //singletone inits here
let EventRegistry = require('./Engine/EventRegistry.js');

let event_list = require('./Engine/Model/Events/event-list.js');

let loader = require(_base + '/build/config/loader')(config.buckets.main);

EventRegistry.init(event_list);
Auth.configure({
  data: config.buckets.main,
  session: config.buckets.auth
});

let config = require('./local-service-config.js');

let Engine = require('./Engine/Engine.js');
Engine.config = config;
Engine.launch();