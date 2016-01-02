'use strict';

let Abstract = require('../Abstract/abstract.js');
let ConnectorHolder = require("./connector/holder");

class MessageHub extends Abstract {
	constructor() {
		super({});
	}
	init(options) {
		super.init(options);
		this.connectors = new ConnectorHolder(options.default_options);
		this.connectors.addMulti(options.connectors);
		this.connectors.listen();
		this.connectors.on_message(data => {
			console.log("DATA", data);
			//check auth here: data.token
			//then route
			return this.emitter.addTask(data.destination, data.data);
		});
	}
	start() {
		console.log("MessageHub: started");
		super.start();
	}
	pause() {
		console.log("MessageHub: paused");
		super.pause();
	}
	resume() {
		console.log("MessageHub: resume");
		super.pause();
	}
}

module.exports = MessageHub;