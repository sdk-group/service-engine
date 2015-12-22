'use strict';
let Promise = require('bluebird');
let _ = require("lodash");
let qs = require("querystring");
let request = Promise.promisify(require("request"));

let Abstract = require('../Abstract/abstract.js');
let Error = require(_base + "/Engine/Model/Error/Lapsus")("ReplicatorError");
let constellation = require(_base + '/config/Constellation');

//UTILITY

let createReplication = function (ip, sb, dhost, db, usr, pwd) {
	let postData = qs.stringify({
		fromBucket: sb,
		toCluster: dhost,
		toBucket: db,
		replicationType: "continuous"
	});
	let options = {
		uri: '/controller/createReplication',
		baseUrl: "http://" + [ip, 8091].join(":"),
		method: 'POST',
		auth: {
			user: usr,
			pass: pwd
		},
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length
		},
		body: postData
	};

	return request(options);
};

let setSettings = function (ip, usr, pwd, ref, settings) {
	if (ref === undefined) ref = false;

	let postData = qs.stringify(settings);
	let uri = ref ? '/settings/replications/' + encodeURIComponent(ref) : '/settings/replications';
	let options = {
		uri: uri,
		baseUrl: "http://" + [ip, 8091].join(":"),
		method: 'POST',
		auth: {
			user: usr,
			pass: pwd
		},
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length
		},
		body: postData
	};

	return request(options);
};

let getSettings = function (ip, usr, pwd) {
	let ref = arguments.length <= 3 || arguments[3] === undefined ? false : arguments[3];

	let uri = ref ? '/settings/replications/' + encodeURIComponent(ref) : '/settings/replications';
	let options = {
		uri: uri,
		baseUrl: "http://" + [ip, 8091].join(":"),
		method: 'GET',
		auth: {
			user: usr,
			pass: pwd
		}
	};
	return request(options);
};

let removeReplication = function (ip, ref, usr, pwd) {
	let options = {
		uri: '/controller/cancelXDCR/' + encodeURIComponent(ref),
		baseUrl: "http://" + [ip, 8091].join(":"),
		method: 'DELETE',
		auth: {
			user: usr,
			pass: pwd
		}
	};

	return request(options);
};

let getReferences = function (ip, usr, pwd) {
	let options = {
		uri: '/pools/default/remoteClusters',
		baseUrl: "http://" + [ip, 8091].join(":"),
		method: 'GET',
		auth: {
			user: usr,
			pass: pwd
		}
	};

	return request(options).then(res => {
		let response = JSON.parse(res[0].toJSON().body);
		//            console.log("CLUSTER RESPONDED", ip, _.filter(response, {
		//                deleted: false
		//            }));
		let cluster_ref = _.reduce(_.filter(response, {
			deleted: false
		}), (res, el) => {
			//                console.log("EL", el)
			let el_ip = el.hostname.split(":")[0];
			res[el_ip] = el.uuid;
			return res;
		}, {});
		//            console.log("CLUSTER REF", cluster_ref);
		return Promise.resolve(cluster_ref);
	});
};

let getStatistics = function (ip, sbucket, usr, pwd, ref) {
	let uri = '/pools/default/buckets/' + sbucket + '/stats/' + encodeURIComponent(ref);
	let options = {
		uri: uri,
		baseUrl: "http://" + [ip, 8091].join(":"),
		method: 'GET',
		auth: {
			user: usr,
			pass: pwd
		}
	};
	return request(options);
};

let mutualMethod = function (method, _ref) {
	let shost = _ref.src_host;
	let sb = _ref.src_bucket;
	let dhost = _ref.dst_host;
	let db = _ref.dst_bucket;

	let bound = _.bind(method, this);
	let there = bound({
		src_host: shost,
		src_bucket: sb,
		dst_host: dhost,
		dst_bucket: db
	});
	let back = bound({
		src_host: dhost,
		src_bucket: db,
		dst_host: shost,
		dst_bucket: sb
	});
	return Promise.props({
		shost: there,
		dhost: back
	});
};

//REPLICATOR

class Replicator extends Abstract {
	constructor() {
		super({
			event_group: 'replication'
		});

		this.rids = {};
		this.refs = {};
		this.errname = Error.name;
	}

