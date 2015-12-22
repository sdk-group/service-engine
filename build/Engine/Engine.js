'use strict';

let _ = require('lodash');

let AbstractService = require('./BaseServices/Abstract');
let Servicify = require('./BaseServices/Servicify');

let discover = function (path_string) {
  return require(path_string);
};

class Engine {
  constructor() {
    throw new Error('singletone');
  }
  static set config(value) {
    this.service_params = _.pluck(value, 'params');
    this.services = _.map(value, item => this.createService(item.path));
  }
  static createService(path) {
    let ServiceModel = discover(path);
    return ServiceModel instanceof AbstractService ? new ServiceModel() : new Servicify(ServiceModel);
  }
  static launch() {
    let init = _.map(this.services, (service, index) => service.init(this.service_params[index]));

    return Promise.all(init).then(() => _.map(this.services, service => service.launch()));
  }
}

module.exports = Engine;