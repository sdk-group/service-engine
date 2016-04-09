'use strict'
let Abstract = require('../Abstract/abstract.js');

let path = require("path");

let RDFcb = require("cbird-rdf")
	.RD;
let db = new RDFcb();

class Facehugger extends Abstract {
	constructor() {
		super({
			event_group: 'facehugger'
		});
	}

	init(params) {
		super.init(params);

		this._db = db;
		this.emitter.listenTask(this.event_names.request, (data) => this.handleRequest(data));
		this.emitter.listenTask(this.event_names.bucket, (data) => this.bucket(data));

		return Promise.resolve(true);
	}

	start() {
		super.start();
		console.log("Facehugger: started");
		return this;
	}

	pause() {
		super.pause();
		console.log("Facehugger: paused");

		return this;
	}

	resume() {
		super.resume();
		console.log("Facehugger: resumed");

		return this;
	}

	/**
	 * own API
	 */

	handleRequest({
		bucket_name,
		action,
		params
	}) {
		//        console.log("HANDLING REQUEST");
		let bucket = this._db.bucket(bucket_name);
		let exposed_api = _.chain(bucket)
			.functions()
			.filter((name) => !_.startsWith(name, "_"))
			.value();

		return new Promise((resolve, reject) => {
			if (!action || !~_.indexOf(exposed_api, action))
				return reject(new Error("MISSING_METHOD"));
			return resolve(bucket[actname].apply(bucket, params));
		});
	}
}

module.exports = Facehugger;