	init(config) {
		super.init(config);

		let events = this.event_names;
		let ways = {
			one: 'direct',
			two: 'bidirect'
		};
		let tasks = [{
			name: events.create(ways.one),
			handler: this.createOnewayReplication
		}, {
			name: events.create(ways.two),
			handler: this.createTwowayReplication
		}, {
			name: events.remove(ways.one),
			handler: this.removeOnewayReplication
		}, {
			name: events.remove(ways.two),
			handler: this.removeTwowayReplication
		}, {
			name: events.pause(ways.one),
			handler: this.pauseOnewayReplication
		}, {
			name: events.pause(ways.two),
			handler: this.pauseTwowayReplication
		}, {
			name: events.resume(ways.one),
			handler: this.resumeOnewayReplication
		}, {
			name: events.resume(ways.two),
			handler: this.resumeTwowayReplication
		}, {
			name: events.settings,
			handler: this.settings
		}, {
			name: events.stats,
			handler: this.getReplicationState
		}];
		_.forEach(tasks, task => {
			this.emitter.listenTask(task.name, data => _.bind(task.handler, this)(data));
		});
		this.hosts = constellation;
		let promises = [];
		this.hosts.forEach((val, key) => {
			let ip = val.ip;
			let usr = val.usr;
			let pwd = val.pwd;
			//TODO: onDrop, onRestore
			let drop = this.getEvents("permission").dropped("ip", ip);
			let rest = this.getEvents("permission").restored("ip", ip);
			console.log("Replicator: Now watching host ", ip);
			this.emitter.on(drop, _.bind(this.inactive, this));
			this.emitter.on(rest, _.bind(this.active, this));
			promises.push(getReferences(ip, usr, pwd).then(res => {
				this.refs[ip] = res;
				return Promise.resolve(true);
			}).catch(err => {
				return Promise.resolve(false);
			}));
		});

		return Promise.all(promises).then(res => {
			console.log("RES INIT", res);
			return Promise.resolve(true);
		});
	}

	start() {
		super.start();
		console.log("Replicator: started");

		return this;
	}

	pause() {
		super.pause();
		console.log("Replicator: paused");

		return this;
	}

	resume() {
		super.resume();
		console.log("Replicator: resumed");

		return this;
	}

	//API

	inactive(data) {
		this.hosts.lapse(data.permission.key);
	}

	active(data) {
		let host = this.hosts.show(data.permission.key);
		this.hosts.lapse(host.ip, true);
		//        console.log("HOST ACTIVE", host);
		//        if (!this.refs[host.ip]) {
		getReferences(host.ip, host.usr, host.pwd).then(res => {
			this.refs[host.ip] = res;
			//                console.log("HOST", host, this.refs);
			return Promise.resolve(true);
		}).catch(err => {
			return Promise.resolve(false);
		});
		//        }
	}

	getReference(ip, dip, sb, db) {
		//        console.log("GET REFERENCE ", ip, dip, sb, db, this.refs);
		let ref = _.get(this.refs, [ip, dip]);
		let rid = ref ? [ref, sb, db].join("/") : false;
		//        if (!rid) {
		//            return Promise.reject(new Error("MISCONFIGURATION", "Unable to get reference for host " + dip + " from host " + ip));
		//        }
		if (rid) this.rids[[ip, sb, dip, db].join(":")] = rid;
		//        console.log("GETREF", ref, rid);
		return rid;
	}

	getReplicationState(_ref2) {
		let shost = _ref2.src_host;
		let sb = _ref2.src_bucket;
		let dhost = _ref2.dst_host;
		let db = _ref2.dst_bucket;
		let stat = _ref2.stat_name;

		let src = this.hosts.show(shost);
		let dst = this.hosts.show(dhost);
		if (!src) {
			return Promise.reject(new Error("MISCONFIGURATION", "Configure source host before you ask it for anything, dammit."));
		}
		//        if (!src.active || !dst.active) {
		//            return Promise.reject(new Error("SERVICE_ERROR", "At least one of provided hosts is unreachable."));
		//        }
		let key = [src.ip, sb, dst.ip, db].join(":");
		return new Promise((resolve, reject) => {
			return resolve(this.rids[key] || this.getReference(src.ip, dst.ip, sb, db));
		}).then(ref => {
			let refstat = [ref, stat].join("/");
			return getStatistics(src.ip, sb, src.usr, src.pwd, refstat).then(res => {
				let response = JSON.parse(res[0].toJSON().body);
				return Promise.resolve(response);
			});
		}).catch(err => {
			return Promise.reject(new Error("SERVICE_ERROR", "Request failed."));
		});
	}

	settings(_ref3) {
		let shost = _ref3.src_host;
		let sb = _ref3.src_bucket;
		let dhost = _ref3.dst_host;
		let db = _ref3.dst_bucket;
		let settings = _ref3.settings;

		let src = this.hosts.show(shost);
		let dst = this.hosts.show(dhost);
		if (!src) {
			return Promise.reject(new Error("MISCONFIGURATION", "Configure source host before you ask it for anything, dammit."));
		}
		//        if (!src.active || !dst.active) {
		//            return Promise.reject(new Error("SERVICE_ERROR", "At least one of provided hosts is unreachable."));
		//        }

		let key = [src.ip, sb, dst.ip, db].join(":");
		return new Promise((resolve, reject) => {
			return resolve(this.rids[key] || this.getReference(src.ip, dst.ip, sb, db));
		}).then(ref => {
			let promise = _.isObject(settings) ? setSettings(src.ip, src.usr, src.pwd, ref, settings) : getSettings(src.ip, src.usr, src.pwd, ref);

			return promise.then(res => {
				let response = JSON.parse(res[0].toJSON().body);
				//                        console.log("PARSING", response);
				return Promise.resolve(response);
			});
		}).catch(err => {
			return Promise.reject(new Error("SERVICE_ERROR", "Request failed."));
		});
	}

