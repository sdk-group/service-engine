'use strict'

let Promise = require('bluebird');
let _ = require('lodash');
let path = require('path');

let discover = function(path_string) {
  if (path_string.slice(-2) !== './') {
    return require(path.resolve(_base, 'ServiceGroup', 'Service', path_string, 'index.js'));
  }
};

class MainServiceGroup {
  constructor(config) {
    this.config = config;
    this.service_profiles = [];
    this.service_names = [];
    _.forEach(config, (item, key) => {

      this.service_names.push(key);
      this.service_profiles.push(item);
    });

    this.createServices();
  }
  createServices() {
    this.services = [];

    _(this.service_profiles).forEach((profile) => {
      let Service_Model = discover(profile.path);
      this.services.push(new Service_Model());
    }).value();
  }
  setChannels(queue) {
    this.queue = queue;

    _(this.services).forEach((service) => {
      service.setChannels({
        queue: queue
      });
    }).value();
  }
  launch() {
    let init = [];

    _.forEach(this.services, (service, index) => {
      let params = this.service_profiles[index].params || {};
      init.push(service.init(params));
    });

    let done = Promise
      .all(init)
      .then(() => {
        _(this.services).forEach(function(service) {
          service.launch();
        }).value();
      });

    return done;
  }
};

module.exports = MainServiceGroup;