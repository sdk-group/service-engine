let config = {
	"main_group": {
		"auth": {
			"path": "./BaseServices/Auth"
		},
		"doctor": {
			"path": "./BaseServices/Physician",
			"params": {
				"desription": "temp config for network physician",
				"inspectors": []
			}
		},
		"message-hub": {
			path: "./BaseServices/MessageHub",
			params: {
				"default_options": {
					"hell": "bell",
					"websocket": {
						"port": 3001
					}
				},
				"connectors": {
					"websocket1": {
						"model": "websocket",
						"options": {
							"port": 3000
						}
					}
				}
			}
		},
		"sample-service": {
			"path": "./BaseServices/SampleService",
			"params": {
				"param1": 1,
				"param2": 2
			}
		},
		"facehugger": {
			"path": "./BaseServices/Facehugger",
			"params": {}
		},
		"replicator": {
			"path": "iris-service-replicator",
			"params": {}
		}
	},
	"spawn_limit": 10
};

module.exports = config;