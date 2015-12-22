'use strict';

let Promise = require('bluebird');
let _ = require("lodash");
let qs = require("querystring");
let request = Promise.promisify(require("request"));

let Abstract = require('../Abstract/abstract.js');
let Error = require(_base + "/Engine/Model/Error/Lapsus")("ArbiterError");
let constellation = require(_base + '/config/Constellation');

//UTILITY

let get_history = function (ip, sb, since) {
  let uri = sb + '/_design/history_ts/_view/history_ts?stale=false&startkey=' + Math.floor(since);
  let options = {
    uri: uri,
    baseUrl: "http://" + [ip, 8092].join(":"),
    method: 'GET'
  };

  return request(options).then(res => {
    let response = JSON.parse(res[0].toJSON().body);
    console.log("GOT HISTORY: ", response);
    return Promise.resolve(response);
  }).catch(err => {
    console.log("Arbiter: history request error");
    return Promise.resolve(false);
  });
};

let compare = function (hst_m, hst_s) {
  let conflict = {};
  let index_m = _.indexBy(hst_m, "id");
  let ids_m = _.keys(index_m, "id");
  let index_s = _.indexBy(hst_s, "id");
  let ids_s = _.keys(index_s, "id");
  let diff_m = _.difference(ids_m, ids_s); //ids that are present only on master
  let diff_s = _.difference(ids_s, ids_m); //ids that are present only on slave

  let rec_m = _.chain(index_m).pick(diff_m).values().value();

  let rec_s = _.chain(index_s).pick(diff_s).values().value();
  //    console.log("HISTORY: ", rec_m, rec_s);

  //if master did something, do nothing
  if (diff_m.length > 0) {
    console.log("HISTORY: master did something:", rec_m);
  }
  //if slave did something, panic
  if (diff_s.length > 0) {
    let byres_m = _.groupBy(rec_m, "value.resource");
    let byres_s = _.groupBy(rec_s, "value.resource");
    _.forEach(byres_s, (el, res_id) => {
      let related = byres_m[res_id];
      if (related) {
        let patch = _.chain(related).sortBy("key").reduce((acc, thg) => {
          return _.assign(acc, thg.value.changes);
        }, {}).value();
        //                patch.owner = "replica";
        conflict[res_id] = {
          records: el,
          patch: patch
        };
      }
    });
    console.log("HISTORY: slave did something:", rec_s);
  }
  console.log("CONFLICT : ", conflict);
  return conflict;
};

class Arbiter extends Abstract {
  constructor() {
    super({
      event_group: 'arbiter'
    });
  }

  init(config) {
    super.init(config);

    this.hosts = constellation;
    this.timeout = config.timeout || 500;
    let tasks = [{
      name: this.event_names.getup,
      handler: this.getup
    }];
    _.forEach(tasks, task => {
      this.emitter.listenTask(task.name, data => _.bind(task.handler, this)(data));
    });
    return Promise.resolve(true);
  }

  start() {
    super.start();
    this.paused = false;
    console.log('Arbiter : starting...');

    return this;
  }

  pause() {
    //@TODO: Dunno what should they do when paused or resumed
    super.pause();
    this.paused = true;

    return this;
  }

  resume() {
    //@TODO: Dunno what should they do when paused or resumed
    super.resume();
    this.paused = false;

    return this;
  }

  //API

  getup(_ref) {
    let mhost = _ref.master;
    let mb = _ref.master_bucket;
    let shost = _ref.slave;
    let sb = _ref.slave_bucket;
    let ts = _ref.ts;

    let mst = this.hosts.show(mhost);
    let slv = this.hosts.show(shost);
    if (!slv || !mst) {
      return Promise.reject(new Error("MISCONFIGURATION", "Configure source and destination hosts before you ask it for anything, dammit."));
    }
    if (!mst.active || !slv.active) {
      return Promise.reject(new Error("SERVICE_ERROR", "At least one of provided hosts is unreachable."));
    }

    console.log("ARBITER: pausing replication");
    return this.emitter.addTask(this.getEvents('replication').pause('bidirect'), {
      src_host: shost,
      src_bucket: sb,
      dst_host: mhost,
      dst_bucket: mb
    })
    //            .delay(this.timeout)
    .then(() => {
      return Promise.props({
        slv: get_history(slv.ip, sb, ts),
        mst: get_history(mst.ip, mb, ts)
      });
    }).then(res => {
      //                 console.log("HISTORY", res);
      let promises = [];
      let conflict = compare(res.mst.rows, res.slv.rows);
      _.forEach(conflict, (el, key) => {
        let patch = this.emitter.addTask(this.getEvents('booker').patch, {
          resource: key,
          patch: el.patch
        });
        promises.push(patch);
        _.forEach(el.records, record => {
          let new_rec = record.value;
          new_rec.invalid = true;
          let promise = this.emitter.addTask(this.getEvents('dbface').request, {
            action: 'upsert',
            params: [record.id, new_rec],
            id: false
          });
          promises.push(promise);
        });
      });
      return Promise.all(promises);
    }).then(res => {
      console.log("ARBITER: resuming replication", res);
      return this.emitter.addTask(this.getEvents('replication').resume('direct'), {
        src_host: mhost,
        src_bucket: mb,
        dst_host: shost,
        dst_bucket: sb
      });
    }).delay(this.timeout).then(res => {
      return this.emitter.addTask(this.getEvents('replication').resume('direct'), {
        src_host: shost,
        src_bucket: sb,
        dst_host: mhost,
        dst_bucket: mb
      });
    }).catch(err => {
      console.log("ARBITER ERROR", err.stack);
      return Promise.resolve(false);
    });;
  }
}

module.exports = Arbiter;