"use strict";

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
					"websocket": {
						"port": 3001
					},
					"http": {
						"port": 8081
					},
					"https": {
						"port": 443
					}
				},
				"connectors": {
					"websocket1": {
						"model": "websocket",
						"options": {
							"port": 3001
						}
					},
					"http1": {
						"model": "http",
						"options": {
							"port": 8081,
							"routes": {
								"post": {
									"/iris_mo/equeue_ui/xmlrpc.php": "./xmlrpcv1"
								}
							}
						}
					},
					"http2": {
						"model": "http",
						"options": {
							"port": 9090,
							"routes": {
								"post": {
									"/": "./xmlrpcv1"
								}
							}
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
		},
		"xmlrpc-v1": {
			"path": "iris-service-xmlrpc-v1",
			"params": {}
		}
	},
	"spawn_limit": 10
};

module.exports = config;