'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

let Abstract = require('../Abstract/abstract.js');
let _ = require("lodash");
let Promise = require("bluebird");
let constellation = require(_base + '/config/Constellation');

class Booker extends Abstract {
  constructor() {
    super({
      event_group: 'booker'
    });

    this.queues_required = {
      "event-queue": false,
      "task-queue": true
    };

    this.errname = Error.name;
    this.paused_ts = 0;
  }

  setChannels(options) {
    super.setChannels(options);

    return this;
  }

  init(config) {
    this.config = config || {};
    if (!this.emitter && (this.queues_required['event-queue'] || this.queues_required['task-queue'])) {
      return Promise.reject(new Error('U should set channels before'));
    }

    this.hosts = constellation;
    this.paused_ts = _.now() / 1000;

    this.master = config.master || false;
    let mip = "";

    if (this.master) {
      this.master_bucket = config.master_bucket;
      this.slave = config.slave;
      this.slave_bucket = config.slave_bucket;
      if (!this.slave || !this.slave_bucket || !this.master_bucket) return Promise.reject(new Error('Specify all master-slave relations'));
      this.master_stella = mip = this.hosts.show(this.master);
      if (!mip) return Promise.reject(new Error('Configure master constellation in hosts'));
      this.addPermission("ip", mip.ip);
    }

    this.required_permissions.dropped(() => {
      if (this.state() === 'working') {
        this.pause();
        this.state('waiting');
      }
    });

    this.required_permissions.restored(() => {
      if (this.state() === 'init') {
        this.start();
      }
      if (this.state() === 'waiting') {
        this.hosts.lapse(mip.ip, true);
        //                this.resume();
        console.log("CALLING ARBITER with ts", this.paused_ts, ", now", _.now() / 1000);
        this.emitter.addTask(this.getEvents('arbiter').getup, {
          master: this.master,
          master_bucket: this.master_bucket,
          slave: this.slave,
          slave_bucket: this.slave_bucket,
          ts: this.paused_ts
        }).then(res => {
          this.start();
          this.state('working');
        });
      }
    });

    let tasks = [{
      name: this.event_names.request,
      handler: this.request_resource
    }, {
      name: this.event_names.pause,
      handler: this.pause
    }, {
      name: this.event_names.resume,
      handler: this.resume
    }, {
      name: this.event_names.patch,
      handler: this.patch
    }];
    _.forEach(tasks, task => {
      this.emitter.listenTask(task.name, data => _.bind(task.handler, this)(data));
    });
    this.state('init');

    return Promise.resolve(true);
  }

  start() {
    console.log('Booker : starting...');

    super.start();
    this.paused = false;
    this.paused_ts = 0;
    return this;
  }

  pause() {
    //@TODO: Dunno what should they do when paused or resumed
    console.log('Booker : pausing...');

    super.pause();
    this.paused = true;
    this.paused_ts = _.now() / 1000;

    return this;
  }

  resume() {
    //@TODO: Dunno what should they do when paused or resumed
    console.log('Booker : resume...');

    super.resume();
    this.paused = false;
    this.paused_ts = 0;

    return this;
  }

  //API

  patch(_ref) {
    let id = _ref.resource;
    let patch = _ref.patch;

    console.log("CALLING", id, patch);
    if (this.paused || this.master_stella && !this.master_stella.active) return Promise.reject(new Error("Service is paused"));

    var _id$split = id.split("/");

    var _id$split2 = _slicedToArray(_id$split, 2);

    let type = _id$split2[0];
    let num_id = _id$split2[1];

    let mo_name = _.capitalize(type);
    let mo = this.meta_tree[mo_name];
    if (!mo) return Promise.reject(new Error("No such class in MetaTree"));
    let res = this.meta_tree.create(mo, {
      db_id: num_id
    });

    return res.retrieve().then(() => {
      return res.update(patch);
    });
  }

  request_resource(_ref2) {
    let id = _ref2.db_id;
    let data = _ref2.data;
    let actname = _ref2.action;

    if (this.paused || this.master_stella && !this.master_stella.active) return Promise.reject(new Error("Service is paused"));

    var _id$split3 = id.split("/");

    var _id$split32 = _slicedToArray(_id$split3, 2);

    let type = _id$split32[0];
    let num_id = _id$split32[1];

    let mo_name = _.capitalize(type);
    let mo = this.meta_tree[mo_name];
    if (!mo) return Promise.reject(new Error("No such class in MetaTree"));
    let res = this.meta_tree.create(mo, {
      db_id: num_id
    });

    if (!actname || ! ~_.indexOf(res.exposed_api, actname)) return Promise.reject(new Error("MISSING_METHOD"));

    return res.retrieve().then(() => {
      return res[actname](data);
    }).then(success => {
      data.cas = success.cas;
      return Promise.resolve({
        db_id: id,
        data: data,
        action: actname,
        success: true
      });
    }).catch(error => {
      return Promise.resolve({
        db_id: id,
        data: data,
        action: actname,
        success: false,
        error: error
      });
    });
  }
}

module.exports = Booker;