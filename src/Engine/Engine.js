'use strict'

let AbstractService = require('./BaseServices/Abstract');
let Servicify = require('./BaseServices/Servicify');
let queue = require("global-queue");
let Loader = require('../config/loader');

let discover = function (path_string) {
	return require(path_string);
};

class Engine {
	constructor() {
		throw new Error('singletone');
	}
	static set config(value) {
		let cfg_ready = false;
		if (value.config_key && value.buckets.config) {
			let loader = Loader(value.buckets.config);
			cfg_ready = loader.load({
					services: value.config_key
				})
				.then(() => {
					return loader.services;
				});
		} else {
			cfg_ready = Promise.resolve(value);
		}
		this.cfg_ready = cfg_ready
			.then((config) => {
				let main_group = config.main_group;

				this.service_params = _.map(main_group, 'params');
				this.services = _.map(main_group, (item) => this.createService(item.path));
				_.map(this.services, (item) => {
					if (_.isFunction(item.initCouchbird))
						item.initCouchbird(value.buckets);
				})
				return true;
			})
			.catch((err) => {
				console.error(err.stack);
				return false;
			});
	}
	static createService(path) {
		let ServiceModel = discover(path);
		return (ServiceModel.constructor.name != "Object") ? new ServiceModel() : new Servicify(ServiceModel)
	}
	static launch() {
		return this.cfg_ready
			.then((res) => {
				let init = _.map(this.services, (service, index) => service.init(this.service_params[index]));
				return Promise.all(init);
			})
			.then(() => Promise.all(_.map(this.services, (service) => service.launch())))
			.then((r) => {
				queue.emit('engine.ready', {
					status: r
				});
				return r;
			});
	}
}

module.exports = Engine;
