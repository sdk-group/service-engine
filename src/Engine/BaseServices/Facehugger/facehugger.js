'use strict'
let Abstract = require('../Abstract/abstract.js');

let path = require("path");

let Couchbird = require("Couchbird");

let DB_Face = Couchbird();

class Facehugger extends Abstract {
	constructor() {
		super({
			event_group: 'dbface'
		});


		this.errname = Error.name;
	}

	init(params) {
		super.init(params);

		this._db = DB_Face.bucket(params.bucket_name);
		this.exposed_api = _.chain(this._db)
			.functions()
			.filter((name) => {
				return !_.startsWith(name, "_");
			})
			.value();

		this.emitter.listenTask(this.event_names.request, (data) => this.handleRequest(data));

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
		action: actname,
		params: args,
		id: mid
	}) {
		//        console.log("HANDLING REQUEST");
		return new Promise((resolve, reject) => {
			if(!actname || !~_.indexOf(this.exposed_api, actname))
				return reject(new Error("MISSING_METHOD"));
			//Still doesn't feel secure enough
			return resolve(this._db[actname].apply(this._db, args));
		});
	}
}

module.exports = Facehugger;