	createOnewayReplication(_ref4) {
		let shost = _ref4.src_host;
		let sb = _ref4.src_bucket;
		let dhost = _ref4.dst_host;
		let db = _ref4.dst_bucket;

		let src = this.hosts.show(shost);
		let dst = this.hosts.show(dhost);
		if (!src) {
			return Promise.reject(new Error("MISCONFIGURATION", "Configure source host before you ask it for anything, dammit."));
		}
		if (!src.active || !dst.active) {
			return Promise.reject(new Error("SERVICE_ERROR", "At least one of provided hosts is unreachable."));
		}

		return createReplication(src.ip, sb, dhost, db, src.usr, src.pwd).then(res => {
			let response = JSON.parse(res[0].toJSON().body);
			if (!response.errors) this.rids[[src.ip, sb, dst.ip, db].join(":")] = response.id;
			return Promise.resolve(response);
		}).catch(err => {
			return Promise.reject(new Error("SERVICE_ERROR", "Request failed."));
		});
	}

	removeOnewayReplication(_ref5) {
		let shost = _ref5.src_host;
		let sb = _ref5.src_bucket;
		let dhost = _ref5.dst_host;
		let db = _ref5.dst_bucket;

		let src = this.hosts.show(shost);
		let dst = this.hosts.show(dhost);
		if (!src) {
			return Promise.reject(new Error("MISCONFIGURATION", "Configure source host before you ask it for anything, dammit."));
		}
		if (!src.active || !dst.active) {
			return Promise.reject(new Error("SERVICE_ERROR", "At least one of provided hosts is unreachable."));
		}

		let key = [src.ip, sb, dst.ip, db].join(":");
		return new Promise((resolve, reject) => {
			return resolve(this.rids[key] || this.getReference(src.ip, dst.ip, sb, db));
		}).then(ref => {
			return removeReplication(src.ip, ref, src.usr, src.pwd).then(res => {
				let response = JSON.parse(res[0].toJSON().body);
				delete this.rids[key];
				return Promise.resolve(response);
			}).catch(err => {
				return Promise.reject(new Error("SERVICE_ERROR", "Request failed."));
			});
		});
	}

	pauseOnewayReplication(_ref6) {
		let shost = _ref6.src_host;
		let sb = _ref6.src_bucket;
		let dhost = _ref6.dst_host;
		let db = _ref6.dst_bucket;

		return this.settings({
			src_host: shost,
			src_bucket: sb,
			dst_host: dhost,
			dst_bucket: db,
			settings: {
				pauseRequested: true
			}
		});
	}

	resumeOnewayReplication(_ref7) {
		let shost = _ref7.src_host;
		let sb = _ref7.src_bucket;
		let dhost = _ref7.dst_host;
		let db = _ref7.dst_bucket;

		return this.settings({
			src_host: shost,
			src_bucket: sb,
			dst_host: dhost,
			dst_bucket: db,
			settings: {
				pauseRequested: false
			}
		});
	}

	createTwowayReplication(_ref8) {
		let shost = _ref8.src_host;
		let sb = _ref8.src_bucket;
		let dhost = _ref8.dst_host;
		let db = _ref8.dst_bucket;

		return _.bind(mutualMethod, this)(this.createOnewayReplication, {
			src_host: dhost,
			src_bucket: db,
			dst_host: shost,
			dst_bucket: sb
		});
	}

	removeTwowayReplication(_ref9) {
		let shost = _ref9.src_host;
		let sb = _ref9.src_bucket;
		let dhost = _ref9.dst_host;
		let db = _ref9.dst_bucket;

		return _.bind(mutualMethod, this)(this.removeOnewayReplication, {
			src_host: dhost,
			src_bucket: db,
			dst_host: shost,
			dst_bucket: sb
		});
	}

	pauseTwowayReplication(_ref10) {
		let shost = _ref10.src_host;
		let sb = _ref10.src_bucket;
		let dhost = _ref10.dst_host;
		let db = _ref10.dst_bucket;

		return _.bind(mutualMethod, this)(this.pauseOnewayReplication, {
			src_host: dhost,
			src_bucket: db,
			dst_host: shost,
			dst_bucket: sb
		});
	}
	resumeTwowayReplication(_ref11) {
		let shost = _ref11.src_host;
		let sb = _ref11.src_bucket;
		let dhost = _ref11.dst_host;
		let db = _ref11.dst_bucket;

		return _.bind(mutualMethod, this)(this.resumeOnewayReplication, {
			src_host: dhost,
			src_bucket: db,
			dst_host: shost,
			dst_bucket: sb
		});
	}
}

module.exports = Replicator;