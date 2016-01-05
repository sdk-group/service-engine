'use strict'

require('./boot.js');
require("./hosts.js");

let config = require('./config/db_config.json');
let Auth = require('iris-auth-util');
let Couchbird = require('Couchbird')(config.couchbird); //singletone inits here

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
Engine.launch()
	.then((res) => {
		console.log('All groups started!', res);
		var gulp = require("gulp");
		var mocha = require('gulp-mocha');

		gulp.src('build/**/*.test.js', {
				read: false
			})
			.pipe(mocha());
	});