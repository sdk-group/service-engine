'use strict';

module.exports = {
  doctor: {
    healthy: 'now.healthy',
    unhealthy: 'now.unhealthy',
    register: 'inspector.register'
  },
  dbface: {
    request: 'dbface.request'
  },
  booker: {
    request: "booker.request",
    pause: "booker.pause",
    resume: "booker.resume"
  },
  broker: {
    resources: "broker.list.resources"
  },
  arbiter: {
    getup: "arbiter.wake"
  },
  replication: {
    create: function (way) {
      return 'replication.create.' + way;
    },
    remove: function (way) {
      return 'replication.remove.' + way;
    },
    pause: function (way) {
      return 'replication.pause.' + way;
    },
    resume: function (way) {
      return 'replication.resume.' + way;
    },
    settings: "replication.settings",
    stats: "replication.statistics"
  },
  sound: {
    concat: 'sound.concat',
    transcode: 'sound.transcode.ffmpeg',
    avtranscode: 'sound.transcode.libav'
  },
  permission: {
    dropped: function (name, key) {
      return 'permission.dropped.' + name + '.' + key;
    },
    restored: function (name, key) {
      return 'permission.restored.' + name + '.' + key;
    },
    request: 'permission.request'
  },
  child_process: {
    init: function (pid) {
      return 'child_process.' + pid + '.init';
    },
    system: function (pid) {
      return 'system.child_process.' + pid;
    },
    launch: function (pid) {
      return 'system.child_process.' + pid + '.launch';
    }
  }
};