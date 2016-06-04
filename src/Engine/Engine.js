'use strict'

let AbstractService = require('./BaseServices/Abstract');
let Servicify = require('./BaseServices/Servicify');
let Loader = require('../config/loader');

let discover = function(path_string) {
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
        return true;
      })
      .catch((err) => {
        console.error(err.stack);
        return false;
      });
    this.cfg = value;
  }
  static createService(path) {
    let ServiceModel = discover(path);
    return (ServiceModel.constructor.name != "Object") ? new ServiceModel() : new Servicify(ServiceModel)
  }
  static launch() {
    return this.cfg_ready
      .then((res) => {
        let init = _.fromPairs(_.map(this.services, (service, index) => [service.getName(), service.init(this.service_params[index], this.cfg)]));
        return Promise.props(init);
      })
      .then(() => Promise.all(_.map(this.services, (service) => service.launch())))
      .then((r) => {
        message_bus.emit('engine.ready', {
          status: r
        });
        return r;
      });
  }
}

module.exports = Engine;