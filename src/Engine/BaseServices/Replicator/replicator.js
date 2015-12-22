'use strict'
let Promise = require('bluebird');
let _ = require("lodash");
let qs = require("querystring");
let request = Promise.promisify(require("request"));

let Abstract = require('../Abstract/abstract.js');
let Error = require(_base + "/Engine/Model/Error/Lapsus")("ReplicatorError");
let constellation = require(_base + '/config/Constellation');

//UTILITY

let createReplication = function(ip, sb, dhost, db, usr, pwd) {
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
}

let setSettings = function(ip, usr, pwd, ref = false, settings) {
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
}

let getSettings = function(ip, usr, pwd, ref = false) {
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

let removeReplication = function(ip, ref, usr, pwd) {
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
}

let getReferences = function(ip, usr, pwd) {
  let options = {
    uri: '/pools/default/remoteClusters',
    baseUrl: "http://" + [ip, 8091].join(":"),
    method: 'GET',
    auth: {
      user: usr,
      pass: pwd
    }
  };

  return request(options)
    .then((res) => {
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
}

let getStatistics = function(ip, sbucket, usr, pwd, ref) {
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

let mutualMethod = function(method, {
  src_host: shost,
  src_bucket: sb,
  dst_host: dhost,
  dst_bucket: db
}) {
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
}

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
    _.forEach(tasks, (task) => {
      this.emitter.listenTask(task.name, (data) => _.bind(task.handler, this)(data));
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
      promises.push(getReferences(ip, usr, pwd)
        .then((res) => {
          //                    console.log("RES INIT", res);
          this.refs[ip] = res;
          return Promise.resolve(true);
        })
        .catch((err) => {
          return Promise.resolve(false);
        })
      );
    });

    return Promise.all(promises).then((res) => {
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
    getReferences(host.ip, host.usr, host.pwd)
      .then((res) => {
        this.refs[host.ip] = res;
        //                console.log("HOST", host, this.refs);
        return Promise.resolve(true);
      })
      .catch((err) => {
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
    if (rid)
      this.rids[[ip, sb, dip, db].join(":")] = rid;
    //        console.log("GETREF", ref, rid);
    return rid;
  }

  getReplicationState({
    src_host: shost,
    src_bucket: sb,
    dst_host: dhost,
    dst_bucket: db,
    stat_name: stat
  }) {
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
      })
      .then((ref) => {
        let refstat = [ref, stat].join("/");
        return getStatistics(src.ip, sb, src.usr, src.pwd, refstat)
          .then((res) => {
            let response = JSON.parse(res[0].toJSON().body);
            return Promise.resolve(response);
          });
      })
      .catch((err) => {
        return Promise.reject(new Error("SERVICE_ERROR", "Request failed."));
      });
  }

  settings({
    src_host: shost,
    src_bucket: sb,
    dst_host: dhost,
    dst_bucket: db,
    settings: settings
  }) {
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
      })
      .then((ref) => {
        let promise = (_.isObject(settings)) ?
          setSettings(src.ip, src.usr, src.pwd, ref, settings) :
          getSettings(src.ip, src.usr, src.pwd, ref);

        return promise
          .then((res) => {
            let response = JSON.parse(res[0].toJSON().body);
            //                        console.log("PARSING", response);
            return Promise.resolve(response);
          });
      })
      .catch((err) => {
        return Promise.reject(new Error("SERVICE_ERROR", "Request failed."));
      });

  }

  createOnewayReplication({
    src_host: shost,
    src_bucket: sb,
    dst_host: dhost,
    dst_bucket: db
  }) {
    let src = this.hosts.show(shost);
    let dst = this.hosts.show(dhost);
    if (!src) {
      return Promise.reject(new Error("MISCONFIGURATION", "Configure source host before you ask it for anything, dammit."));
    }
    if (!src.active || !dst.active) {
      return Promise.reject(new Error("SERVICE_ERROR", "At least one of provided hosts is unreachable."));
    }

    return createReplication(src.ip, sb, dhost, db, src.usr, src.pwd)
      .then((res) => {
        let response = JSON.parse(res[0].toJSON().body);
        if (!response.errors)
          this.rids[[src.ip, sb, dst.ip, db].join(":")] = response.id;
        return Promise.resolve(response);
      })
      .catch((err) => {
        return Promise.reject(new Error("SERVICE_ERROR", "Request failed."));
      });
  }

  removeOnewayReplication({
    src_host: shost,
    src_bucket: sb,
    dst_host: dhost,
    dst_bucket: db
  }) {
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
      })
      .then((ref) => {
        return removeReplication(src.ip, ref, src.usr, src.pwd)
          .then((res) => {
            let response = JSON.parse(res[0].toJSON().body);
            delete this.rids[key];
            return Promise.resolve(response);
          })
          .catch((err) => {
            return Promise.reject(new Error("SERVICE_ERROR", "Request failed."));
          });
      });
  }

  pauseOnewayReplication({
    src_host: shost,
    src_bucket: sb,
    dst_host: dhost,
    dst_bucket: db
  }) {
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

  resumeOnewayReplication({
    src_host: shost,
    src_bucket: sb,
    dst_host: dhost,
    dst_bucket: db
  }) {
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

  createTwowayReplication({
    src_host: shost,
    src_bucket: sb,
    dst_host: dhost,
    dst_bucket: db
  }) {
    return _.bind(mutualMethod, this)(this.createOnewayReplication, {
      src_host: dhost,
      src_bucket: db,
      dst_host: shost,
      dst_bucket: sb
    });
  }

  removeTwowayReplication({
    src_host: shost,
    src_bucket: sb,
    dst_host: dhost,
    dst_bucket: db
  }) {
    return _.bind(mutualMethod, this)(this.removeOnewayReplication, {
      src_host: dhost,
      src_bucket: db,
      dst_host: shost,
      dst_bucket: sb
    });
  }

  pauseTwowayReplication({
    src_host: shost,
    src_bucket: sb,
    dst_host: dhost,
    dst_bucket: db
  }) {
    return _.bind(mutualMethod, this)(this.pauseOnewayReplication, {
      src_host: dhost,
      src_bucket: db,
      dst_host: shost,
      dst_bucket: sb
    });
  }
  resumeTwowayReplication({
    src_host: shost,
    src_bucket: sb,
    dst_host: dhost,
    dst_bucket: db
  }) {
    return _.bind(mutualMethod, this)(this.resumeOnewayReplication, {
      src_host: dhost,
      src_bucket: db,
      dst_host: shost,
      dst_bucket: sb
    });
  }
}

module.exports = Replicator;