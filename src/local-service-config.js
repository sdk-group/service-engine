let config = {
  "main_group": {
    "auth": {
      "path": "Auth"
    },
    "doctor": {
      "path": "Physician",
      "params": {
        "desription": "temp config for network physician",
        "inspectors": [{
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
        }]
      }
    },
    "message-hub": {
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
    },
    "sample-service": {
      "path": "iris-service-sample",
      "params": {
        "param1": 1,
        "param2": 2
      }
    },
    "facehugger": {
      "path": "Facehugger",
      "params": {}
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

module.exports = config;