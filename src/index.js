'use strict'

require('./boot.js');
require("./hosts.js");

let config = require('./config/db_config.json');
let Auth = require('./Auth');
let Couchbird = require('Couchbird')(config.couchbird); //singletone inits here
let loader = require(_base + '/build/config/loader')(config.buckets.main);
Auth.configure({
  data: config.buckets.main,
  session: config.buckets.auth
});

let config = require('./local-service-config.js');

let Engine = require('./Engine.js');
Engine.config = config;
Engine.launch();