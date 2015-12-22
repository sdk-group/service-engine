'use strict';

let Promise = require('bluebird');
let _ = require('lodash');

let EventRegistry = require(_base + '/Engine/EventRegistry.js');

let PermissionLogic = require('./permission-logic.js');
let queue = require('global-queue');

/**
 * Abstract service
 */

class AbstractService {
  constructor(_ref) {
    var _ref$event_group = _ref.event_group;
    let event_group = _ref$event_group === undefined ? '' : _ref$event_group;

    this.event_names = event_group ? this.getEvents(event_group) : {};

    this.setChannels(queue).state('created');

    this.required_permissions = new PermissionLogic();
  }
  state(name) {
    if (!name) return this.state_id;

    this.state_id = name.toLowerCase();

    switch (this.state_id) {
      case 'created':
        break;
      case 'init':
        break;
      case 'waiting':
        break;
      case 'working':
        break;
      case 'paused':
        break;
      default:
        throw new Error('unknown state');
        break;
    }

    return this;
  }

  getEvents(event_group) {
    return EventRegistry.getEvents(event_group);
  }
  addPermission(name, params) {
    this.required_permissions.add(name, params);
    return this;
  }
  launch() {
    return this.required_permissions.request().then(result => {
      this.state('waiting');

      if (result === true) {
        console.log('Abstract: can start now');
        this.start();
      } else {
        console.log('Abstract: some permissions dropped, start is delayed');
      }
    }).catch(() => {
      console.log('Could not get permissions for service,everything is really bad');
    });
  }

  setChannels(queue) {
    this.required_permissions.setChannels(queue);
    this.emitter = queue;
    return this;
  }

  init(config) {
    this.config = config || {};

    if (!this.emitter) return Promise.reject('U should set channels before');

    this.required_permissions.dropped(() => {
      if (this.state() === 'working') {
        console.log('Abstract : oh no, so bad');
        this.pause();
        this.state('waiting');
      }
    });

    this.required_permissions.restored(() => {
      if (this.state() === 'waiting') {
        this.start();
        console.log('Abstract : excellent...');
      }
    });

    this.state('init');

    return Promise.resolve(true);
  }

  start() {
    //@TODO: What should it do in current context?
    //@TODO: requestPermissions() here
    if (this.state() === 'working') throw new Error('Running already!');

    this.state('working');

    return this;
  }

  pause() {
    //@TODO: What should it do in current context?
    this.state('paused');

    return this;
  }

  resume() {
    //@TODO: What should it do in current context?
    //this.state('waiting');
    //set waiting, call permissions, get

    return this;
  }
  get paused() {
    return !this.isWorking();
  }
  isWorking() {
    return this.state === 'working';
  }
}

module.exports = AbstractService;