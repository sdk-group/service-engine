'use strict'
let Abstract = require('../Abstract/abstract.js');

let path = require("path");

let Couchbird = require("Couchbird");
let Error = require(_base + "/build/Model/Error/Lapsus")("FacehuggerError");

let db_config = require(_base + "/build/config/db_config");
let DB_Face = null;

class Facehugger extends Abstract {
  constructor() {
    super({
      event_group: 'dbface'
    });


    this.errname = Error.name;
  }

  init(params) {
    super.init(params);

    let opts = {
      server_ip: db_config.couchbird.server_ip || "127.0.0.1",
      n1ql: db_config.couchbird.n1ql || "127.0.0.1:8093",
      bucket_name: db_config.buckets.main || "default",
      role: db_config.name || "anonymous"
    };

    DB_Face = Couchbird({
      server_ip: opts.server_ip,
      n1ql: opts.n1ql
    });

    this._db = DB_Face.bucket(opts.bucket_name);
    this.exposed_api = _.chain(this._db)
      .functions()
      .filter((name) => {
        return !_.startsWith(name, "_");
      })
      .value();

    this.emitter.listenTask(this.event_names.request, (data) => this.handleRequest(data));

    return Promise.resolve(true);
  }

  start() {
    super.start();
    console.log("Facehugger: started");
    return this;
  }

  pause() {
    super.pause();
    console.log("Facehugger: paused");

    return this;
  }

  resume() {
    super.resume();
    console.log("Facehugger: resumed");

    return this;
  }

  /**
   * own API
   */

  handleRequest({
    action: actname,
    params: args,
    id: mid
  }) {
    //        console.log("HANDLING REQUEST");
    return new Promise((resolve, reject) => {
      if (!actname || !~_.indexOf(this.exposed_api, actname))
        return reject(new Error("MISSING_METHOD"));
      //Still doesn't feel secure enough
      return resolve(this._db[actname].apply(this._db, args));
    });
  }
}

module.exports = Facehugger;