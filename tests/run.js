'use strict'

require('./boot.js');
require("./hosts.js");

let config = require('./config/db_config.json');
let Auth = require('./Auth');
let Couchbird = require('Couchbird')(config.couchbird); //singletone inits here

let Queue = require('global-queue');

let loader = require(_base + '/config/loader')(config.buckets.main);

Auth.configure({
	data: config.buckets.main,
	session: config.buckets.auth
});

/*
	let config = {
  "main_group": {
    "auth": {
      "path": "Auth"
    },
    "doctor": {
      "path": "Physician",
      "params": {
        "desription": "temp config for network physician",
        "inspectors": [
          {
            "name": "ping",
            "params": {
              "ip": [
                "192.168.43.74",
                "ya.kz",
                "192.168.42.74"
              ],
              "less_then": 1000,
              "interval": 3000
            }
          }
        ]
      }
    },
    "message-hub": {
      "path": "MessageHub",
      "params": {
        "port": 3000
      }
    },
    "sample-service": {
      "path": "SampleService",
      "params": {
        "param1": 1,
        "param2": 2
      }
    },
    "child-spawner": {
      "path": "ChildSpawner",
      "params": {
        "group_name1": {
          "sample-service": {
            "path": "SampleService",
            "params": {
              "String1": "Sample Service of first ChSG"
            }
          }
        },
        "group_name2": {
          "sample-service": {
            "path": "SampleService",
            "params": {
              "String1": "Sample Service of second ChSG"
            }
          }
        }
      }
    },
    "facehugger": {
      "path": "Facehugger",
      "params": {
        "mt_models": [
          "/Engine/Model/MetaTree"
        ]
      }
    },
    "replicator": {
      "path": "Replicator",
      "params": {}
    },
    "broker": {
      "path": "Broker",
      "params": {}
    },
    "booker": {
      "path": "Booker",
      "params": {}
    },
    "arbiter": {
      "path": "Arbiter",
      "params": {}
    }
  },
  "spawn_limit": 10
};
	*/


loader.load({
		SG: "iris://config#service_groups"
	})
	.then(() => {
		let Engine = require('./Engine/Engine.js');
		Engine.config = loader.SG;
		Engine.launch().then(() => {
			console.log('All groups started!');

			var gulp = require("gulp");
			var mocha = require('gulp-mocha');

			gulp.src('build/**/*.test.js', {
					read: false
				})
				.pipe(mocha());
		});
	});