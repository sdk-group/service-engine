'use strict'

let Servicify = require('./BaseServices/Servicify');

let discover = function (path_string) {
	return require(path_string);
};

class Engine {
	constructor() {
		throw new Error('singletone');
	}
	static set broker(value) {
		this._broker = value;
	}
	static get broker() {
		return this._broker;
	}
	static set config(manifest) {
		this.services = _.map(manifest, this.createService.bind(this));
	}
	static createService(manifest) {
		//@TODO: chek if exists in "discover"
		let ServiceModel = discover(manifest.path);

		return new Servicify(ServiceModel, this._broker, manifest)
	}
	static launch() {
		return this.cfg_ready
			.then((res) => {
				let init = _.fromPairs(_.map(this.services, (service, index) => [service.getName(), service.init(this.service_params[index], this.cfg)]));
				return Promise.props(init);
			})
			.then(() => Promise.mapSeries(this.services, (service) => service.launch()))
			.then((res) => _.reduce(this.services, (acc, srv, index) => {
				acc[srv.getName()] = res[index];
				return acc;
			}))
			.then((r) => {
				message_bus.emit('engine.ready', {
					status: r
				});
				return r;
			});
	}
}

module.exports = Engine;
