'use strict';

let Abstract = require('../Abstract/abstract.js');
let _ = require("lodash");
let sound_util = require("sound-conjunct");

class Sound extends Abstract {
  constructor() {
    super({
      event_group: 'sound'
    });

    this.errname = Error.name;
  }

  init(config) {
    super.init(config);

    let tasks = [{
      name: this.event_names.concat,
      handler: this.concat
    }, {
      name: this.event_names.transcode,
      handler: this.transcode
    }, {
      name: this.event_names.avtranscode,
      handler: this.avtranscode
    }];
    _.forEach(tasks, task => {
      this.emitter.listenTask(task.name, data => _.bind(task.handler, this)(data));
    });
    return Promise.resolve(true);
  }

  //API

  concat(_ref) {
    let files = _ref.files;
    let out = _ref.outname;
    let opts = _ref.options;

    if (this.paused) return Promise.reject(new Error("Service is paused"));
    return sound_util.concatenate(files, out, opts);
  }

  transcode(_ref2) {
    let files = _ref2.files;
    let out = _ref2.outname;
    let exts = _ref2.formats;
    let opts = _ref2.options;

    if (this.paused) return Promise.reject(new Error("Service is paused"));
    return sound_util.ffmpeg_transcode(files, out, exts, opts);
  }

  avtranscode(_ref3) {
    let files = _ref3.files;
    let out = _ref3.outname;
    let exts = _ref3.formats;
    let opts = _ref3.options;

    if (this.paused) return Promise.reject(new Error("Service is paused"));
    return sound_util.libav_transcode(files, out, exts, opts);
  }
}

module.exports = Sound;